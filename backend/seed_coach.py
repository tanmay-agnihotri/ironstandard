"""
seed_coach.py — creates the fixed coach account. Coaches don't self-register
(the whole point of the approval workflow is that only a coach can approve
new users, so a coach account has to exist before any user can be let in).

Run once: python3 seed_coach.py
Change the name/password below, or set COACH_NAME / COACH_PASSWORD env vars,
before running it.
"""

import os
from database import get_db
from auth import hash_password

COACH_NAME = os.environ.get("COACH_NAME", "coach")
COACH_PASSWORD = os.environ.get("COACH_PASSWORD", "changeme123")

db = get_db()

existing = db.coaches.find_one({"name": COACH_NAME})
if existing:
    print(f"Coach '{COACH_NAME}' already exists — not creating a duplicate.")
else:
    db.coaches.insert_one({
        "name": COACH_NAME,
        "password_hash": hash_password(COACH_PASSWORD),
    })
    print(f"Coach account created: name='{COACH_NAME}'")
    if "COACH_PASSWORD" not in os.environ:
        print("WARNING: using the default password. Set COACH_PASSWORD and re-create the account before deploying.")
    print("Change the password by re-running with COACH_PASSWORD set, after deleting the old one.")
