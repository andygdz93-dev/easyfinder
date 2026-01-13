from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from db import db
from core.security import create_access_token
from typing import Optional
from datetime import datetime
import uuid


router = APIRouter(tags=["Auth"])

class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    company: Optional[str] = None
    tier: str = "demo"
    nda_signed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


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
