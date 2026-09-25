"""
main.py — the real backend behind the frontend's video upload, plus the
auth/approval system: user signup+login, a fixed coach account, a
pending-approval gate, and activity logging the coach dashboard reads from.

Run: uvicorn main:app --reload --port 8000
Coach account must exist first — run seed_coach.py once before using this.
"""

import os
import tempfile
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from lift_analyzer import (
    extract_landmarks,
    check_section,
    analyze_squat,
    analyze_deadlift,
    analyze_bench,
    annotate_video,
)
from database import get_db
from auth import hash_password, verify_password, create_token, decode_token
from models import SignupRequest, LoginRequest, ActivityLogRequest

app = FastAPI(title="Iron Standard API")

# Local dev only — Vite's default port. Tighten this before deploying anywhere real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ANNOTATED_DIR = tempfile.mkdtemp(prefix="iron_standard_annotated_")


@app.get("/health")
def health():
    return {"ok": True}


# ============================= Auth dependencies =============================

def _get_token_payload(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    payload = decode_token(authorization.removeprefix("Bearer "))
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


def get_current_user(authorization: str = Header(None)):
    payload = _get_token_payload(authorization)
    if payload.get("role") != "user":
        raise HTTPException(status_code=403, detail="This endpoint is for user accounts")
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return user


def get_approved_user(user=Depends(get_current_user)):
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail=f"Account status is '{user['status']}' — not yet approved by a coach")
    return user


def get_current_coach(authorization: str = Header(None)):
    payload = _get_token_payload(authorization)
    if payload.get("role") != "coach":
        raise HTTPException(status_code=403, detail="This endpoint is for coach accounts")
    db = get_db()
    coach = db.coaches.find_one({"_id": ObjectId(payload["sub"])})
    if not coach:
        raise HTTPException(status_code=401, detail="Coach account no longer exists")
    return coach


# ============================= User auth =============================

@app.post("/auth/signup")
def signup(body: SignupRequest):
    db = get_db()
    if db.users.find_one({"name": body.name}):
        raise HTTPException(status_code=409, detail="That name is already taken")
    doc = {
        "name": body.name,
        "password_hash": hash_password(body.password),
        "status": "pending",  # every new signup waits for a coach to approve it
        "created_at": datetime.utcnow().isoformat(),
    }
    result = db.users.insert_one(doc)
    token = create_token(str(result.inserted_id), "user")
    return {"token": token, "status": "pending", "role": "user", "name": body.name}


@app.post("/auth/login")
def login(body: LoginRequest):
    db = get_db()
    user = db.users.find_one({"name": body.name})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong name or password")
    token = create_token(str(user["_id"]), "user")
    return {"token": token, "status": user["status"], "role": "user", "name": user["name"]}


@app.get("/auth/me")
def me(authorization: str = Header(None)):
    payload = _get_token_payload(authorization)
    db = get_db()
    if payload.get("role") == "coach":
        coach = db.coaches.find_one({"_id": ObjectId(payload["sub"])})
        if not coach:
            raise HTTPException(status_code=401, detail="Coach account no longer exists")
        return {"name": coach["name"], "role": "coach", "status": "approved"}
    user = db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return {"name": user["name"], "role": "user", "status": user["status"]}


# ============================= Coach auth =============================

@app.post("/auth/coach-login")
def coach_login(body: LoginRequest):
    db = get_db()
    coach = db.coaches.find_one({"name": body.name})
    if not coach or not verify_password(body.password, coach["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong name or password")
    token = create_token(str(coach["_id"]), "coach")
    return {"token": token, "status": "approved", "role": "coach", "name": coach["name"]}


# ============================= Coach dashboard =============================

@app.get("/coach/users")
def list_users(coach=Depends(get_current_coach)):
    db = get_db()
    out = []
    for u in db.users.find().sort("created_at", -1):
        activities = list(db.activities.find({"user_id": str(u["_id"])}).sort("created_at", -1))
        out.append({
            "id": str(u["_id"]),
            "name": u["name"],
            "status": u["status"],
            "created_at": u["created_at"],
            "activity_count": len(activities),
            "last_activity": activities[0]["created_at"] if activities else None,
        })
    return out


@app.get("/coach/users/{user_id}/activities")
def user_activities(user_id: str, coach=Depends(get_current_coach)):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")
    activities = list(db.activities.find({"user_id": user_id}).sort("created_at", -1))
    for a in activities:
        a["_id"] = str(a["_id"])
    return activities


@app.post("/coach/approve/{user_id}")
def approve_user(user_id: str, coach=Depends(get_current_coach)):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")
    result = db.users.update_one({"_id": oid}, {"$set": {"status": "approved"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@app.post("/coach/reject/{user_id}")
def reject_user(user_id: str, coach=Depends(get_current_coach)):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")
    result = db.users.update_one({"_id": oid}, {"$set": {"status": "rejected"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ============================= Activity logging =============================

@app.post("/activity/log")
def log_activity(body: ActivityLogRequest, user=Depends(get_approved_user)):
    db = get_db()
    db.activities.insert_one({
        "user_id": str(user["_id"]),
        "user_name": user["name"],
        "type": body.type,
        "date": body.date,
        "summary": body.summary,
        "created_at": datetime.utcnow().isoformat(),
    })
    return {"ok": True}


# ============================= CV analysis (now requires an approved account) =============================

@app.post("/analyze")
async def analyze(video: UploadFile = File(...), lift: str = Form(...), annotate: bool = Form(False), user=Depends(get_approved_user)):
    if lift not in ("squat", "bench", "deadlift"):
        return {"ok": False, "reason": f"Unknown lift type '{lift}'"}

    # Save the upload to a temp file — the CV pipeline reads from disk via OpenCV.
    suffix = os.path.splitext(video.filename or "")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        video_path = tmp.name

    try:
        frames, fps = extract_landmarks(video_path)

        mismatch = check_section(frames, lift)
        if mismatch:
            return mismatch

        if lift == "squat":
            report = analyze_squat(frames, fps)
        elif lift == "deadlift":
            report = analyze_deadlift(frames, fps)
        else:
            report = analyze_bench(frames, fps)

        if annotate and report.get("ok"):
            end_frame = report["frames"].get("analyzed_through_frame", len(frames))
            out_id = next(tempfile._get_candidate_names())
            out_path = os.path.join(ANNOTATED_DIR, f"{out_id}.mp4")
            annotate_video(video_path, out_path, frames, end_frame=end_frame, lift=lift)
            report["annotated_video_id"] = out_id

        return report
    finally:
        os.unlink(video_path)


@app.get("/annotated/{video_id}")
def get_annotated(video_id: str):
    path = os.path.join(ANNOTATED_DIR, f"{video_id}.mp4")
    if not os.path.exists(path):
        return {"ok": False, "reason": "not found or expired"}
    return FileResponse(path, media_type="video/mp4")


# ============================= Human review requests =============================
# Directly answers a real gap in the CV pipeline: it can't tell a spotter-assisted
# rep from a solo one, and it can't verify the weight is real (pose tracking has no
# concept of load). This is the escape hatch — a human coach reviews the actual
# video for cases where that matters.

REVIEW_DIR = os.environ.get("REVIEW_VIDEO_DIR", tempfile.mkdtemp(prefix="iron_standard_reviews_"))
REVIEW_FEE_INR = 199  # nominal fee — see note on payment below

# NOTE ON PAYMENT: there is no real payment gateway wired in here. "fee_paid" is set
# to true unconditionally the moment a request is created — this endpoint is a stand-in
# for where a real integration (Razorpay/Stripe) would sit: charge REVIEW_FEE_INR,
# confirm the charge succeeded, THEN create the request. Don't present this as a real
# payment system — it structurally isn't one yet.


@app.post("/review/request")
async def request_review(
    video: UploadFile = File(...),
    lift: str = Form(...),
    cv_score: float = Form(...),
    cv_summary: str = Form(...),
    user=Depends(get_approved_user),
):
    if lift not in ("squat", "bench", "deadlift"):
        raise HTTPException(status_code=400, detail=f"Unknown lift type '{lift}'")

    db = get_db()
    request_id = str(ObjectId())
    suffix = os.path.splitext(video.filename or "")[1] or ".mp4"
    video_path = os.path.join(REVIEW_DIR, f"{request_id}{suffix}")
    with open(video_path, "wb") as f:
        f.write(await video.read())

    db.review_requests.insert_one({
        "_id": ObjectId(request_id),
        "user_id": str(user["_id"]),
        "user_name": user["name"],
        "lift": lift,
        "cv_score": cv_score,
        "cv_summary": cv_summary,
        "video_path": video_path,
        "fee_inr": REVIEW_FEE_INR,
        "fee_paid": True,  # mocked — see note above
        "status": "pending",  # pending -> reviewed
        "verdict": None,       # "good_lift" | "no_lift", set by the coach
        "coach_notes": None,
        "reviewed_by": None,
        "created_at": datetime.utcnow().isoformat(),
        "reviewed_at": None,
    })
    return {"ok": True, "request_id": request_id, "fee_inr": REVIEW_FEE_INR}


@app.get("/review/mine")
def my_reviews(user=Depends(get_approved_user)):
    db = get_db()
    out = []
    for r in db.review_requests.find({"user_id": str(user["_id"])}).sort("created_at", -1):
        r["_id"] = str(r["_id"])
        r.pop("video_path", None)  # not the user's business, and not servable without a coach token
        out.append(r)
    return out


@app.get("/coach/reviews")
def list_reviews(coach=Depends(get_current_coach)):
    db = get_db()
    out = []
    for r in db.review_requests.find().sort([("status", 1), ("created_at", -1)]):
        r["_id"] = str(r["_id"])
        r.pop("video_path", None)
        out.append(r)
    return out


@app.get("/coach/reviews/{request_id}/video")
def review_video(request_id: str, authorization: str = Header(None), token: str = None):
    # <video src="..."> can't attach an Authorization header, so this endpoint also accepts
    # ?token=... as a query param — same JWT, just carried differently for this one route.
    if token and not authorization:
        authorization = f"Bearer {token}"
    payload = _get_token_payload(authorization)
    if payload.get("role") != "coach":
        raise HTTPException(status_code=403, detail="This endpoint is for coach accounts")
    db = get_db()
    coach = db.coaches.find_one({"_id": ObjectId(payload["sub"])})
    if not coach:
        raise HTTPException(status_code=401, detail="Coach account no longer exists")
    try:
        r = db.review_requests.find_one({"_id": ObjectId(request_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid request id")
    if not r or not os.path.exists(r["video_path"]):
        raise HTTPException(status_code=404, detail="Video not found — it may have been cleaned up")
    return FileResponse(r["video_path"], media_type="video/mp4")


@app.post("/coach/reviews/{request_id}/verdict")
def submit_verdict(request_id: str, verdict: str = Form(...), notes: str = Form(""), coach=Depends(get_current_coach)):
    if verdict not in ("good_lift", "no_lift"):
        raise HTTPException(status_code=400, detail="verdict must be 'good_lift' or 'no_lift'")
    db = get_db()
    try:
        oid = ObjectId(request_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid request id")
    result = db.review_requests.update_one(
        {"_id": oid},
        {"$set": {
            "status": "reviewed",
            "verdict": verdict,
            "coach_notes": notes,
            "reviewed_by": coach["name"],
            "reviewed_at": datetime.utcnow().isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"ok": True}


