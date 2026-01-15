from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os

_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global _client

    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL environment variable is not set")

    if _client is None:
        _client = AsyncIOMotorClient(mongo_url)

    return _client


def get_database():
    db_name = os.getenv("DB_NAME", "easyfinder")
    return get_client()[db_name]
