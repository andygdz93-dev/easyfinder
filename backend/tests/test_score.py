def test_score_requires_auth(client):
    res = client.post("/api/inventory")
    assert res.status_code == 401
