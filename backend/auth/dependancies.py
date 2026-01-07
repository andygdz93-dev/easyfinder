from fastapi import Depends, HTTPException, Header
from auth.jwt import decode_token
from db import db


async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = authorization.split(" ")[1]

    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def require_nda(user: dict = Depends(get_current_user)):
    if not user.get("nda_signed"):
        raise HTTPException(status_code=403, detail="NDA required")
    return user
