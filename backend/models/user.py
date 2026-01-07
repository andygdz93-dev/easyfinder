from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: str
    company: Optional[str] = None
    tier: str = "demo"
    nda_signed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
