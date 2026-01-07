from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from datetime import datetime
from backend.routes.inventory import router as inventory_router
from routes.nda import router as nda_router
from routes.demo import router as demo_router
import random

app = FastAPI(
    title="EasyFinder AI",
    description="Enterprise AI buyer identification & outreach platform",
    version="1.0.0"
    )

app.include_router(nda_router, prefix="/nda")
app.include_router(inventory_router, prefix="/inventory")
app.include_router(demo_router, prefix="/demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# CONFIG
# -------------------------
DEMO_MODE = True
ALLOWED_DOMAINS = ["dealer.com", "equipment.com", "corp.com"]

# -------------------------
# SCHEMAS
# -------------------------
class ScoreRequest(BaseModel):
    company: str
    contact: str
    email: EmailStr
    equipment: str
    intent: str
    variant: str

class OutreachRequest(BaseModel):
    context: str

# -------------------------
# HELPERS
# -------------------------
def score_lead(intent: str):
    base = {"Low": 40, "Medium": 65, "High": 85}.get(intent, 50)
    score = base + random.randint(0, 10)

    tier = "Low"
    if score >= 80:
        tier = "High"
    elif score >= 60:
        tier = "Medium"

    return score, tier

# -------------------------
# ENDPOINTS
# -------------------------

@app.get("/")
def root():
    return {
        "status": 
        "EasyFinder AI backend running"
    }

@app.post("/score-lead")
def score_lead_endpoint(data: ScoreRequest):
    score, tier = score_lead(data.intent)

    return {
        "score": score,
        "tier": tier,
        "explanation": [
            "Equipment category matches active inventory",
            "Commercial email domain detected",
            f"Declared intent level: {data.intent}",
        ],
    }

@app.get("/scores")
def get_scores():
    # demo-safe static data
    return [
        {"company": "Delta Equipment", "score": 92, "tier": "High"},
        {"company": "IronWorks LLC", "score": 71, "tier": "Medium"},
        {"company": "Budget Rentals", "score": 45, "tier": "Low"},
    ]

@app.post("/generate-outreach")
def generate_outreach(req: OutreachRequest):
    return {
        "email": f"""Subject: Confidential Equipment Availability

Hi,

Based on recent demand signals, our system identified your organization as a strong match for select heavy equipment inventory.

Access is NDA-gated. We do not distribute inventory lists publicly.

If you'd like to review availability, please confirm NDA execution.

Best,
EasyFinder AI
"""
    }
