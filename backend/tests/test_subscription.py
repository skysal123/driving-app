import re
from datetime import timedelta

from app.extensions import db
from app.models import School
from app.utils import utcnow


def _csrf(html):
    match = re.search(r'name="csrf" value="([^"]+)"', html)
    assert match
    return match.group(1)


def _admin_login(client):
    page = client.get("/admin/login")
    assert page.status_code == 200
    token = _csrf(page.get_data(as_text=True))
    response = client.post(
        "/admin/login",
        data={"csrf": token, "email": "admin@test.in", "password": "adminpass123"},
    )
    assert response.status_code == 302
    dashboard = client.get("/admin")
    assert dashboard.status_code == 200
    return _csrf(dashboard.get_data(as_text=True))


def _submit_renewal(client, auth, utr_value):
    return client.post(
        "/api/subscription/renewals",
        json={"utr": utr_value},
        headers=auth,
    )


def test_subscription_read(client, auth):
    response = client.get("/api/subscription", headers=auth)
    assert response.status_code == 200
    data = response.get_json()["subscription"]
    assert data["price"] == 199
    assert data["state"] == "trialing"
    assert data["daysLeft"] >= 1
    assert data["canWrite"] is True


def test_renewal_validation(client, auth):
    assert _submit_renewal(client, auth, "123").status_code == 400
    assert _submit_renewal(client, auth, "abcdefghijkl").status_code == 400


def test_renewal_submission_and_admin_approval(client, auth, app):
    response = _submit_renewal(client, auth, "123456789012")
    assert response.status_code == 201, response.get_json()
    renewal = response.get_json()["renewal"]
    assert renewal["status"] == "pending"
    assert renewal["amount"] == 199
    assert renewal["utr"] == "123456789012"

    duplicate = _submit_renewal(client, auth, "123456789012")
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "utr_used"

    with app.app_context():
        before = School.query.first().subscription_ends_at

    csrf = _admin_login(client)
    dashboard = client.get("/admin")
    assert dashboard.status_code == 200
    assert "123456789012" in dashboard.get_data(as_text=True)

    approved = client.post(
        f"/admin/renewals/{renewal['id']}/approve",
        data={"csrf": csrf},
    )
    assert approved.status_code == 302

    with app.app_context():
        school = School.query.first()
        assert school.subscription_status == "active"
        assert school.subscription_plan == "Premium"
        assert school.subscription_ends_at >= before + timedelta(days=29)

    state = client.get("/api/subscription", headers=auth).get_json()["subscription"]
    assert state["state"] == "active"
    assert state["plan"] == "Premium"


def test_admin_can_reject_renewal(client, auth):
    response = _submit_renewal(client, auth, "999888777666")
    renewal = response.get_json()["renewal"]
    csrf = _admin_login(client)
    rejected = client.post(
        f"/admin/renewals/{renewal['id']}/reject",
        data={"csrf": csrf, "note": "Payment not found"},
    )
    assert rejected.status_code == 302

    listing = client.get("/api/subscription/renewals", headers=auth).get_json()["renewals"]
    row = next(item for item in listing if item["id"] == renewal["id"])
    assert row["status"] == "rejected"
    assert "Payment not found" in row["note"]


def test_admin_login_rejects_wrong_password(client):
    page = client.get("/admin/login")
    token = _csrf(page.get_data(as_text=True))
    response = client.post(
        "/admin/login",
        data={"csrf": token, "email": "admin@test.in", "password": "nope"},
    )
    assert response.status_code == 401


def test_expired_school_is_read_only(client, auth, app, admission):
    with app.app_context():
        school = School.query.first()
        school.subscription_status = "expired"
        school.subscription_ends_at = utcnow() - timedelta(days=3)
        db.session.commit()

    state = client.get("/api/subscription", headers=auth).get_json()["subscription"]
    assert state["state"] == "expired"
    assert state["canWrite"] is False

    blocked = client.post("/api/students", json=admission, headers=auth)
    assert blocked.status_code == 402
    assert blocked.get_json()["error"]["code"] == "subscription_expired"

    renewal = _submit_renewal(client, auth, "111222333444")
    assert renewal.status_code == 201
