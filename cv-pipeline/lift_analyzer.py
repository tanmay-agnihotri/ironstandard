"""
lift_analyzer.py — real computer-vision analysis of a powerlifting rep video.

Uses YOLOv8-Pose (Ultralytics, open-source, Apache/AGPL) to track body
keypoints per frame, then applies powerlifting-specific geometry to compute:
  - depth (squat: hip crease vs top of knee)
  - lockout (knee/hip/elbow angle depending on lift)
  - a single "video start to bar release" timing metric
  - lift-type auto-detection from setup posture, with a wrong-section check
  - a transparent 0-10 rule-compliance score

Runs entirely locally. No video is uploaded anywhere, no API calls, no cost
after the one-time ~6MB model download (from GitHub releases, cached after
first run).

Why YOLOv8-Pose instead of MediaPipe (which the first version of this script
used): MediaPipe's Pose is SINGLE-person only. Tested against a real bench
press video with a spotter standing over the lifter, it locked onto the
spotter's standing posture instead of the lifter's — a training-breaking
bug, not a cosmetic one. YOLOv8-Pose detects every person in frame; this
script then picks the one with the LARGEST bounding box as the lifter, which
tested correctly on real footage (the lifter's box was consistently larger
than a spotter's, even measured only in feet/legs).

Usage:
    python3 lift_analyzer.py path/to/video.mp4 --lift squat
    python3 lift_analyzer.py path/to/video.mp4 --lift bench --annotate out.mp4

Requires: pip install ultralytics opencv-python-headless
"""

import argparse
import json
import math
import sys

import cv2
from ultralytics import YOLO

_model = None
def get_model():
    global _model
    if _model is None:
        _model = YOLO("yolov8n-pose.pt")
    return _model

# COCO keypoint indices (YOLOv8-Pose uses the standard 17-point COCO layout)
KP_RIGHT = {"shoulder": 6, "elbow": 8, "wrist": 10, "hip": 12, "knee": 14, "ankle": 16}
KP_LEFT = {"shoulder": 5, "elbow": 7, "wrist": 9, "hip": 11, "knee": 13, "ankle": 15}


def angle_at(a, b, c):
    """Angle at point b, formed by rays b->a and b->c, in degrees.
    a, b, c are (x, y) tuples in normalized image coordinates."""
    ax, ay = a[0] - b[0], a[1] - b[1]
    cx, cy = c[0] - b[0], c[1] - b[1]
    dot = ax * cx + ay * cy
    mag_a = math.hypot(ax, ay)
    mag_c = math.hypot(cx, cy)
    if mag_a == 0 or mag_c == 0:
        return None
    cos_angle = max(-1.0, min(1.0, dot / (mag_a * mag_c)))
    return math.degrees(math.acos(cos_angle))


def extract_side(result, idx, side_map):
    """Pulls one side's (left or right) landmark dict + its average keypoint
    confidence for one detected person in one frame."""
    kps = result.keypoints.xy[idx]
    kconf = result.keypoints.conf[idx] if result.keypoints.conf is not None else None
    img_h, img_w = result.orig_shape

    def pt(name):
        k = side_map[name]
        x, y = kps[k].tolist()
        v = kconf[k].item() if kconf is not None else 1.0
        return (x / img_w, y / img_h, v)

    landmarks = {name: pt(name) for name in side_map}
    avg_conf = sum(v[2] for v in landmarks.values()) / len(landmarks)
    return landmarks, avg_conf


def select_lifter(result, conf_threshold=0.25):
    """From one frame's YOLO pose result, picks the primary lifter: the
    largest bounding box among confident detections. Returns BOTH the left
    and right side landmark sets (each {shoulder, elbow, wrist, hip, knee,
    ankle} of (x, y, confidence) tuples), plus which side had higher average
    keypoint confidence in this frame — or None if nobody confident was
    detected. Camera setups vary in which side of the lifter faces the
    camera; hardcoding one side was a real accuracy problem (the analyzer
    would silently use noisy, partially-occluded keypoints on videos shot
    from the "wrong" side), so both are tracked and the better one wins."""
    if result.boxes is None or len(result.boxes) == 0:
        return None
    candidates = []
    for i, box in enumerate(result.boxes):
        conf = box.conf.item()
        if conf < conf_threshold:
            continue
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        area = (x2 - x1) * (y2 - y1)
        candidates.append((area, i))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    idx = candidates[0][1]

    right, right_conf = extract_side(result, idx, KP_RIGHT)
    left, left_conf = extract_side(result, idx, KP_LEFT)
    return {"right": right, "left": left, "right_conf": right_conf, "left_conf": left_conf}


def extract_landmarks(video_path):
    """Runs pose detection on every frame, then picks whichever side (left
    or right) had higher average confidence ACROSS THE WHOLE VIDEO, and
    returns per-frame landmark dicts using that one side consistently
    (None where no confident person was found) plus fps. Deciding per-video
    rather than per-frame avoids jumping between sides on individual noisy
    frames, which would corrupt angle/position tracking worse than just
    picking one side and sticking with it."""
    model = get_model()
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    raw_frames = []

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        results = model(frame, verbose=False)
        raw_frames.append(select_lifter(results[0]))

    cap.release()

    valid = [f for f in raw_frames if f is not None]
    if not valid:
        return [None] * len(raw_frames), fps

    avg_right = sum(f["right_conf"] for f in valid) / len(valid)
    avg_left = sum(f["left_conf"] for f in valid) / len(valid)
    side = "right" if avg_right >= avg_left else "left"

    frames = [f[side] if f is not None else None for f in raw_frames]
    return frames, fps


def detect_scene_cut(frames):
    """Real edited lifting footage often has a promo/outro card spliced onto
    the end (or cuts between angles) — the pose model can hallucinate a false
    'person' on those frames. A genuine scene cut shows up as a sudden,
    implausible jump in hip position between consecutive frames. Truncating
    at the first such jump avoids treating that false detection as real data."""
    hip_y = [f["hip"][1] if f else None for f in frames]
    JUMP_THRESHOLD = 0.06  # normalized-coordinate jump unlikely within 1/30-1/60s of real movement
    last_valid = None
    for i, y in enumerate(hip_y):
        if y is None:
            continue
        if last_valid is not None and abs(y - hip_y[last_valid]) > JUMP_THRESHOLD:
            return i  # cut off here — everything from this frame on is suspect
        last_valid = i
    return len(frames)  # no cut detected


def find_rep_phases_squat(frames, fps, end_frame):
    """Squat shape: baseline (standing) -> hip_y rises to a peak (bottom) -> returns near baseline (lockout)."""
    hip_y = [f["hip"][1] if f and i < end_frame else None for i, f in enumerate(frames)]
    valid_idx = [i for i, y in enumerate(hip_y) if y is not None]
    if len(valid_idx) < 5:
        return None

    baseline = sum(hip_y[i] for i in valid_idx[:5]) / 5
    peak_idx = max(valid_idx, key=lambda i: hip_y[i])
    rng = hip_y[peak_idx] - baseline
    if rng < 0.015:
        return None  # too little vertical movement detected to call this a rep

    threshold = baseline + rng * 0.2  # adaptive: 20% of the way into the observed range counts as "movement started"
    start_idx = next((i for i in valid_idx if hip_y[i] >= threshold), None)
    if start_idx is None:
        return None

    lockout_idx = next((i for i in valid_idx if i > peak_idx and hip_y[i] <= threshold), valid_idx[-1])
    return {"start": start_idx, "bottom": peak_idx, "lockout": lockout_idx}


def find_rep_phases_deadlift(frames, fps, end_frame):
    """Deadlift shape: baseline (bent over at the bar) -> hip rises as the
    lifter stands -> lockout is the first SUSTAINED plateau of a near-straight
    knee angle after real upward movement has happened. A single-frame knee-
    angle spike isn't enough evidence (noise); a later, deeper hip position
    during post-lift celebration/walking isn't lockout either (knee angle
    there is inconsistent, not held straight) — sustaining the plateau over
    several consecutive frames is what tells the two apart."""
    hip_y = [f["hip"][1] if f and i < end_frame else None for i, f in enumerate(frames)]
    knee_ang = [angle_at(f["hip"][:2], f["knee"][:2], f["ankle"][:2]) if f and i < end_frame else None for i, f in enumerate(frames)]
    valid_idx = [i for i, y in enumerate(hip_y) if y is not None]
    if len(valid_idx) < 5:
        return None

    baseline = sum(hip_y[i] for i in valid_idx[:5]) / 5
    rough_start = next((i for i in valid_idx if hip_y[i] <= baseline - 0.015), None)
    if rough_start is None:
        return None

    HOLD_FRAMES = max(3, int(fps * 0.12))  # ~120ms sustained, not just one noisy frame
    KNEE_LOCK_DEG = 160
    RISE_NEEDED = 0.03  # must have actually risen a meaningful amount from baseline to count

    lockout_idx = None
    for i in valid_idx:
        if i <= rough_start or hip_y[i] > baseline - RISE_NEEDED:
            continue
        window = [j for j in valid_idx if i <= j < i + HOLD_FRAMES]
        if len(window) < HOLD_FRAMES:
            continue
        if all(knee_ang[j] is not None and knee_ang[j] >= KNEE_LOCK_DEG for j in window):
            lockout_idx = i
            break
    if lockout_idx is None:
        return None

    start_idx = 0
    for i in valid_idx:
        if i >= lockout_idx:
            break
        if hip_y[i] >= baseline - 0.01:
            start_idx = i
    return {"start": start_idx, "bottom": None, "lockout": lockout_idx}


def mask_implausible_jumps(series, valid_idx, max_delta=0.03):
    """Bench footage with a spotter is prone to a specific artifact: their
    hand overlapping the lifter's during the unrack hand-off can make the
    tracked wrist point briefly snap toward the spotter's hand instead.
    This shows up as a physically implausible frame-to-frame jump — real
    barbell movement can't cover that much distance in 1/30th of a second.
    Unlike a scene cut (which is permanent), this is a temporary excursion:
    mask frames out until the signal returns near where it left off, then
    resume trusting it. Returns the set of indices still considered valid."""
    trusted = set(valid_idx)
    last_trusted_val = None
    suspect = False
    for i in valid_idx:
        if last_trusted_val is None:
            last_trusted_val = series[i]
            continue
        delta = abs(series[i] - last_trusted_val)
        if not suspect and delta > max_delta:
            suspect = True
        if suspect:
            trusted.discard(i)
            if delta <= max_delta:
                suspect = False
                last_trusted_val = series[i]
        else:
            last_trusted_val = series[i]
    return trusted


def find_rep_phases_bench(frames, fps, end_frame):
    """Bench shape: unrack (often noisy — spotter's hands near the bar) ->
    descent to chest (wrist_y rises) -> press to lockout (wrist_y falls).
    Same overall shape as squat's hip trajectory, but needs implausible-jump
    masking first because of the hand-off noise — smoothing alone isn't
    enough since that artifact is sustained for several frames, not just
    a single noisy one."""
    wrist_y_raw = [f["wrist"][1] if f and i < end_frame else None for i, f in enumerate(frames)]
    valid_idx = [i for i, y in enumerate(wrist_y_raw) if y is not None]
    if len(valid_idx) < 10:
        return None

    trusted = mask_implausible_jumps(wrist_y_raw, valid_idx, max_delta=0.03)
    wrist_y = {i: wrist_y_raw[i] for i in trusted}
    trusted_sorted = sorted(trusted)
    if len(trusted_sorted) < 10:
        return None

    baseline = sum(wrist_y[i] for i in trusted_sorted[:5]) / 5
    peak_idx = max(trusted_sorted, key=lambda i: wrist_y[i])
    rng = wrist_y[peak_idx] - baseline
    if rng < 0.05:
        return None  # too little vertical movement detected to call this a rep

    threshold = baseline + rng * 0.25
    start_idx = next((i for i in trusted_sorted if i < peak_idx and wrist_y[i] >= threshold), None)
    if start_idx is None:
        return None

    lockout_idx = next((i for i in trusted_sorted if i > peak_idx and wrist_y[i] <= threshold), trusted_sorted[-1])
    return {"start": start_idx, "bottom": peak_idx, "lockout": lockout_idx, "baseline": baseline, "wrist_y_at_lockout": wrist_y[lockout_idx]}


def detect_pause_variance(frames, fps, bottom_idx, end_frame, hold_s=0.25):
    """Checks for a genuine judged rule: a visible pause with the bar
    motionless on the chest before pressing. Returns the actual measured
    wrist-position variance over a window centered on the detected bottom
    frame (None if there isn't enough data), rather than a hard yes/no —
    the caller tiers this the same way joint angles are tiered, since a
    truly dead-stop pause and a slightly-shaky-but-real one shouldn't be
    scored identically to no pause at all."""
    wrist_y = [f["wrist"][1] if f and i < end_frame else None for i, f in enumerate(frames)]
    hold_frames = max(2, int(fps * hold_s))
    lo = max(0, bottom_idx - hold_frames)
    hi = min(len(frames), bottom_idx + hold_frames)
    window = [wrist_y[i] for i in range(lo, hi) if wrist_y[i] is not None]
    if len(window) < hold_frames:
        return None
    return max(window) - min(window)


def classify_posture(frames, sample=8):
    """Identifies which lift this looks like from the SETUP posture (the
    first few detected frames), before any rep-specific analysis runs:
      - Bench: torso is horizontal — shoulder and hip sit at nearly the same
        height. This is checked independent of leg position deliberately:
        a lifter's knees are often bent with feet on the floor even while
        their torso is flat on the bench, which corrupted an earlier version
        of this check that lumped shoulder/hip/knee together.
      - Deadlift: standing but bent over, hands down near the ankles/floor.
      - Squat: standing upright, hands near shoulder height (bar on the back).
    This is genuine geometry, not a trained classifier — it's a first pass,
    and 'unknown' is a legitimate honest answer when the setup doesn't
    clearly match one of the three."""
    valid = [f for f in frames if f][:sample]
    if len(valid) < 3:
        return "unknown"

    def avg(key):
        return sum(f[key][1] for f in valid) / len(valid)

    shoulder_y, hip_y, ankle_y, wrist_y = avg("shoulder"), avg("hip"), avg("ankle"), avg("wrist")
    torso_diff = abs(shoulder_y - hip_y)

    if torso_diff < 0.05:
        return "bench"
    if abs(wrist_y - ankle_y) < 0.15:
        return "deadlift"
    if abs(wrist_y - shoulder_y) < 0.15:
        return "squat"
    return "unknown"


def check_section(frames, expected_lift):
    """Returns None if the detected posture matches the section the person
    uploaded to, or an error dict telling them the right section if not.
    A genuinely unclear posture ('unknown') is let through rather than
    blocked — this check should catch clear mismatches, not add friction
    to borderline camera angles."""
    detected = classify_posture(frames)
    if detected != "unknown" and detected != expected_lift:
        return {
            "ok": False,
            "wrong_section": True,
            "detected_lift": detected,
            "expected_lift": expected_lift,
            "reason": f"This looks like a {detected.title()}, not a {expected_lift.title()} — please upload it in the {detected.title()} section instead.",
        }
    return None


def classify_tier(value, good_threshold, bad_threshold, higher_is_better=True):
    """Turns a raw measurement into 'locked' / 'borderline' / 'failed'
    instead of a single hard cutoff. This exists because a single threshold
    was tested against real footage and produced a false negative: a
    genuinely clean deadlift lockout measured 154.4 degrees of hip
    extension, one degree under a 155-degree cutoff, and got penalized for
    "hips not fully extended" despite being visibly locked out. 2D
    measurement from a single camera has real noise around any boundary —
    treating that boundary zone as 'borderline' (small deduction, explained)
    rather than 'failed' (full deduction) reflects that honestly instead of
    pretending the measurement is more precise than it is.

    higher_is_better=True (most joint angles): passes at/above
    good_threshold, fails at/below bad_threshold. higher_is_better=False
    (e.g. pause variance, where LOWER is better): passes at/below
    good_threshold, fails at/above bad_threshold."""
    if value is None:
        return "unknown"
    if higher_is_better:
        if value >= good_threshold:
            return "locked"
        if value <= bad_threshold:
            return "failed"
    else:
        if value <= good_threshold:
            return "locked"
        if value >= bad_threshold:
            return "failed"
    return "borderline"


def score_lift(lift, checks):
    """Turns the rule checks we can actually verify with geometry into a
    0-10 score. Full deduction for a clear fail, a smaller flagged deduction
    for a borderline reading (see classify_tier), nothing for a clean pass.
    This is deliberately transparent — a lifter can see exactly why the
    score is what it is — rather than a black-box number. Only checks we've
    implemented count; anything not yet automatable (knee cave, bar path,
    hitching, exact pause duration) is left out honestly rather than
    guessed at, and should stay part of human/self review."""
    score = 10.0
    notes = []

    def apply(tier, full_penalty, label):
        nonlocal score
        if tier == "failed":
            score -= full_penalty
            notes.append(f"-{full_penalty}: {label}")
        elif tier == "borderline":
            partial = round(full_penalty * 0.35, 1)
            score -= partial
            notes.append(f"-{partial}: {label} (borderline reading — near the measurement's noise margin, worth a second look rather than a clear fault)")

    if lift == "squat":
        apply(checks["depth_tier"], 4, "did not clearly reach depth (hip did not pass top of knee)")
        apply(checks["lockout_tier"], 3, "knees not clearly locked out at the top")
    elif lift == "deadlift":
        apply(checks["knee_tier"], 3, "knees not clearly locked out at the top")
        apply(checks["hip_tier"], 3, "hips not clearly extended at the top")
    elif lift == "bench":
        apply(checks["lockout_tier"], 3, "elbows not clearly locked out at the top")
        apply(checks["pause_tier"], 3, "no clear motionless pause on the chest detected")

    if not notes:
        notes.append("No automatically-checkable issues found")
    return max(0, round(score * 10) / 10), notes


def analyze_squat(frames, fps):
    end_frame = detect_scene_cut(frames)
    phases = find_rep_phases_squat(frames, fps, end_frame)
    if phases is None:
        return {"ok": False, "reason": "Could not reliably detect a squat movement — check the person is fully in frame, side-on, for the whole rep."}

    start, bottom, lockout = phases["start"], phases["bottom"], phases["lockout"]
    f_bottom = frames[bottom]
    f_lockout = frames[lockout]

    knee_angle_bottom = angle_at(f_bottom["hip"][:2], f_bottom["knee"][:2], f_bottom["ankle"][:2])
    knee_angle_lockout = angle_at(f_lockout["hip"][:2], f_lockout["knee"][:2], f_lockout["ankle"][:2])

    # Depth: positive diff means hip sits below knee (good). A small tolerance band
    # around zero accounts for landmark noise on a lift that's genuinely at/near parallel.
    depth_diff = f_bottom["hip"][1] - f_bottom["knee"][1]
    depth_tier = classify_tier(depth_diff, good_threshold=0.01, bad_threshold=-0.015)
    below_parallel = depth_tier != "failed"

    lockout_tier = classify_tier(knee_angle_lockout, good_threshold=163, bad_threshold=145)
    locked_out = lockout_tier != "failed"

    score, score_notes = score_lift("squat", {"depth_tier": depth_tier, "lockout_tier": lockout_tier})

    return {
        "ok": True,
        "lift": "squat",
        "score_out_of_10": score,
        "score_notes": score_notes,
        "depth": {
            "below_parallel": below_parallel,
            "tier": depth_tier,
            "knee_angle_at_bottom_deg": round(knee_angle_bottom, 1) if knee_angle_bottom else None,
        },
        "lockout": {
            "knee_angle_deg": round(knee_angle_lockout, 1) if knee_angle_lockout else None,
            "locked_out": locked_out,
            "tier": lockout_tier,
        },
        # Time from the actual start of the VIDEO FILE to the bar being released (lockout + brief hold) —
        # deliberately not counting anything after that, so celebration/reaction doesn't inflate the number.
        "time_to_release_s": round(lockout / fps, 2),
        "frames": {"start": start, "bottom": bottom, "release": lockout, "fps": round(fps, 1), "analyzed_through_frame": end_frame},
    }


def analyze_deadlift(frames, fps):
    end_frame = detect_scene_cut(frames)
    phases = find_rep_phases_deadlift(frames, fps, end_frame)
    if phases is None:
        return {"ok": False, "reason": "Could not reliably detect a deadlift pull — check the person is fully in frame, side-on, for the whole rep."}

    start, lockout = phases["start"], phases["lockout"]
    f_lockout = frames[lockout]

    knee_angle = angle_at(f_lockout["hip"][:2], f_lockout["knee"][:2], f_lockout["ankle"][:2])
    hip_ext_angle = angle_at(f_lockout["shoulder"][:2], f_lockout["hip"][:2], f_lockout["knee"][:2])
    knee_tier = classify_tier(knee_angle, good_threshold=163, bad_threshold=145)
    # good_threshold=150 deliberately: tested against a real, visually clean lockout that measured
    # 154.4 degrees here — the old 155-degree cutoff failed that genuine good lift.
    hip_tier = classify_tier(hip_ext_angle, good_threshold=150, bad_threshold=130)
    knees_locked = knee_tier != "failed"
    hips_extended = hip_tier != "failed"

    score, score_notes = score_lift("deadlift", {"knee_tier": knee_tier, "hip_tier": hip_tier})

    return {
        "ok": True,
        "lift": "deadlift",
        "score_out_of_10": score,
        "score_notes": score_notes,
        "lockout": {
            "knee_angle_deg": round(knee_angle, 1) if knee_angle else None,
            "hip_extension_angle_deg": round(hip_ext_angle, 1) if hip_ext_angle else None,
            "knees_locked": knees_locked,
            "hips_extended": hips_extended,
            "knee_tier": knee_tier,
            "hip_tier": hip_tier,
            # note: a 2D side-on angle underestimates true extension if the lifter leans back at the top,
            # which is common on a near-max pull — treat this as a flag-for-review signal, not a hard fail.
        },
        # Time from the actual start of the VIDEO FILE to the bar being released (lockout + brief hold) —
        # deliberately not counting anything after that, so celebration/reaction doesn't inflate the number.
        "time_to_release_s": round(lockout / fps, 2),
        "frames": {"start": start, "lockout": lockout, "release": lockout, "fps": round(fps, 1), "analyzed_through_frame": end_frame},
        "note": "Video content ran past frame {} but was excluded from analysis — a sudden position jump there suggests a scene cut (e.g. an outro card), not real movement.".format(end_frame) if end_frame < len(frames) else None,
    }


def analyze_bench(frames, fps):
    end_frame = detect_scene_cut(frames)
    phases = find_rep_phases_bench(frames, fps, end_frame)
    if phases is None:
        return {"ok": False, "reason": "Could not reliably detect a bench press rep — check the lifter is fully in frame for the whole rep, and that the camera is reasonably side-on (a head-on angle makes elbow lockout hard to read accurately)."}

    start, bottom, lockout = phases["start"], phases["bottom"], phases["lockout"]
    f_lockout = frames[lockout]

    elbow_angle = angle_at(f_lockout["shoulder"][:2], f_lockout["elbow"][:2], f_lockout["wrist"][:2])

    # PRIMARY lockout signal: did the bar return to (or above) its starting held height?
    # This is a position check, not an angle check, so it stays reliable even when the
    # camera is shot more head-on than side-on — where a 2D elbow angle collapses toward
    # the camera axis and reads as bent even at a genuine lockout (tested and confirmed
    # on real footage: elbow angle read 81 degrees on a frame that's visibly locked out).
    position_diff = phases["baseline"] - phases["wrist_y_at_lockout"]  # positive = rose at/above start height
    lockout_tier = classify_tier(position_diff, good_threshold=-0.01, bad_threshold=-0.045)
    locked_out = lockout_tier != "failed"
    # SECONDARY signal, only trusted when it roughly agrees with the position check —
    # otherwise the angle is flagged as unreliable rather than silently overriding position.
    angle_agrees = elbow_angle is not None and (elbow_angle > 160) == locked_out

    pause_variance = detect_pause_variance(frames, fps, bottom, end_frame)
    # clear_min/fail_max are variance, so LOWER is better — higher_is_better=False
    pause_tier = classify_tier(pause_variance, good_threshold=0.015, bad_threshold=0.035, higher_is_better=False)
    pause_detected = pause_tier != "failed"

    score, score_notes = score_lift("bench", {"lockout_tier": lockout_tier, "pause_tier": pause_tier})

    return {
        "ok": True,
        "lift": "bench",
        "score_out_of_10": score,
        "score_notes": score_notes,
        "lockout": {
            "locked_out": locked_out,
            "tier": lockout_tier,
            "method": "bar position returned to starting held height",
            "elbow_angle_deg": round(elbow_angle, 1) if elbow_angle else None,
            "elbow_angle_reliable": angle_agrees,
        },
        "pause": {"detected": pause_detected, "tier": pause_tier},
        "time_to_release_s": round(lockout / fps, 2),
        "frames": {"start": start, "bottom": bottom, "lockout": lockout, "release": lockout, "fps": round(fps, 1), "analyzed_through_frame": end_frame},
        "caveat": "Lockout is judged by bar position (returned to starting height), not elbow angle, because elbow angle measured in 2D is unreliable unless the camera is clearly side-on — a head-on angle makes a real lockout read as bent. elbow_angle_reliable tells you whether the angle reading actually agreed with the position-based call on this video.",
    }


def annotate_video(video_path, out_path, frames, end_frame=None, lift="squat"):
    """Writes a copy of the video with the tracked keypoints and a live
    angle readout drawn on every frame — this is what would stream to the
    judge dashboard as the visual behind the automated flags. Stops at
    end_frame if given, so a spliced-on outro card never gets annotated
    as if it were part of the lift. Draws only the points this script
    actually uses (shoulder/elbow/wrist/hip/knee/ankle) rather than a full
    body skeleton, since those are the only ones informing the score."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    bones = [("shoulder", "elbow"), ("elbow", "wrist"), ("shoulder", "hip"), ("hip", "knee"), ("knee", "ankle")]
    limit = end_frame if end_frame is not None else len(frames)

    idx = 0
    while idx < limit:
        ok, frame = cap.read()
        if not ok:
            break
        f = frames[idx] if idx < len(frames) else None
        if f:
            pts = {name: (int(f[name][0] * w), int(f[name][1] * h)) for name in f}
            for a, b in bones:
                cv2.line(frame, pts[a], pts[b], (46, 34, 224), 3)  # BGR: red
            for p in pts.values():
                cv2.circle(frame, p, 5, (240, 244, 245), -1)  # BGR: near-white

            if lift in ("squat", "deadlift"):
                angle = angle_at(f["hip"][:2], f["knee"][:2], f["ankle"][:2])
                label = f"knee: {angle:.0f} deg" if angle else ""
            else:
                angle = angle_at(f["shoulder"][:2], f["elbow"][:2], f["wrist"][:2])
                label = f"elbow: {angle:.0f} deg" if angle else ""
            if label:
                cv2.putText(frame, label, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (240, 244, 245), 2)
        writer.write(frame)
        idx += 1

    cap.release()
    writer.release()


def main():
    parser = argparse.ArgumentParser(description="Analyze a powerlifting rep video with real pose estimation.")
    parser.add_argument("video", help="Path to the video file")
    parser.add_argument("--lift", default="squat", choices=["squat", "deadlift", "bench"], help="Lift type (the section you're uploading to)")
    parser.add_argument("--annotate", help="Optional path to write an annotated video with skeleton overlay")
    args = parser.parse_args()

    print(f"Loading pose model and processing {args.video} ...", file=sys.stderr)
    frames, fps = extract_landmarks(args.video)
    detected = sum(1 for f in frames if f is not None)
    print(f"{len(frames)} frames read, {detected} had a detected person ({fps:.1f} fps)", file=sys.stderr)

    mismatch = check_section(frames, args.lift)
    if mismatch:
        print(json.dumps(mismatch, indent=2))
        return

    if args.lift == "squat":
        report = analyze_squat(frames, fps)
    elif args.lift == "deadlift":
        report = analyze_deadlift(frames, fps)
    elif args.lift == "bench":
        report = analyze_bench(frames, fps)
    else:
        report = {"ok": False, "reason": "unsupported lift type"}

    print(json.dumps(report, indent=2))

    if args.annotate and report.get("ok"):
        end_frame = report["frames"].get("analyzed_through_frame", len(frames))
        annotate_video(args.video, args.annotate, frames, end_frame=end_frame, lift=args.lift)
        print(f"Annotated video written to {args.annotate}", file=sys.stderr)


if __name__ == "__main__":
    main()
