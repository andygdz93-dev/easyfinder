from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True)
    company = Column(String, index=True)
    contact = Column(String)
    email = Column(String, index=True)
    equipment = Column(String)
    intent = Column(String)
    score = Column(Integer)
    tier = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class NDARecord(Base):
    __tablename__ = "ndas"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    company = Column(String)
    signed = Column(Boolean, default=False)
    signed_at = Column(DateTime, nullable=True)

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    category = Column(String)
    model = Column(String)
    year = Column(String)
    condition = Column(String)
    price_range = Column(String)
