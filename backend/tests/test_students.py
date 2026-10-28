from datetime import timedelta
from urllib.parse import urlsplit

from app.extensions import db
from app.models import School, Student, User
from app.utils import utcnow


def test_students_list_and_filters(client, auth):
    response = client.get("/api/students", headers=auth)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["students"]) == 8
    assert data["stats"]["active"] == 7
    assert data["stats"]["completed"] == 1
    assert data["stats"]["pending"] > 0

    pending = client.get("/api/students?pending=1", headers=auth).get_json()["students"]
    assert pending
    assert all(student["fees"]["balance"] > 0 for student in pending)

    search = client.get("/api/students?q=priya", headers=auth).get_json()["students"]
    assert len(search) == 1
    assert search[0]["name"] == "Priya Patil"

    completed = client.get("/api/students?status=completed", headers=auth).get_json()["students"]
    assert len(completed) == 1
    assert completed[0]["name"] == "Arjun Nair"


def test_admission_creates_student_and_payment(client, auth, admission, jpeg):
    admission["photo"] = jpeg
    response = client.post("/api/students", json=admission, headers=auth)
    assert response.status_code == 201, response.get_json()
    student = response.get_json()["student"]
    assert student["name"] == "Test Kumar"
    assert student["id"].startswith("STU-")
    assert student["fees"]["paid"] == 2000
    assert student["fees"]["balance"] == 5000
    assert student["status"] == "active"
    assert student["agreement"]["signed"] is True
    assert student["agreement"]["signature"].startswith("http")
    assert student["photo"].startswith("http")
    assert len(student["sessions"]) == 0

    listing = client.get("/api/students", headers=auth).get_json()
    assert len(listing["students"]) == 9
    assert listing["stats"]["total"] == 9

    media_path = urlsplit(student["photo"]).path
    media = client.get(media_path)
    assert media.status_code == 200
    assert media.data[:2] == b"\xff\xd8"

    signature_path = urlsplit(student["agreement"]["signature"]).path
    signature = client.get(signature_path)
    assert signature.status_code == 200
    assert signature.data[:4] == b"\x89PNG"


def test_admission_requires_signature_and_agreement(client, auth, admission):
    admission.pop("signature")
    response = client.post("/api/students", json=admission, headers=auth)
    assert response.status_code == 400
    assert "signature" in response.get_json()["error"]["fields"]

    admission["signature"] = "data:image/png;base64,AAAA"
    response = client.post("/api/students", json=admission, headers=auth)
    assert response.status_code == 400
    assert "signature" in response.get_json()["error"]["fields"]

    admission["signature"] = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    )
    admission["signature"] = "data:image/png;base64," + admission["signature"]
    admission["agree"] = False
    response = client.post("/api/students", json=admission, headers=auth)
    assert response.status_code == 400
    assert "agree" in response.get_json()["error"]["fields"]


def test_admission_validation(client, auth, admission):
    admission["phone"] = "12345"
    response = client.post("/api/students", json=admission, headers=auth)
    assert response.status_code == 400
    assert "phone" in response.get_json()["error"]["fields"]

    admission["phone"] = "9876500011"
    admission["days"] = 0
    response = client.post("/api/students", json=admission, headers=auth)
    assert response.status_code == 400
    assert "days" in response.get_json()["error"]["fields"]

    admission["days"] = 10
    admission["paid"] = 9000
    response = client.post("/api/students", json=admission, headers=auth)
    assert response.status_code == 400
    assert "paid" in response.get_json()["error"]["fields"]


def test_student_detail_and_patch(client, auth):
    detail = client.get("/api/students/STU-2026-001", headers=auth)
    assert detail.status_code == 200
    student = detail.get_json()["student"]
    assert student["name"] == "Rahul Sharma"
    assert len(student["sessions"]) == 11

    response = client.patch(
        "/api/students/STU-2026-001",
        json={"address": "New address, Pune", "timing": "06:45"},
        headers=auth,
    )
    assert response.status_code == 200
    updated = response.get_json()["student"]
    assert updated["address"] == "New address, Pune"
    assert updated["package"]["timing"] == "06:45"


def test_full_student_profile_patch(client, auth, png):
    response = client.patch(
        "/api/students/STU-2026-001",
        json={
            "name": "Rahul S. Sharma",
            "phone": "9876501234",
            "address": "FC Road, Pune",
            "type": "Two-wheeler",
            "days": 12,
            "startDate": "2026-01-15",
            "timing": "08:15",
            "instructor": "Meera Shinde",
            "vehicle": "Activa 6G",
            "total": 9500,
            "mode": "Card",
            "licensePresent": True,
            "licenseNumber": "MH12 20260001234",
            "licenseExpiry": "2028-04-30",
            "photo": png,
        },
        headers=auth,
    )
    assert response.status_code == 200, response.get_json()
    updated = response.get_json()["student"]
    assert updated["name"] == "Rahul S. Sharma"
    assert updated["phone"] == "9876501234"
    assert updated["address"] == "FC Road, Pune"
    assert updated["package"]["type"] == "Two-wheeler"
    assert updated["package"]["days"] == 12
    assert updated["package"]["timing"] == "08:15"
    assert updated["package"]["instructor"] == "Meera Shinde"
    assert updated["package"]["vehicle"] == "Activa 6G"
    assert updated["fees"]["total"] == 9500
    assert updated["fees"]["mode"] == "Card"
    assert updated["license"]["number"] == "MH12 20260001234"
    assert updated["license"]["expiry"] == "2028-04-30"
    assert updated["startDate"] == "2026-01-15"
    assert updated["photo"].startswith("http")


def test_student_patch_rejects_inconsistent_course_and_fees(client, auth):
    too_short = client.patch(
        "/api/students/STU-2026-001",
        json={"days": 5},
        headers=auth,
    )
    assert too_short.status_code == 400
    assert "days" in too_short.get_json()["error"]["fields"]

    too_cheap = client.patch(
        "/api/students/STU-2026-001",
        json={"total": 100},
        headers=auth,
    )
    assert too_cheap.status_code == 400
    assert "total" in too_cheap.get_json()["error"]["fields"]


def test_increasing_duration_reactivates_completed_student(client, auth):
    response = client.patch(
        "/api/students/STU-2026-007",
        json={"days": 21},
        headers=auth,
    )
    assert response.status_code == 200, response.get_json()
    student = response.get_json()["student"]
    assert student["status"] == "active"
    assert student["nextClass"] is not None



def test_tenant_isolation(client, auth, app):
    with app.app_context():
        school = School(
            name="Second School",
            owner_name="Other Owner",
            phone="9812345678",
            email="other@school.in",
            subscription_ends_at=utcnow() + timedelta(days=20),
            subscription_status="trialing",
        )
        db.session.add(school)
        db.session.flush()
        user = User(school_id=school.id, name="Other Owner", email="other@school.in", phone="9812345678", role="owner")
        user.set_password("otherpass")
        db.session.add(user)
        db.session.commit()

    login = client.post("/api/auth/login", json={"identifier": "other@school.in", "password": "otherpass"})
    assert login.status_code == 200
    other_auth = {"Authorization": "Bearer " + login.get_json()["token"]}

    assert client.get("/api/students", headers=other_auth).get_json()["students"] == []
    assert client.get("/api/students/STU-2026-001", headers=other_auth).status_code == 404

    created = client.post(
        "/api/students",
        json={
            "name": "Other Student",
            "phone": "9812345678",
            "address": "Somewhere",
            "type": "Two-wheeler",
            "days": 10,
            "timing": "08:00",
            "startDate": "2026-10-26",
            "total": 5000,
            "paid": 1000,
            "agree": True,
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        },
        headers=other_auth,
    )
    assert created.status_code == 201
    code = created.get_json()["student"]["id"]
    assert code.startswith("STU-")

    owner_view = client.get(f"/api/students/{code}", headers=auth)
    assert owner_view.status_code == 404


def test_payments_update_balance(client, auth):
    before = client.get("/api/students/STU-2026-001", headers=auth).get_json()["student"]
    assert before["fees"]["balance"] == 4000

    response = client.post(
        "/api/students/STU-2026-001/payments",
        json={"amount": 500, "mode": "Cash"},
        headers=auth,
    )
    assert response.status_code == 201
    student = response.get_json()["student"]
    assert student["fees"]["paid"] == 5500
    assert student["fees"]["balance"] == 3500

    too_much = client.post(
        "/api/students/STU-2026-001/payments",
        json={"amount": 99999, "mode": "Cash"},
        headers=auth,
    )
    assert too_much.status_code == 400
    assert "amount" in too_much.get_json()["error"]["fields"]

    history = client.get("/api/students/STU-2026-001/sessions", headers=auth)
    assert history.status_code == 200


def test_unknown_student_returns_404(client, auth):
    response = client.get("/api/students/STU-0000-999", headers=auth)
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "student_not_found"


def test_media_rejects_bad_token(client):
    assert client.get("/media/not-a-real-token").status_code == 404
