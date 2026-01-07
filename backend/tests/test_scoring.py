from ..scoring import calculate_score


def test_high_priority_high_urgency():
    result = calculate_score(6000, "high", 9)
    assert result["total"] > 80


def test_low_budget_low_priority():
    result = calculate_score(1000, "low", 1)
    assert result["total"] < 30


def test_priority_case_insensitive():
    result1 = calculate_score(6000, "HIGH", 5)
    result2 = calculate_score(6000, "high", 5)
    assert result1["total"] == result2["total"]

