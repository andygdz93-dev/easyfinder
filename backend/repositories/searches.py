from datetime import datetime
from bson import ObjectId
from db.mongo import get_database

async def create_search(user_id: str, name: str, filters: dict):
    db = get_database()
    doc = {
        "user_id": ObjectId(user_id),
        "name": name,
        "filters": filters,
        "created_at": datetime.utcnow(),
    }
    result = await db.saved_searches.insert_one(doc)
    return {**doc, "id": str(result.inserted_id)}

async def get_searches(user_id: str):
    db = get_database()
    cursor = db.saved_searches.find({"user_id": ObjectId(user_id)})
    return [
        {**doc, "id": str(doc["_id"])}
        async for doc in cursor
    ]

async def delete_search(user_id: str, search_id: str):
    db = get_database()
    await db.saved_searches.delete_one({
        "_id": ObjectId(search_id),
        "user_id": ObjectId(user_id),
    })
