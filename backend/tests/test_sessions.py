from datetime import timedelta

from app.extensions import db
from app.models import StudentSession


def test_today_and_upcoming_scopes(client, auth):
    today = client.get("/api/sessions?scope=today", headers=auth)
    assert today.status_code == 200
    rows = today.get_json()["sessions"]
    assert len(rows) >= 5
    assert any(row["done"] for row in rows)
    assert any(not row["done"] for row in rows)

    upcoming = client.get("/api/sessions?scope=upcoming", headers=auth)
    assert upcoming.status_code == 200
    assert all(not row["done"] for row in upcoming.get_json()["sessions"])

    history = client.get("/api/sessions?scope=history&limit=5", headers=auth)
    assert history.status_code == 200
    assert len(history.get_json()["sessions"]) == 5


def test_mark_present_advances_next_class(client, auth, png):
    before = client.get("/api/students/STU-2026-003", headers=auth).get_json()["student"]
    response = client.post(
        "/api/students/STU-2026-003/sessions",
        json={"signature": png, "instructor": "Ramesh Patil", "notes": "Reverse parking", "location": True},
        headers=auth,
    )
    assert response.status_code == 201, response.get_json()
    data = response.get_json()
    assert data["session"]["status"] == "present"
    assert data["session"]["sessionNo"] == 1
    assert data["session"]["instructor"] == "Ramesh Patil"
    assert data["session"]["vehicle"] == before["package"]["vehicle"]
    assert data["session"]["signed"] is True
    assert data["session"]["signature"].startswith("http")
    assert data["nextClass"] != before["nextClass"]
    assert data["student"]["completedClasses"] == before["completedClasses"] + 1
    assert len(data["student"]["sessions"]) == before["sessions"].__len__() + 1


def test_mark_absent_does_not_need_signature(client, auth):
    response = client.post(
        "/api/students/STU-2026-005/sessions",
        json={"absent": True, "notes": "No show"},
        headers=auth,
    )
    assert response.status_code == 201
    session = response.get_json()["session"]
    assert session["status"] == "absent"
    assert session["sessionNo"] == 1
    assert session["signed"] is False


def test_multiple_sessions_same_day_are_numbered(client, auth, png):
    before = client.get("/api/students/STU-2026-003", headers=auth).get_json()["student"]
    first = client.post(
        "/api/students/STU-2026-003/sessions",
        json={"signature": png, "instructor": "Ramesh Patil"},
        headers=auth,
    )
    assert first.status_code == 201, first.get_json()
    first_data = first.get_json()

    second = client.post(
        "/api/students/STU-2026-003/sessions",
        json={"signature": png, "instructor": "Suresh Jadhav"},
        headers=auth,
    )
    assert second.status_code == 201, second.get_json()
    second_data = second.get_json()

    assert first_data["session"]["sessionNo"] == 1
    assert second_data["session"]["sessionNo"] == 2
    assert second_data["session"]["instructor"] == "Suresh Jadhav"
    assert second_data["student"]["completedClasses"] == before["completedClasses"] + 2
    assert second_data["nextClass"] == first_data["nextClass"]
    numbers = {row["sessionNo"] for row in second_data["student"]["sessions"]}
    assert {1, 2}.issubset(numbers)


def test_multiple_classes_in_one_submission(client, auth, png):
    before = client.get("/api/students/STU-2026-003", headers=auth).get_json()["student"]
    response = client.post(
        "/api/students/STU-2026-003/sessions",
        json={"signature": png, "instructor": "Ramesh Patil", "count": 3},
        headers=auth,
    )
    assert response.status_code == 201, response.get_json()
    data = response.get_json()

    assert len(data["sessions"]) == 3
    assert [row["sessionNo"] for row in data["sessions"]] == [1, 2, 3]
    assert all(row["status"] == "present" for row in data["sessions"])
    assert all(row["instructor"] == "Ramesh Patil" for row in data["sessions"])
    assert all(row["vehicle"] == before["package"]["vehicle"] for row in data["sessions"])
    assert len({row["signature"] for row in data["sessions"]}) == 1
    assert data["session"]["sessionNo"] == 3
    assert data["student"]["completedClasses"] == before["completedClasses"] + 3
    assert data["nextClass"] != before["nextClass"]


def test_batch_completes_course_and_rejects_extra_classes(client, auth, png, admission):
    admission["days"] = 2
    admission["name"] = "Batch Complete"
    created = client.post("/api/students", json=admission, headers=auth)
    assert created.status_code == 201
    code = created.get_json()["student"]["id"]

    too_many = client.post(
        f"/api/students/{code}/sessions",
        json={"signature": png, "instructor": "Ramesh Patil", "count": 3},
        headers=auth,
    )
    assert too_many.status_code == 400
    assert "count" in too_many.get_json()["error"]["fields"]

    response = client.post(
        f"/api/students/{code}/sessions",
        json={"signature": png, "instructor": "Ramesh Patil", "count": 2},
        headers=auth,
    )
    assert response.status_code == 201, response.get_json()
    data = response.get_json()
    assert len(data["sessions"]) == 2
    assert data["status"] == "completed"
    assert data["nextClass"] is None
    assert data["student"]["completedClasses"] == 2


def test_absent_then_present_same_day_share_numbering(client, auth, png):
    before = client.get("/api/students/STU-2026-005", headers=auth).get_json()["student"]
    absent = client.post(
        "/api/students/STU-2026-005/sessions",
        json={"absent": True, "notes": "No show"},
        headers=auth,
    )
    assert absent.status_code == 201
    absent_data = absent.get_json()
    assert absent_data["session"]["sessionNo"] == 1
    assert absent_data["nextClass"] == before["nextClass"]

    present = client.post(
        "/api/students/STU-2026-005/sessions",
        json={"signature": png, "instructor": "Ramesh Patil"},
        headers=auth,
    )
    assert present.status_code == 201, present.get_json()
    present_data = present.get_json()
    assert present_data["session"]["sessionNo"] == 2
    assert present_data["student"]["completedClasses"] == before["completedClasses"] + 1
    assert present_data["nextClass"] != before["nextClass"]


def test_session_number_resets_next_day(client, auth, png, app):
    first = client.post(
        "/api/students/STU-2026-003/sessions",
        json={"signature": png, "instructor": "Ramesh Patil"},
        headers=auth,
    )
    assert first.status_code == 201
    assert first.get_json()["session"]["sessionNo"] == 1

    with app.app_context():
        session = StudentSession.query.order_by(StudentSession.id.desc()).first()
        session.held_at = session.held_at - timedelta(days=1)
        db.session.commit()

    second = client.post(
        "/api/students/STU-2026-003/sessions",
        json={"signature": png, "instructor": "Ramesh Patil"},
        headers=auth,
    )
    assert second.status_code == 201, second.get_json()
    assert second.get_json()["session"]["sessionNo"] == 1


def test_present_requires_signature(client, auth, png):
    response = client.post(
        "/api/students/STU-2026-006/sessions",
        json={"instructor": "Ramesh Patil"},
        headers=auth,
    )
    assert response.status_code == 400
    assert "signature" in response.get_json()["error"]["fields"]


def test_present_requires_school_instructor(client, auth, png):
    response = client.post(
        "/api/students/STU-2026-006/sessions",
        json={"signature": png},
        headers=auth,
    )
    assert response.status_code == 400
    assert "instructor" in response.get_json()["error"]["fields"]

    response = client.post(
        "/api/students/STU-2026-006/sessions",
        json={"signature": png, "instructor": "Outside Instructor"},
        headers=auth,
    )
    assert response.status_code == 400
    assert "instructor" in response.get_json()["error"]["fields"]


def test_completed_student_cannot_mark_present(client, auth, png):
    response = client.post(
        "/api/students/STU-2026-007/sessions",
        json={"signature": png, "instructor": "Ramesh Patil"},
        headers=auth,
    )
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "student_completed"


def test_course_completes_on_last_class(client, auth, png, admission):
    admission["days"] = 1
    admission["name"] = "Last Class"
    created = client.post("/api/students", json=admission, headers=auth)
    assert created.status_code == 201
    code = created.get_json()["student"]["id"]

    response = client.post(
        f"/api/students/{code}/sessions",
        json={"signature": png, "instructor": "Ramesh Patil"},
        headers=auth,
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["status"] == "completed"
    assert data["nextClass"] is None
