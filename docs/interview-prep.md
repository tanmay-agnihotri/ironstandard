# Iron Standard — Deep Technical Understanding 

This document exists so you can talk about this project from real understanding,
not from memory of what was built. Every bug story in here is something that
actually happened during development — a wrong number, a wrong assumption, a
real video that broke the code — and got fixed by testing against real data,
not by guessing. That's your strongest material in an interview: you're not
describing a tutorial project, you're describing debugging.

---

## 1. The 30-Second Pitch

"Iron Standard is a self-coaching platform for raw powerlifting. The core
feature is real computer vision: you upload a video of a squat, bench, or
deadlift, and a pose-estimation pipeline I built analyzes it frame-by-frame —
checking depth, lockout, and tempo against actual competition rules — and
returns a transparent, rule-by-rule score out of 10. It's a full-stack app:
React frontend, FastAPI backend, YOLOv8-Pose for the vision pipeline. The
interesting engineering wasn't the happy path — it was the real-world failure
modes: a spotter's hand confusing the tracker, a promotional video clip
tricking the pose model into a false detection, camera angle breaking a joint
measurement. Each of those is a specific bug I found by testing against real
footage and fixed with a specific, explainable technique."

---

## 2. The Actual Problem

Powerlifting judging has three checkpoints per lift that decide "good lift" vs
"no lift" — e.g. for squat: hip crease below the top of the knee (depth), full
lockout at the top, control throughout. Lifters training alone have no way to
check this themselves except filming and eyeballing it. The product idea:
give them an automated first read, backed by real geometry, not a black box.

---

## 3. System Architecture

```
┌─────────────┐      HTTP POST /analyze       ┌──────────────────┐
│   React     │  (multipart video + lift type) │    FastAPI       │
│  Frontend   │ ──────────────────────────────▶│    Backend       │
│ (Vite, JS)  │ ◀────────────────────────────── │  (Python)        │
└─────────────┘      JSON score report          └────────┬─────────┘
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │  lift_analyzer.py │
                                                  │  YOLOv8-Pose CV   │
                                                  │  pipeline         │
                                                  └──────────────────┘
```

- **Frontend**: React (Vite), no global state library — each screen reads/writes
  directly to `localStorage`, keyed by feature (`iron_profile`, `iron_trainlogs`,
  etc). Simple on purpose: this is a single-user local tool, not a multi-client
  system, so Redux/Context-for-everything would be overhead with no payoff.
- **Backend**: FastAPI, one real endpoint (`/analyze`) that accepts a video
  upload + a lift-type string, runs the CV pipeline, returns JSON.
- **CV pipeline**: a standalone Python module (`lift_analyzer.py`) — callable
  from the API, but also runnable directly from the command line. That
  separation mattered: every fix in this project was tested via the CLI
  against real video *before* it ever touched the API or the frontend.

---

## 4. The CV Pipeline — Deep Dive

### 4.1 Why YOLOv8-Pose, not MediaPipe (the first real bug)

The pipeline originally used MediaPipe Pose — Google's pose model, easy to set
up, works well for a single person in frame. It broke on real bench-press
footage: **a spotter stands directly over the lifter during unrack.**
MediaPipe is single-person only — it picks *one* person per frame, and it
picked the standing spotter, not the lying-down lifter. The result: garbage
geometry, because the code was confidently measuring the wrong person's body.

**Fix**: switched to YOLOv8-Pose (Ultralytics), which detects *every* person
in frame, and added a selection rule: **pick whichever detected person has
the largest bounding-box area.** Tested against the real bench video — the
lifter's box was reliably larger than the spotter's, even though the spotter
appeared physically "bigger" in the standing pose, because the lifter's body
spans more of the frame when lying on a bench.

*Interview angle*: this is a great answer to "tell me about a bug you found
late that changed your approach" — it wasn't a typo, it was a wrong model
choice for the real-world input, only visible once you tested with a person
actually in the shot with someone else.

### 4.2 Left/right side selection

Early version hardcoded tracking the lifter's *right* side (COCO keypoints
for right shoulder/elbow/wrist/hip/knee/ankle). That's wrong whenever the
camera happens to see the *left* side more clearly, which depends entirely on
how the person set up their phone. Fix: track **both** sides for every frame,
then after processing the whole video, compute average keypoint confidence
for each side and use whichever side scored higher — decided once per video,
not per frame (switching sides frame-to-frame would corrupt angle continuity
worse than just picking the "wrong" side consistently).

### 4.3 Per-lift phase detection

Each lift has a different shape of movement, tracked via a different joint:

- **Squat**: tracks *hip y-position*. Standing baseline → hip rises (image
  y increases downward) to a peak at the bottom of the squat → returns to
  baseline at lockout. Depth = compare hip-y to knee-y at the bottom frame.
- **Deadlift**: tracks *hip y-position* too, but the shape is different — no
  "return to start," because standing at lockout is a *different*, higher
  position than the bent-over setup. Lockout is detected by requiring a
  **sustained plateau** (not just one frame crossing a threshold) of a
  near-straight knee angle, specifically because a single-frame check was
  originally fooled by a promotional card spliced onto the end of a real
  test video (see 4.4).
- **Bench**: tracks *wrist y-position*. Same general shape as squat (rises to
  chest, presses back to lockout), but the setup/unrack phase is much noisier
  because the spotter's hand is right next to the lifter's hand on the bar.

### 4.4 Scene-cut detection (the ad-card bug)

A real test video had a promotional outro card (merchandise photos) spliced
onto the end. The pose model **hallucinated a person** on those product
photos — a real failure mode of any pose model: it doesn't know "this isn't a
person," it just returns its best guess, confidently, even on a photo of
t-shirts.

**Fix**: `detect_scene_cut()` — a real, physically-grounded check. Real human
movement can't teleport: a hip position jumping more than ~0.06 (normalized
image coordinates) between consecutive frames is treated as a scene cut, and
everything from that frame onward is excluded from analysis. This is a
general, reusable technique — it would also catch a camera-angle cut mid-video,
not just an outro card.

### 4.5 The false-negative threshold bug (the headline story)

This is the single best bug to talk about, because it directly answers "how
do you handle a user telling you your model is wrong?"

A real deadlift video — visibly a clean, full lockout — scored **7/10**,
flagged for "hips not fully extended." The measured hip-extension angle was
**154.4°**, one degree under a **155° hard cutoff**. The lift was good; the
threshold was too rigid for real measurement noise.

**Fix**: replaced every hard cutoff with a **three-tier system**
(`classify_tier()`): `locked` (clean pass, no penalty), `borderline` (near
the noise margin — a small, *explained* deduction, not a full one), `failed`
(clearly wrong, full penalty). The specific thresholds were recalibrated
using that real 154.4° data point as ground truth — the new "clear pass"
threshold for hip extension is 150°, deliberately chosen so that exact
real-world good lift now scores correctly.

*Interview angle*: "I don't trust a single number when the input is noisy
real-world data — I design for the measurement to be honest about its own
uncertainty" is a strong, true thing to say here, and you have the receipts.

### 4.6 Bench-specific: 2D angle foreshortening

Elbow-lockout angle, measured as a 2D angle from one camera, is unreliable
unless the camera is close to side-on. Tested on real footage shot more
head-on: the elbow angle read **81°** on a frame that was *visibly* fully
locked out — because when an arm points toward/away from the camera, its 2D
projection compresses and the angle math can't tell the difference between
"bent" and "extended-but-foreshortened."

**Fix**: bench lockout is judged primarily by **bar position** (did the wrist
return to its starting held height?) rather than elbow angle. Position is
robust to this specific camera-angle problem; angle is kept as a secondary,
diagnostic-only signal, explicitly flagged `elbow_angle_reliable: false` when
it disagrees with the position-based call — so the system tells you when its
own secondary signal shouldn't be trusted, instead of silently using it.

### 4.7 Pause detection (bench)

A real judged rule: the bar must visibly pause, motionless, on the chest.
Detected via **variance** of wrist position over a ~0.25s window centered on
the bottom of the rep — low variance = a real dead-stop, high variance = bar
still moving. This is also tiered (not a hard yes/no) for the same
noise-tolerance reason as 4.5.

### 4.8 A bug I made *while fixing* another bug

Worth mentioning honestly: while converting bench scoring to the tiered
system, I updated the tier-calculation variables but forgot to update the
dictionary keys passed into the scoring function — it crashed with a
`KeyError` on the very next test run. Caught immediately because the fix was
tested the same way everything else was: run it against a real video, don't
assume it works. This is a good, honest answer to "tell me about a mistake
you made" — small, real, caught fast because of a testing habit, not luck.

---

## 5. Backend (FastAPI)

- Single `/analyze` endpoint: `UploadFile` for the video, form fields for
  `lift` (squat/bench/deadlift) and `annotate` (bool).
- Video is written to a temp file (OpenCV needs a file path, not an in-memory
  stream, to seek through frames) and deleted in a `finally` block regardless
  of success or failure — no leaked temp files on error.
- **Why FastAPI over Node**: the CV pipeline is Python (OpenCV, Ultralytics/
  YOLO) — keeping the API in the same language avoids a cross-language RPC
  layer just to call the model. This was a deliberate architecture call, not
  a default.
- CORS is locked to `localhost:5173` (Vite's dev port) — fine for local dev,
  flagged in the code as something to tighten before any real deployment.

---

## 6. Frontend (React)

- **No Redux/global store.** Each screen owns its state via `useState`,
  hydrated from `localStorage` on mount. Simpler to reason about for a
  single-user local tool; would need to change if this became multi-device
  or multi-user (see Section 10).
- **Toast/confirmation system**: a React Context (`ToastProvider`) wraps the
  whole app so *any* screen can fire a "saved" confirmation without prop-
  drilling a callback through every component — used by Workout Log, Check-in,
  Diet, Lift Check, and Plan.
- **Responsive layout**: a single CSS breakpoint (900px) swaps a bottom tab
  bar (mobile) for a persistent sidebar (desktop) — pure CSS, no JS media-query
  logic, so there's no layout flash on resize.
- **PDF export** (training plan, progress report): built client-side with
  `jsPDF` + `jspdf-autotable` — no server round-trip needed, and it supports
  the native mobile share sheet via `navigator.share()` with a fallback to a
  plain download where that API isn't available.

---

## 7. Key Engineering Decisions & Trade-offs

| Decision | Alternative considered | Why this one |
|---|---|---|
| YOLOv8-Pose (multi-person) | MediaPipe (single-person) | Real bench footage has a spotter in frame; single-person models pick the wrong body |
| Tiered scoring (locked/borderline/failed) | Hard threshold | Hard threshold produced a proven false negative on real footage (154.4° case) |
| Position-based bench lockout | Elbow-angle-based | Angle reads wrong (81° on a locked-out frame) unless camera is side-on; position isn't affected the same way |
| Side selected per-video, not per-frame | Per-frame best-confidence side | Per-frame switching would introduce discontinuities worse than picking one imperfect side consistently |
| `localStorage` per screen | Redux / global context | Single-user local tool — no cross-screen sync problem to solve yet |
| Python/FastAPI backend | Node.js backend | CV pipeline is Python-native (OpenCV/Ultralytics); avoids a cross-language call just to reach the model |

---

## 8. Known Limitations (be ready to discuss these, don't hide them)

- **Squat CV path is implemented but not validated** against a real squat
  video the way deadlift and bench were — say this plainly if asked, it's the
  honest state of things.
- **Single camera, 2D only.** Every angle measurement has an inherent blind
  spot for the axis pointing toward/away from the camera — bench's
  foreshortening problem could in principle affect squat/deadlift too on a
  bad enough camera angle, it just hasn't been caught on real footage yet.
- **No database — everything is `localStorage`.** Fine for one user, one
  browser. Doesn't survive clearing browser data, doesn't sync across devices.
- **No auth, no multi-user support.** The backend has no concept of "whose
  video is this."
- **Rule coverage is partial.** Bar-path drift, knee cave, hitching — real
  judged criteria — aren't automated yet; only depth, lockout, and (for
  bench) pause are. This is disclosed in the score output itself, not hidden.

---

## 9. How I'd Extend This (shows you can modify it, not just describe it)

- **Persist to a real database** (Postgres) instead of `localStorage`, to
  support multiple devices/users — outlined already in the architecture doc
  as the next real step, alongside a RAG layer over the actual competition
  rulebook so rule questions are grounded in real text, not guessed.
- **Multi-camera angle correction**: two synced camera angles would resolve
  the foreshortening problem structurally instead of falling back to
  position-based proxies.
- **Human-in-the-loop review queue**: the architecture doc sketches a design
  where borderline/failed automated calls get queued for a human judge —
  natural next step given the tiered scoring already produces a "borderline"
  bucket that's a perfect trigger for that queue.
- **Squat validation**: film and test real squat footage the same rigorous
  way deadlift and bench were tested, before claiming it's production-ready.

---

## 10. Likely Interview Questions + Model Answers

**"Walk me through the architecture."**
→ Use Section 3's diagram verbally: React frontend uploads a video via a
multipart POST to a FastAPI backend, which runs a Python CV pipeline
(YOLOv8-Pose) and returns a JSON score. Emphasize the pipeline is a
standalone, independently testable module — that's why bugs got caught early.

**"What was the hardest bug you fixed?"**
→ The 154.4° false negative (Section 4.5). Concrete number, concrete fix,
clear before/after, and it demonstrates a real engineering principle
(measurement uncertainty needs tiered handling), not just a typo fix.

**"How do you know your model is accurate?"**
→ Be honest: it's *validated on the specific videos tested* (deadlift, bench),
*not yet* on squat. Explain the testing method — CLI-first, against real
footage, checking specific frame numbers against what's visually true — rather
than claiming blanket accuracy.

**"What would you do differently if you started over?"**
→ Reasonable answer: start with multi-person detection from day one (Section
4.1) instead of discovering the single-person limitation midway — that one
assumption caused the most rework.

**"How would you scale this to many users?"**
→ Section 9's answer: real database, likely a job queue for video processing
(CV inference isn't instant), and probably moving inference off the request/
response cycle entirely (upload → queue → poll or webhook for the result).

**"Why FastAPI and not Node/Express, given your frontend is React?"**
→ Section 4/5's answer: the CV pipeline is Python, and keeping the API in the
same language avoids a cross-language call just to reach the model. Language
choice followed the hardest technical dependency, not the frontend's language.

**"What's a limitation you haven't solved?"**
→ Pick honestly from Section 8 — the 2D-camera blind spot is the most
technically interesting one to discuss, since it's a structural limitation
of the approach, not just missing feature coverage.

---

## 11. Quick Reference — Key Numbers

| What | Value |
|---|---|
| Pose model | YOLOv8n-Pose (Ultralytics), COCO 17-keypoint layout |
| Person selection | Largest bounding-box area among confident detections |
| Side selection | Higher average keypoint confidence, decided per-video |
| Scene-cut threshold | Hip-position jump > 0.06 (normalized) between frames |
| Squat/deadlift knee lockout | Locked ≥163°, failed ≤145°, borderline between |
| Deadlift hip extension | Locked ≥150°, failed ≤130° (recalibrated from the 154.4° case) |
| Bench lockout | Position-based (bar returns to starting height), not angle |
| Bench pause tolerance | Variance ≤0.015 clean pass, ≥0.035 clear fail |
| Borderline penalty | 35% of the full penalty, not 100% |
| Score scale | 0–10, transparent per-check deductions with reasons |
