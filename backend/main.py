from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from routes.inventory import router as inventory_router
from routes.nda import router as nda_router
from routes.demo import router as demo_router
from routes.auth import router as auth_router
import random
from fastapi import APIRouter

app = FastAPI(
    title="EasyFinder AI",
    description="Enterprise AI buyer identification & outreach platform",
    version="1.0.0",
)

api_router = APIRouter(prefix="/api")

app.include_router(nda_router, prefix="/nda")
app.include_router(inventory_router, prefix="/inventory",tags=["Inventory"])
app.include_router(demo_router, prefix="/demo")
app.include_router(auth_router)
app.include_router(api_router)



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
    name: str
    score: int

class OutreachRequest(BaseModel):
    context: str

# -------------------------
# HELPERS
# -------------------------
def compute_lead_score(intent: str):
    base = {"Low": 40, "Medium": 65, "High": 85}.get(intent, 50)
    score = base + random.randint(0, 10)
    score = max(0, min(100, score))  # clamp to [0,100]

    tier = "Low"
    if score >= 80:
        tier = "High"
    elif score >= 60:
        tier = "Medium"

    return score, tier

def _email_domain_allowed(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    return any(domain == d or domain.endswith("." + d) for d in ALLOWED_DOMAINS)

# -------------------------
# ENDPOINTS
# -------------------------
   
# Root endpoint
# ---------------------------
@app.get("/")
def read_root():
    return {
        "status": "EasyFinder AI backend running"
    }

@app.post("/score-lead")
def score_lead_endpoint(data: ScoreRequest):
    # enforce allowed domains unless demo mode is on
    if not DEMO_MODE and not _email_domain_allowed(data.email):
        raise HTTPException(status_code=403, detail="Email domain not allowed")

    score, tier = compute_lead_score(data.intent)

    domain_note = "Commercial email domain detected" if _email_domain_allowed(data.email) else "Unrecognized email domain"

    return {
        "score": score,
        "tier": tier,
        "explanation": [
            "Equipment category matches active inventory",
            domain_note,
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

@api_router.get("/health")
def health_check():
    return {"status": "ok"}

@api_router.post("/score")
def submit_score(request: ScoreRequest):
    return {"message": f"Score received for {request.name}", "score": request.score}

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

if __name__ == "__main__":
    print("Registered routes:")
    for route in app.routes:
        print(route.path)