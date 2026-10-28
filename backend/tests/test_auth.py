def test_login_returns_token_and_school(client):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "owner@sunrise.in", "password": "demo1234"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["token"]
    assert data["user"]["role"] == "owner"
    assert data["school"]["name"] == "Sunrise Driving School"
    assert data["subscription"]["price"] == 199
    assert data["subscription"]["upiId"] == "test@upi"
    assert data["subscription"]["canWrite"] is True


def test_login_by_phone(client):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "+91 98220 01100", "password": "demo1234"},
    )
    assert response.status_code == 200


def test_login_rejects_bad_password(client):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "owner@sunrise.in", "password": "wrong"},
    )
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "invalid_credentials"


def test_superadmin_cannot_use_school_api(client):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "admin@test.in", "password": "adminpass123"},
    )
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "admin_portal"


def test_me_requires_token(client, auth):
    assert client.get("/api/me").status_code == 401
    response = client.get("/api/me", headers=auth)
    assert response.status_code == 200
    assert response.get_json()["school"]["name"] == "Sunrise Driving School"


def test_bootstrap_returns_students_with_sessions(client, auth):
    response = client.get("/api/bootstrap", headers=auth)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["students"]) == 8
    first = data["students"][0]
    assert first["id"].startswith("STU-")
    assert "package" in first
    assert "fees" in first
    assert "sessions" in first
    assert data["subscription"]["state"] in {"trialing", "active"}


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_cors_preflight(client):
    response = client.options(
        "/api/students",
        headers={
            "Origin": "capacitor://localhost",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "*"
