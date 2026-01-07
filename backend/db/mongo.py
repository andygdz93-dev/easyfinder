import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "easyfinder")

client = AsyncIOMotorClient(MONGO_URL)

def get_database():
    return client[DB_NAME]
