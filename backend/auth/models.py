from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Literal, List
from datetime import datetime


class User(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    email: EmailStr
    company: Optional[str] = None

    nda_signed: bool = False
    tier: Literal["demo", "nda", "paid"] = "demo"
    scopes: List[str] = []

    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
        "example": {
                 "sub": "user_id",
                 "email": "user@email.com",
                 "tier": "paid",
                 "scopes": ["inventory", "paid"],
                 "exp": ...
                 }

        },
    )
