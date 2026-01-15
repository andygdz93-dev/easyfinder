import os
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "easyfinder")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL environment variable is not set")

_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL)
    return _client


def get_database():
    client = get_client()
    return client[DB_NAME]
