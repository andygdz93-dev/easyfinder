from datetime import datetime
from db.mongo import get_database

async def log_event(
    *,
    user_id: str,
    action: str,
    metadata: dict | None = None,
):
    db = get_database()

    await db.audit_logs.insert_one({
        "user_id": user_id,
        "action": action,
        "metadata": metadata or {},
        "created_at": datetime.utcnow(),
    })
