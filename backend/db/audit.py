from datetime import datetime
from db.mongo import get_database


async def log_access(user_email: str, action: str):
    db = get_database()
    await db.audit.insert_one({
        "email": user_email,
        "action": action,
        "timestamp": datetime.utcnow(),
    })
