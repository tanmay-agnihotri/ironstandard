"""
database.py — MongoDB connection for Iron Standard.

Collections:
  users      — {_id, name, password_hash, status ("pending"/"approved"/"rejected"), created_at}
  coaches    — {_id, name, password_hash}  (seeded once via seed_coach.py, never self-registered)
  activities — {_id, user_id, user_name, type, date, summary, created_at}
               One document per logged action (workout, check-in, lift check, diet log) —
               this is what the coach dashboard reads to show "user X did Y on date Z".

Uses plain pymongo (sync), not motor — FastAPI runs sync route functions in a thread
pool automatically, so async isn't needed here and it keeps the code simpler to read.
"""

import os
from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "iron_standard")

_client = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client[DB_NAME]
