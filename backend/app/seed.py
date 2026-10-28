from datetime import date, timedelta

from flask import current_app

from .defaults import default_courses
from .extensions import db
from .models import Payment, School, Student, StudentSession, User
from .utils import combine_local, school_now, school_zone, utcnow

SEED_STUDENTS = [
    {
        "name": "Rahul Sharma",
        "phone": "9822011234",
        "address": "12, Shivaji Nagar, Pune",
        "type": "Car — Manual",
        "days": 20,
        "timing": "07:00",
        "instructor": "Ramesh Patil",
        "vehicle": "MH12 AB 1234 · Swift",
        "total": 9000,
        "paid": 5000,
        "mode": "UPI",
        "license": ("MH12 20240001234", "2027-05-14"),
        "start": -20,
        "next": 1,
        "present": 11,
        "today": True,
        "last_days_ago": 1,
    },
    {
        "name": "Priya Patil",
        "phone": "9876543210",
        "address": "45, Kothrud, Pune",
        "type": "Car — Automatic",
        "days": 15,
        "timing": "08:30",
        "instructor": "Meera Shinde",
        "vehicle": "MH12 CD 5678 · i20",
        "total": 8000,
        "paid": 8000,
        "mode": "Cash",
        "license": ("MH12 20240005678", "2026-12-02"),
        "start": -14,
        "next": 1,
        "present": 7,
        "today": True,
        "last_days_ago": 1,
    },
    {
        "name": "Aman Verma",
        "phone": "9765432109",
        "address": "7, Baner, Pune",
        "type": "Car — Manual",
        "days": 20,
        "timing": "10:00",
        "instructor": "Ramesh Patil",
        "vehicle": "MH12 AB 1234 · Swift",
        "total": 8000,
        "paid": 4000,
        "mode": "UPI",
        "license": ("MH12 20240009999", "2028-01-19"),
        "start": -9,
        "next": 0,
        "present": 4,
        "last_days_ago": 1,
    },
    {
        "name": "Sneha Joshi",
        "phone": "9700112233",
        "address": "301, Grand View, Aundh, Pune",
        "type": "Car — Automatic",
        "days": 30,
        "timing": "11:30",
        "instructor": "Meera Shinde",
        "vehicle": "MH12 CD 5678 · i20",
        "total": 15000,
        "paid": 12000,
        "mode": "UPI",
        "license": ("MH12 20230002222", "2029-03-08"),
        "start": -16,
        "next": 0,
        "present": 12,
        "last_days_ago": 1,
    },
    {
        "name": "Vikram Singh",
        "phone": "9988776655",
        "address": "88, Hadapsar, Pune",
        "type": "Two-wheeler",
        "days": 15,
        "timing": "16:00",
        "instructor": "Anil Kumar",
        "vehicle": "Activa 6G · MH12 GH 3456",
        "total": 7000,
        "paid": 3000,
        "mode": "Cash",
        "license": None,
        "start": -6,
        "next": 0,
        "present": 3,
        "last_days_ago": 1,
    },
    {
        "name": "Neha Deshmukh",
        "phone": "9822334455",
        "address": "9, Viman Nagar, Pune",
        "type": "Car — Manual",
        "days": 10,
        "timing": "07:30",
        "instructor": "Suresh Jadhav",
        "vehicle": "MH12 EF 9012 · WagonR",
        "total": 5000,
        "paid": 5000,
        "mode": "UPI",
        "license": ("MH12 20240007777", "2028-08-21"),
        "start": -5,
        "next": 1,
        "present": 5,
        "last_days_ago": 1,
    },
    {
        "name": "Arjun Nair",
        "phone": "9811223344",
        "address": "22, Camp, Pune",
        "type": "Car — Manual",
        "days": 20,
        "timing": "09:00",
        "instructor": "Ramesh Patil",
        "vehicle": "MH12 AB 1234 · Swift",
        "total": 9000,
        "paid": 9000,
        "mode": "Card",
        "license": ("MH12 20230003333", "2027-10-11"),
        "start": -40,
        "next": None,
        "present": 20,
        "last_days_ago": 21,
        "completed": True,
    },
    {
        "name": "Pooja Kulkarni",
        "phone": "9899887766",
        "address": "5, Deccan Gymkhana, Pune",
        "type": "Car — Automatic",
        "days": 20,
        "timing": "09:00",
        "instructor": "Suresh Jadhav",
        "vehicle": "MH12 CD 5678 · i20",
        "total": 9000,
        "paid": 6000,
        "mode": "UPI",
        "license": ("MH12 20240004444", "2029-07-30"),
        "start": -8,
        "next": 2,
        "present": 8,
        "last_days_ago": 2,
    },
]


def _create_admin():
    email = current_app.config["ADMIN_EMAIL"].strip().lower()
    user = User.query.filter(db.func.lower(User.email) == email).first()
    if user:
        user.role = "superadmin"
        user.school_id = None
        user.is_active = True
        return user
    user = User(
        name=current_app.config["ADMIN_NAME"],
        email=email,
        phone=None,
        role="superadmin",
        school_id=None,
        is_active=True,
    )
    user.set_password(current_app.config["ADMIN_PASSWORD"])
    db.session.add(user)
    return user


def seed_demo(reset=False):
    if reset:
        db.drop_all()
        db.create_all()

    created = False
    if not School.query.first():
        school = School(
            name="Sunrise Driving School",
            owner_name="Aakash Salunke",
            phone="9822001100",
            email="owner@sunrise.in",
            address="FC Road, Pune, Maharashtra",
            timezone=current_app.config["DEFAULT_TIMEZONE"],
            instructors=["Ramesh Patil", "Suresh Jadhav", "Meera Shinde", "Anil Kumar"],
            vehicles=[
                "MH12 AB 1234 · Swift",
                "MH12 CD 5678 · i20",
                "MH12 EF 9012 · WagonR",
                "Activa 6G · MH12 GH 3456",
            ],
            courses=default_courses(),
            subscription_plan="Premium trial",
            subscription_status="trialing",
            subscription_ends_at=utcnow() + timedelta(days=12),
            student_seq=len(SEED_STUDENTS),
        )
        db.session.add(school)
        db.session.flush()

        owner = User(
            school_id=school.id,
            name=school.owner_name,
            email="owner@sunrise.in",
            phone=school.phone,
            role="owner",
        )
        owner.set_password("demo1234")
        db.session.add(owner)
        db.session.flush()

        tz = school_zone(school)
        today = school_now(school).date()
        year = today.year

        for index, spec in enumerate(SEED_STUDENTS, start=1):
            start_day = today + timedelta(days=spec["start"])
            created_at = combine_local(start_day, "06:50", tz)
            next_at = None
            if spec.get("next") is not None:
                next_at = combine_local(today + timedelta(days=spec["next"]), spec["timing"], tz)
            license_data = spec.get("license")

            student = Student(
                school_id=school.id,
                code=f"STU-{year}-{index:03d}",
                name=spec["name"],
                phone=spec["phone"],
                address=spec["address"],
                course_type=spec["type"],
                days=spec["days"],
                timing=spec["timing"],
                instructor=spec["instructor"],
                vehicle=spec["vehicle"],
                start_date=start_day,
                fee_total=spec["total"],
                fee_mode=spec["mode"],
                license_present=bool(license_data),
                license_number=license_data[0] if license_data else "",
                license_expiry=(date.fromisoformat(license_data[1]) if license_data else None),
                status="completed" if spec.get("completed") else "active",
                next_class_at=next_at,
                agreement_signed_at=created_at,
                agreement_version="v1",
                created_at=created_at,
            )
            db.session.add(student)
            db.session.flush()

            if spec["paid"] > 0:
                db.session.add(
                    Payment(
                        school_id=school.id,
                        student_id=student.id,
                        amount=spec["paid"],
                        mode=spec["mode"],
                        note="Admission payment",
                        paid_at=created_at + timedelta(minutes=10),
                        created_by_id=owner.id,
                    )
                )

            past_count = spec["present"] - (1 if spec.get("today") else 0)
            for offset in range(past_count):
                days_ago = spec["last_days_ago"] + (past_count - 1 - offset)
                held = combine_local(today - timedelta(days=days_ago), spec["timing"], tz)
                db.session.add(
                    StudentSession(
                        school_id=school.id,
                        student_id=student.id,
                        held_at=held,
                        status="present",
                        instructor=student.instructor,
                        vehicle=student.vehicle,
                        signed=True,
                        notes="",
                        location=False,
                        created_by_id=owner.id,
                    )
                )

            if spec.get("today"):
                held = combine_local(today, spec["timing"], tz)
                db.session.add(
                    StudentSession(
                        school_id=school.id,
                        student_id=student.id,
                        held_at=held,
                        status="present",
                        instructor=student.instructor,
                        vehicle=student.vehicle,
                        signed=True,
                        notes="",
                        location=False,
                        created_by_id=owner.id,
                    )
                )

        created = True

    _create_admin()
    db.session.commit()
    return {
        "created": created,
        "schools": School.query.count(),
        "students": Student.query.count(),
        "users": User.query.count(),
    }
