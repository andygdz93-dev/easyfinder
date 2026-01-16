def test_login(client):
    res = client.post(
        "/api/auth/login",
        data={"username": "test@test.com", "password": "x"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
