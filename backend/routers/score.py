from fastapi import APIRouter
from pydantic import BaseModel
from scoring import calculate_score

router = APIRouter(prefix="/api", tags=["Score"])


class ScoreRequest(BaseModel):
    budget: int
    priority: str
    urgency: int


@router.post("/score")
def score_lead(payload: ScoreRequest):
    result = calculate_score(payload.budget, payload.priority, payload.urgency)
    return result