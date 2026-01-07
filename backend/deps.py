from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from db import SessionLocal
from auth.jwt import decode_token
from auth.models import User

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")

    token = authorization.split(" ")[1]

    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

def require_nda(user: User = Depends(get_current_user)):
    if not user.nda_signed:
        raise HTTPException(status_code=403, detail="NDA required")
    return user
