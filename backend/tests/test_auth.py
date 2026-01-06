def test_login():
    res = client.post("/auth/login?email=test@test.com")
    assert "access_token" in res.json()
