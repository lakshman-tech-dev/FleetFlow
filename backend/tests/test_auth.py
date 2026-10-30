def test_health_and_readiness(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_ready = client.get("/api/v1/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready"


def test_login_success(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleetflow.io", "password": "FleetFlow2026!Admin"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@fleetflow.io"
    assert data["user"]["role"] == "admin"


def test_login_invalid_credentials(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleetflow.io", "password": "WrongPassword123!"},
    )
    assert res.status_code == 401
    assert "detail" in res.json()


def test_get_current_user_profile(client, admin_headers):
    res = client.get("/api/v1/auth/me", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "admin@fleetflow.io"


def test_unauthenticated_access_rejected(client):
    res = client.get("/api/v1/users")
    assert res.status_code == 401


def test_rbac_forbidden_access(client, dispatcher_headers):
    # Dispatcher should be rejected from User management (Admin only)
    res = client.get("/api/v1/users", headers=dispatcher_headers)
    assert res.status_code == 403
    assert "Permission denied" in res.json()["detail"]
