from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import uuid

from db import db
from auth.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr


@router.post("/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email})

    if not user:
        # Auto-create user (optional but recommended)
        user = {
            "id": str(uuid.uuid4()),
            "email": request.email,
            "tier": "demo",
            "nda_signed": False,
        }
        await db.users.insert_one(user)

    token = create_access_token({
        "user_id": user["id"],
        "email": user["email"],
        "tier": user["tier"],
        "nda_signed": user["nda_signed"]
    })

    return {"access_token": token}
