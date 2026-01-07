from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId


# Needed to serialize Mongo ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    email: str
    company: Optional[str] = None

    nda_signed: bool = False
    tier: str = "demo"  # demo | nda | paid

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
