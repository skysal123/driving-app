import re

from app.extensions import db
from app.models import School, User


def _csrf(html):
    match = re.search(r'name="csrf" value="([^"]+)"', html)
    assert match, "CSRF token missing from page"
    return match.group(1)


def _admin_login(client):
    page = client.get("/admin/login").get_data(as_text=True)
    response = client.post(
        "/admin/login",
        data={"csrf": _csrf(page), "email": "admin@test.in", "password": "adminpass123"},
    )
    assert response.status_code == 302


def _form(client):
    page = client.get("/admin/schools/new").get_data(as_text=True)
    match = re.search(r'name="password"[^>]*value="([^"]*)"', page)
    assert match
    return page, match.group(1)


def _create(client, **overrides):
    page, password = _form(client)
    data = {
        "csrf": _csrf(page),
        "name": "Green Valley Motor School",
        "owner_name": "Asha Rao",
        "email": "asha@greenvalley.in",
        "phone": "9876543210",
        "address": "Baner Road, Pune",
        "trial_days": "14",
        "instructors": "Suresh Kale, Neha Joshi",
        "vehicles": "MH12 XY 4321 · Swift",
        "password": password,
    }
    data.update(overrides)
    return client.post("/admin/schools/new", data=data), password


def test_school_form_requires_admin(client):
    response = client.get("/admin/schools/new")
    assert response.status_code == 302
    assert "/admin/login" in response.headers["Location"]


def test_form_suggests_password(client):
    _admin_login(client)
    page, password = _form(client)
    assert "Add a school" in page
    assert len(password) == 10


def test_create_school_and_owner_login(app, client):
    _admin_login(client)
    response, password = _create(client)
    assert response.status_code == 302
    assert "/admin/" in response.headers["Location"]

    dashboard = client.get("/admin/")
    assert dashboard.status_code == 200
    body = dashboard.get_data(as_text=True)
    assert "Green Valley Motor School" in body
    assert "asha@greenvalley.in" in body
    assert "Password" in body

    with app.app_context():
        school = School.query.filter_by(email="asha@greenvalley.in").one()
        owner = User.query.filter_by(email="asha@greenvalley.in").one()
        assert owner.role == "owner"
        assert owner.school_id == school.id
        assert school.student_seq == 0
        assert school.instructors == []
        assert school.vehicles == []
        assert school.courses[0]["name"] == "Car \u2014 Manual"
        assert school.courses[0]["pricePerSession"] == 400
        assert school.subscription_status == "trialing"
        assert owner.check_password(password)

    login = client.post(
        "/api/auth/login",
        json={"identifier": "asha@greenvalley.in", "password": password},
    )
    assert login.status_code == 200, login.get_json()
    token = login.get_json()["token"]

    bootstrap = client.get("/api/bootstrap", headers={"Authorization": "Bearer " + token})
    assert bootstrap.status_code == 200
    assert bootstrap.get_json()["students"] == []
    assert bootstrap.get_json()["school"]["name"] == "Green Valley Motor School"
    assert bootstrap.get_json()["school"]["courses"][0]["pricePerSession"] == 400

    update = client.patch(
        "/api/school",
        headers={"Authorization": "Bearer " + token},
        json={
            "instructors": ["Suresh Kale", "Neha Joshi"],
            "vehicles": ["MH12 XY 4321 ? Swift"],
            "courses": [
                {"name": "Scooter", "pricePerSession": 450, "defaultDays": 15}
            ],
        },
    )
    assert update.status_code == 200, update.get_json()
    school_data = update.get_json()["school"]
    assert school_data["instructors"] == ["Suresh Kale", "Neha Joshi"]
    assert school_data["vehicles"] == ["MH12 XY 4321 ? Swift"]
    assert school_data["courses"] == [
        {"name": "Scooter", "pricePerSession": 450, "defaultDays": 15}
    ]


def test_school_courses_are_validated(auth, client):
    empty = client.patch("/api/school", headers=auth, json={"courses": []})
    assert empty.status_code == 400
    assert "at least one course" in empty.get_json()["error"]["message"]

    missing_rate = client.patch(
        "/api/school",
        headers=auth,
        json={"courses": [{"name": "Scooter", "defaultDays": 15}]},
    )
    assert missing_rate.status_code == 400
    assert "Price per session" in missing_rate.get_json()["error"]["message"]

    duplicate = client.patch(
        "/api/school",
        headers=auth,
        json={
            "courses": [
                {"name": "Scooter", "pricePerSession": 450, "defaultDays": 15},
                {"name": "scooter", "pricePerSession": 500, "defaultDays": 20},
            ]
        },
    )
    assert duplicate.status_code == 400
    assert "must be unique" in duplicate.get_json()["error"]["message"]

    invalid_days = client.patch(
        "/api/school",
        headers=auth,
        json={
            "courses": [
                {"name": "Scooter", "pricePerSession": 450, "defaultDays": 1.5}
            ]
        },
    )
    assert invalid_days.status_code == 400
    assert "between 1 and 90" in invalid_days.get_json()["error"]["message"]


def test_create_rejects_duplicate_email(app, client):
    _admin_login(client)
    response, _ = _create(client, email="OWNER@sunrise.in", phone="9876543210")
    assert response.status_code == 400
    assert "already used" in response.get_data(as_text=True)
    with app.app_context():
        assert School.query.filter_by(email="owner@sunrise.in").count() == 1


def test_create_rejects_duplicate_phone(app, client):
    _admin_login(client)
    response, _ = _create(client, phone="+91 98220 01100")
    assert response.status_code == 400
    assert "already used" in response.get_data(as_text=True)
    with app.app_context():
        assert User.query.filter_by(email="asha@greenvalley.in").count() == 0


def test_create_validates_fields(app, client):
    _admin_login(client)
    response, _ = _create(client, name="", email="bad-email", phone="12345", password="short")
    assert response.status_code == 400
    body = response.get_data(as_text=True)
    assert "school name" in body
    assert "valid owner email" in body
    assert "10-digit" in body
    assert "at least 8" in body
    with app.app_context():
        assert User.query.filter_by(email="bad-email").count() == 0


def test_create_requires_csrf(app, client):
    _admin_login(client)
    page, password = _form(client)
    response = client.post(
        "/admin/schools/new",
        data={
            "name": "No CSRF School",
            "owner_name": "No CSRF",
            "email": "csrf@school.in",
            "phone": "9876543212",
            "trial_days": "14",
            "password": password,
        },
    )
    assert response.status_code == 400
    assert "form expired" in response.get_data(as_text=True)
    with app.app_context():
        assert School.query.filter_by(email="csrf@school.in").count() == 0


def test_reset_owner_password(app, client):
    _admin_login(client)
    _, old_password = _create(client)

    with app.app_context():
        school = School.query.filter_by(email="asha@greenvalley.in").one()
        school_id = school.id
        old_hash = school.users[0].password_hash

    page = client.get("/admin/schools/%d/password" % school_id).get_data(as_text=True)
    response = client.post(
        "/admin/schools/%d/password" % school_id,
        data={"csrf": _csrf(page), "password": "NewTempPass9"},
    )
    assert response.status_code == 302

    with app.app_context():
        owner = User.query.filter_by(email="asha@greenvalley.in").one()
        assert owner.password_hash != old_hash

    old_login = client.post(
        "/api/auth/login",
        json={"identifier": "asha@greenvalley.in", "password": old_password},
    )
    assert old_login.status_code == 401
    new_login = client.post(
        "/api/auth/login",
        json={"identifier": "asha@greenvalley.in", "password": "NewTempPass9"},
    )
    assert new_login.status_code == 200


def test_reset_password_rejects_short_password(app, client):
    _admin_login(client)
    _create(client)
    with app.app_context():
        school_id = School.query.filter_by(email="asha@greenvalley.in").one().id

    page = client.get("/admin/schools/%d/password" % school_id).get_data(as_text=True)
    response = client.post(
        "/admin/schools/%d/password" % school_id,
        data={"csrf": _csrf(page), "password": "short"},
    )
    assert response.status_code == 400
    assert "at least 8" in response.get_data(as_text=True)
