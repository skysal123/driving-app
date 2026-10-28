import json
import sqlite3

from sqlalchemy import inspect, text

from app import create_app
from app.extensions import db


def test_migration_adds_instructor_to_legacy_sessions(tmp_path):
    database = tmp_path / "legacy.db"
    connection = sqlite3.connect(database)
    connection.execute(
        "CREATE TABLE student_sessions ("
        "id INTEGER PRIMARY KEY, school_id INTEGER NOT NULL)"
    )
    connection.commit()
    connection.close()

    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///" + str(database),
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
            "FRONTEND_FOLDER": str(tmp_path / "frontend"),
        }
    )

    with app.app_context():
        columns = {column["name"] for column in inspect(db.engine).get_columns("student_sessions")}

    assert "instructor" in columns
    assert "session_no" in columns
    assert "vehicle" in columns


def test_migration_numbers_existing_sessions_per_day(tmp_path):
    database = tmp_path / "legacy_sessions.db"
    connection = sqlite3.connect(database)
    connection.execute(
        "CREATE TABLE student_sessions ("
        "id INTEGER PRIMARY KEY, school_id INTEGER NOT NULL, "
        "student_id INTEGER NOT NULL, held_at DATETIME NOT NULL)"
    )
    connection.executemany(
        "INSERT INTO student_sessions (id, school_id, student_id, held_at) "
        "VALUES (?, ?, ?, ?)",
        [
            (1, 1, 1, "2026-10-20 07:00:00"),
            (2, 1, 1, "2026-10-20 10:00:00"),
            (3, 1, 1, "2026-10-21 07:00:00"),
            (4, 1, 2, "2026-10-20 08:00:00"),
        ],
    )
    connection.commit()
    connection.close()

    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///" + str(database),
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
            "FRONTEND_FOLDER": str(tmp_path / "frontend"),
        }
    )

    with app.app_context():
        rows = db.session.execute(
            text("SELECT id, session_no FROM student_sessions ORDER BY id")
        ).all()

    assert [(row[0], row[1]) for row in rows] == [(1, 1), (2, 2), (3, 1), (4, 1)]


def test_migration_backfills_vehicle_from_student(tmp_path):
    database = tmp_path / "legacy_vehicles.db"
    connection = sqlite3.connect(database)
    connection.execute(
        "CREATE TABLE students ("
        "id INTEGER PRIMARY KEY, vehicle VARCHAR(120) NOT NULL DEFAULT '')"
    )
    connection.execute(
        "CREATE TABLE student_sessions ("
        "id INTEGER PRIMARY KEY, school_id INTEGER NOT NULL, "
        "student_id INTEGER NOT NULL, held_at DATETIME NOT NULL)"
    )
    connection.executemany(
        "INSERT INTO students (id, vehicle) VALUES (?, ?)",
        [(1, "MH12 AB 1234 - Swift"), (2, "Activa 6G")],
    )
    connection.executemany(
        "INSERT INTO student_sessions (id, school_id, student_id, held_at) "
        "VALUES (?, ?, ?, ?)",
        [
            (1, 1, 1, "2026-10-20 07:00:00"),
            (2, 1, 2, "2026-10-20 08:00:00"),
        ],
    )
    connection.commit()
    connection.close()

    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///" + str(database),
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
            "FRONTEND_FOLDER": str(tmp_path / "frontend"),
        }
    )

    with app.app_context():
        rows = db.session.execute(
            text("SELECT id, vehicle FROM student_sessions ORDER BY id")
        ).all()

    assert [(row[0], row[1]) for row in rows] == [
        (1, "MH12 AB 1234 - Swift"),
        (2, "Activa 6G"),
    ]


def test_migration_adds_courses_to_legacy_schools(tmp_path):
    database = tmp_path / "legacy_schools.db"
    connection = sqlite3.connect(database)
    connection.execute(
        "CREATE TABLE schools ("
        "id INTEGER PRIMARY KEY, name VARCHAR(120) NOT NULL)"
    )
    connection.execute("INSERT INTO schools (id, name) VALUES (1, 'Legacy School')")
    connection.commit()
    connection.close()

    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///" + str(database),
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
            "FRONTEND_FOLDER": str(tmp_path / "frontend"),
        }
    )

    with app.app_context():
        columns = {column["name"] for column in inspect(db.engine).get_columns("schools")}
        row = db.session.execute(text("SELECT courses FROM schools WHERE id = 1")).one()

    assert "courses" in columns
    courses = json.loads(row[0])
    assert courses[0]["name"] == "Car \u2014 Manual"
    assert courses[0]["pricePerSession"] == 400
