# Iron Standard — Powerlifting Self-Coach

A self-coaching platform for powerlifting and general gym training. Upload a
squat/bench/deadlift video and get a real computer-vision analysis (depth,
lockout, tempo, a 0-10 score). Now with real accounts: users sign up and wait
for a coach to approve them; coaches log in separately and see every
approved user's logged activity.

```
frontend/          React app (Vite) — all screens + the new auth flow
frontend-legacy/    Original single-file HTML version — kept as a fallback
backend/            FastAPI server: CV pipeline + auth + MongoDB
docs/               Architecture notes + interview-prep.md
```

---

## What's new: accounts, approval, coach dashboard

- **Two separate login screens** — a lifter logs in/signs up on one screen; a
  coach logs in on a different screen (toggle between them from either page).
- **Coach accounts are fixed, not self-registered.** Run `seed_coach.py` once
  to create the coach account before anyone can log in as a coach.
- **New sign-ups are "pending"** until a coach approves them. A pending user
  sees a "Wait for Approval" screen and can't reach the app until approved
  (this is enforced on the *backend* too, not just hidden in the UI — a
  pending user's token genuinely gets rejected with a 403 if they try to hit
  a protected endpoint directly).
- **The coach dashboard** lists pending sign-ups with Approve/Reject buttons,
  and every approved (and rejected) user with how many activities they've
  logged and when they last logged one. Click a user to expand their full
  activity list.
- **Activity logging** happens automatically whenever a user saves a workout,
  a check-in, a lift check, or a diet-followed entry — each posts a short
  summary to the backend so the coach dashboard has something to show. This
  is best-effort: if the backend is briefly unreachable, saving still works
  locally and just skips the coach-visible log entry rather than blocking you.

---

## Running it — three pieces now: MongoDB, backend, frontend

### 1. MongoDB

You need a MongoDB instance. Two free options:

**Option A — install locally** (macOS):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```
(Windows/Linux: see mongodb.com/docs/manual/installation)

**Option B — MongoDB Atlas (free cloud tier, no local install):**
Sign up at mongodb.com/cloud/atlas, create a free cluster, and copy its
connection string — you'll set it as `MONGO_URI` below instead of using the
localhost default.

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set your Mongo connection (skip this if using local MongoDB on the default port):
```bash
export MONGO_URI="your-atlas-connection-string"   # only if using Atlas
```

**Create the coach account (once):**
```bash
export COACH_NAME="coach"          # optional, defaults to "coach"
export COACH_PASSWORD="yourpass"   # optional, defaults to "changeme123" — please change it
python3 seed_coach.py
```

**Start the server:**
```bash
python3 -m uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. You'll land on the lifter login/signup screen
by default — tap "I'm a coach" to switch to the coach login instead.

---

## Trying the full flow

1. Sign up as a lifter (any name/password) → you'll land on "Wait for Approval."
2. Open a second browser tab (or incognito window), log in as the coach
   (using the name/password from `seed_coach.py`) → you'll see that signup
   in the Pending list → click Approve.
3. Back in the first tab, refresh → you're in.
4. Log a workout, a check-in, or a Lift Check → switch to the coach tab and
   refresh the dashboard → you'll see the activity count and, if you click
   the user, the actual logged entries.

---

## What's genuinely tested vs. not

- **The full auth flow** (signup → pending-blocked → coach sees it → approve
  → user unblocked → activity visible to coach → wrong password rejected →
  role separation enforced) was tested end-to-end using an in-memory MongoDB
  mock before this was ever wired into the frontend — same testing discipline
  as the CV pipeline.
- **The CV pipeline behind the new auth gate** was re-tested against the same
  real deadlift video used throughout this project, to confirm the auth layer
  didn't change the analysis result — it didn't (still scores correctly).
- **The frontend auth screens** build clean and transform without error, but
  haven't been clicked through in a real browser by me — the same honest
  caveat as the rest of the React port. Test the flow above and tell me what
  breaks.
- **Security note**: `JWT_SECRET` defaults to a dev value in `auth.py` — set
  a real one via the `JWT_SECRET` environment variable before this touches
  anything beyond your own machine. CORS is also still locked to
  `localhost:5173` only.

## Where this goes next

`docs/architecture.md` covers RAG over the rulebook and the weekly human-review
subscription tier. `docs/interview-prep.md` is a deep technical walkthrough of
the CV pipeline's real bugs and fixes, useful background before extending
the auth system further (e.g. password reset, coach-initiated invites).
