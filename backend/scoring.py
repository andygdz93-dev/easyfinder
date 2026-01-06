# scoring.py

def score_budget(budget: int) -> int:
    if budget < 2000:
        return 5
    elif budget < 5000:
        return 15
    elif budget < 10000:
        return 30
    else:
        return 40


PRIORITY_WEIGHTS = {
    "low": 5,
    "medium": 15,
    "high": 30
}


def score_priority(priority: str) -> int:
    return PRIORITY_WEIGHTS.get(priority.lower(), 0)


def score_urgency(urgency: int) -> int:
    urgency = max(1, min(urgency, 10))
    return urgency * 3


def calculate_score(budget: int, priority: str, urgency: int) -> dict:
    budget_score = score_budget(budget)
    priority_score = score_priority(priority)
    urgency_score = score_urgency(urgency)

    total = budget_score + priority_score + urgency_score

    return {
        "total": total,
        "breakdown": {
            "budget": budget_score,
            "priority": priority_score,
            "urgency": urgency_score,
        },
    }
