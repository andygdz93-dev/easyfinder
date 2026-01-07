from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    company = Column(String, nullable=False)

    nda_signed = Column(Boolean, default=False)
    tier = Column(String, default="demo")  # demo | nda | paid

    created_at = Column(DateTime, default=datetime.utcnow)
