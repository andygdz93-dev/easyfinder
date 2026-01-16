from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Literal, List, Any
from datetime import datetime


class User(BaseModel):
    id: Optional[Any] = Field(default=None, alias="_id")
    email: EmailStr
    company: Optional[str] = Field(default=None)

    nda_signed: bool = False
    tier: Literal["demo", "nda", "paid"] = "demo"
    scopes: List[str] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    email: EmailStr
    tier: str
    scopes: List[str]
