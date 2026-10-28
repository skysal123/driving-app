from datetime import timedelta

from flask import g, jsonify, request

from ..auth import protected
from ..extensions import db
from ..media import MediaError, save_image
from ..services import PAYMENT_MODES, add_payment, compute_stats, create_student, get_student, mark_attendance
from ..utils import ApiError, combine_local, iso_z, school_now, school_zone
from ..validation import (
    body,
    boolean,
    choice,
    date_value,
    fail,
    integer,
    phone as parse_phone,
    text,
    timing as parse_timing,
)
from . import api_bp


def _filtered_students(school):
    from ..models import Student

    query = Student.query.filter_by(school_id=school.id)
    status = (request.args.get("status") or "").strip()
    if status in {"active", "completed"}:
        query = query.filter(Student.status == status)
    if request.args.get("pending") == "1":
        students = [s for s in query.order_by(Student.created_at.desc()).all() if s.paid_amount < s.fee_total]
        return students

    students = query.order_by(Student.created_at.desc()).all()
    search = (request.args.get("q") or "").strip().lower()
    if search:
        students = [
            s
            for s in students
            if search in s.name.lower() or search in s.phone or search in s.code.lower()
        ]
    return students


@api_bp.get("/students")
@protected()
def list_students():
    students = _filtered_students(g.school)
    return jsonify(
        {
            "students": [student.to_dict() for student in students],
            "stats": compute_stats(g.school),
        }
    )


@api_bp.post("/students")
@protected(subscription=True)
def create():
    student = create_student(g.school, body(), g.user)
    return jsonify({"student": student.to_dict(include_sessions=True)}), 201


@api_bp.get("/students/<code>")
@protected()
def detail(code):
    student = get_student(g.school, code)
    return jsonify({"student": student.to_dict(include_sessions=True)})


@api_bp.patch("/students/<code>")
@protected(subscription=True)
def update(code):
    student = get_student(g.school, code)
    data = body()

    if "name" in data:
        student.name = text(data, "name", "Student name", 2, 80)
    if "phone" in data:
        student.phone = parse_phone(data)
    if "address" in data:
        student.address = text(data, "address", "Address", 3, 300)
    if "type" in data:
        student.course_type = text(data, "type", "Course", 2, 60)
    if "startDate" in data:
        student.start_date = date_value(data, "startDate", "start date")
    if "timing" in data:
        student.timing = parse_timing(data)
    if "instructor" in data:
        student.instructor = text(data, "instructor", "Instructor", 0, 120, required=False)
    if "vehicle" in data:
        student.vehicle = text(data, "vehicle", "Vehicle", 0, 120, required=False)
    if "total" in data:
        total = integer(data, "total", "Total course fee", 1, 1000000)
        if total < student.paid_amount:
            fail("total", f"Total fee cannot be less than the {student.paid_amount} already paid.")
        student.fee_total = total
    if "mode" in data:
        student.fee_mode = choice(data, "mode", "payment mode", PAYMENT_MODES, student.fee_mode or "Cash")
    if "licensePresent" in data:
        student.license_present = boolean(data, "licensePresent")
        if student.license_present:
            student.license_number = text(data, "licenseNumber", "Licence number", 3, 40)
            student.license_expiry = date_value(data, "licenseExpiry", "licence expiry", required=False)
        else:
            student.license_number = ""
            student.license_expiry = None
    if data.get("photo"):
        try:
            student.photo_path = save_image(data.get("photo"), g.school.id, "photo")
        except MediaError as exc:
            fail("photo", str(exc))

    if "days" in data:
        days = integer(data, "days", "Number of classes", 1, 90)
        if days < student.present_count:
            fail("days", f"Course length cannot be less than the {student.present_count} classes already completed.")
        student.days = days
        if student.present_count >= days:
            student.status = "completed"
            student.next_class_at = None
        elif student.status == "completed":
            student.status = "active"
            tomorrow = school_now(g.school).date() + timedelta(days=1)
            student.next_class_at = combine_local(tomorrow, student.timing, school_zone(g.school))

    if not data:
        raise ApiError(400, "empty_update", "Send at least one field to update.")

    db.session.commit()
    return jsonify({"student": student.to_dict(include_sessions=True)})


@api_bp.post("/students/<code>/sessions")
@protected(subscription=True)
def attendance(code):
    student = get_student(g.school, code)
    sessions = mark_attendance(g.school, student, body(), g.user)
    return (
        jsonify(
            {
                "session": sessions[-1].to_dict(),
                "sessions": [session.to_dict() for session in sessions],
                "student": student.to_dict(include_sessions=True),
                "nextClass": iso_z(student.next_class_at),
                "status": student.status,
            }
        ),
        201,
    )


@api_bp.post("/students/<code>/payments")
@protected(subscription=True)
def payment(code):
    student = get_student(g.school, code)
    record = add_payment(g.school, student, body(), g.user)
    return jsonify({"payment": record.to_dict(), "student": student.to_dict(include_sessions=True)}), 201
