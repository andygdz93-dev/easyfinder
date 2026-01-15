from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client

    MONGO_URL = os.getenv("MONGO_URL")
    if not MONGO_URL:
        raise RuntimeError("MONGO_URL environment variable is not set")

    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL)

    return _client


def get_database():
    return get_client().get_default_database()
