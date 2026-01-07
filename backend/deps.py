from fastapi import Depends, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth.jwt import decode_token
from db.mongo import get_database


# -------------------------------------------------
# AUTH DEPENDENCY
# -------------------------------------------------

async def get_current_user(
    authorization: str = Header(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Extracts and validates JWT, then loads user.
    """

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.replace("Bearer ", "")

    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# -------------------------------------------------
# NDA GUARD
# -------------------------------------------------

async def require_nda(user: dict = Depends(get_current_user)):
    if not user.get("nda_signed", False):
        raise HTTPException(
            status_code=403,
            detail="NDA must be signed before accessing this resource"
        )
    return user
