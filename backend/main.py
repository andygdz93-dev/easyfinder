from fastapi import FastAPI, Depends
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
import os

from db import scores_collection
from scoring import calculate_score
from routers.health import router as health_router
from routers.score import router as score_router

from auth.deps import get_current_user
from auth.models import User

app = FastAPI(title="EasyFinder API")

# ---------- CORS ----------
origins = os.getenv("CORS_ORIGINS")
origins = origins.split(",") if origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Routers ----------
app.include_router(health_router, prefix="/api")
app.include_router(score_router)

# ---------- Models ----------
class ScoreRequest(BaseModel):
    budget: int
    priority: str
    urgency: int

# ---------- PROTECTED ROUTES ----------
@app.post("/api/score")
async def score(
    payload: ScoreRequest,
    user: User = Depends(get_current_user)  # 🔐 1.8 PROTECTION IS HERE
):
    score_value = calculate_score(
        payload.budget,
        payload.priority,
        payload.urgency
    )

    doc = {
        "budget": payload.budget,
        "priority": payload.priority,
        "urgency": payload.urgency,
        "score": score_value,
        "created_at": datetime.utcnow(),
        "requested_by": user.email,
        "user_id": user.id,
    }

    await scores_collection.insert_one(doc)

    return {"total": score_value}

@app.get("/api/scores")
async def get_scores(
    user: User = Depends(get_current_user)  # 🔐 protected read
):
    cursor = scores_collection.find().sort("created_at", -1).limit(20)
    results = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)

    return results

@app.get("/")
def root():
    return {"status": "ok", "service": "easyfinder-backend"}