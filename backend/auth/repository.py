from db.mongo import get_database
from auth.models import User

async def get_user_by_email(email: str):
    db = get_database()
    return await db.users.find_one({"email": email})

async def upsert_user(email: str, tier: str):
    db = get_database()
    await db.users.update_one(
        {"email": email},
        {"$set": {"tier": tier}},
        upsert=True,
    )
