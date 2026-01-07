from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime

from backend.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)

    nda_signed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
