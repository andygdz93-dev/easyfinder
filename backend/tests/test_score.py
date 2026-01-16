def test_score_requires_auth(client):
    res = client.post("/api/score", json={})
    assert res.status_code == 401
