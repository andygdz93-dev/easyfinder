def test_login(client):
    res = client.post(
        "/api/auth/login",
        data={"username": "test@test.com", "password": "x"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
