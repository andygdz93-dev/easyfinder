from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import SessionLocal
from auth.models import User
from auth.jwt import create_token
from auth.dependancies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
def login(email: str, company: str):
    db = SessionLocal()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, company=company)
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token({"user_id": user.id})
    return {"access_token": token}

@router.post("/sign-nda")
def sign_nda(user: User = Depends(get_current_user), db: Session = Depends(SessionLocal)):
    user.nda_signed = True
    user.tier = "nda"
    db.commit()
    return {"status": "NDA signed"}
