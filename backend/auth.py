"""
auth.py — password hashing and JWT helpers.

Uses the `bcrypt` library directly, NOT passlib's bcrypt wrapper. Tested during
development: passlib's version-detection code is broken against bcrypt>=4.0
(a known upstream incompatibility — it throws AttributeError trying to read
bcrypt's internal version info before it even gets to hashing anything).
bcrypt itself works fine directly; passlib's compatibility shim is what's
broken. Same project pattern as everywhere else here: test the "standard"
approach before trusting it.
"""

import os
from datetime import datetime, timedelta

import bcrypt
from jose import jwt, JWTError

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-this-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7  # a week — this is a personal training tool, not a bank


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_token(subject: str, role: str) -> str:
    """role is 'user' or 'coach' — kept in the token so the backend can tell
    which kind of account is calling an endpoint without a second DB lookup."""
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
