from datetime import timedelta

from flask import current_app
from sqlalchemy import func, select

from .extensions import db
from .media import MediaError, save_image
from .models import Payment, RenewalRequest, Student, StudentSession
from .utils import (
    ApiError,
    combine_local,
    iso_z,
    local_day_bounds,
    school_now,
    school_zone,
    subscription_payload,
    utcnow,
)
from .validation import (
    boolean,
    choice,
    date_value,
    fail,
    integer,
    phone as parse_phone,
    text,
    timing as parse_timing,
    utr as parse_utr,
)

PAYMENT_MODES = ["Cash", "UPI", "Card", "Other"]


def get_student(school, code):
    student = Student.query.filter_by(school_id=school.id, code=str(code)).first()
    if not student:
        raise ApiError(404, "student_not_found", "That student does not exist.")
    return student


def _save_image(data_url, school, kind, field):
    try:
        return save_image(data_url, school.id, kind)
    except MediaError as exc:
        fail(field, str(exc))


def _next_code(school):
    year = school_now(school).year
    seq = int(school.student_seq or 0)
    while True:
        seq += 1
        code = f"STU-{year}-{seq:03d}"
        exists = Student.query.filter_by(code=code).first()
        if not exists:
            school.student_seq = seq
            return code


def create_student(school, data, user):
    name = text(data, "name", "Student name", 2, 80)
    phone = parse_phone(data)
    address = text(data, "address", "Address", 3, 300)
    course_type = text(data, "type", "Course", 2, 60)
    days = integer(data, "days", "Number of classes", 1, 90)
    timing = parse_timing(data)
    start_date = date_value(data, "startDate", "start date")
    instructor = text(data, "instructor", "Instructor", 0, 120, required=False)
    vehicle = text(data, "vehicle", "Vehicle", 0, 120, required=False)
    total = integer(data, "total", "Total course fee", 1, 1000000)
    paid = integer(data, "paid", "Amount paid", 0, 1000000, default=0)
    if paid > total:
        fail("paid", "Paid amount cannot be more than the total fee.")
    mode = choice(data, "mode", "payment mode", PAYMENT_MODES, "Cash")

    license_present = boolean(data, "licensePresent")
    license_number = ""
    license_expiry = None
    if license_present:
        license_number = text(data, "licenseNumber", "Licence number", 3, 40)
        license_expiry = date_value(data, "licenseExpiry", "licence expiry", required=False)

    if not boolean(data, "agree"):
        fail("agree", "Accept the terms and conditions to continue.")

    signature = data.get("signature")
    signature_path = _save_image(signature, school, "signature", "signature")
    photo_path = None
    if data.get("photo"):
        photo_path = _save_image(data.get("photo"), school, "photo", "photo")

    student = Student(
        school_id=school.id,
        code=_next_code(school),
        name=name,
        phone=phone,
        address=address,
        photo_path=photo_path,
        course_type=course_type,
        days=days,
        timing=timing,
        instructor=instructor,
        vehicle=vehicle,
        start_date=start_date,
        fee_total=total,
        fee_mode=mode,
        license_present=license_present,
        license_number=license_number,
        license_expiry=license_expiry,
        status="active",
        next_class_at=combine_local(start_date, timing, school_zone(school)),
        agreement_signed_at=utcnow(),
        agreement_signature_path=signature_path,
        agreement_version="v1",
    )
    db.session.add(student)

    if paid > 0:
        student.payments.append(
            Payment(
                school_id=school.id,
                amount=paid,
                mode=mode,
                note="Admission payment",
                paid_at=utcnow(),
                created_by_id=user.id,
            )
        )

    db.session.commit()
    return student


def mark_attendance(school, student, data, user):
    absent = boolean(data, "absent")
    notes = text(data, "notes", "Notes", 0, 300, required=False)
    location = boolean(data, "location")

    day_start, day_end = local_day_bounds(school_now(school).date(), school_zone(school))
    same_day = (
        StudentSession.query.filter(
            StudentSession.school_id == school.id,
            StudentSession.student_id == student.id,
            StudentSession.held_at >= day_start,
            StudentSession.held_at < day_end,
        )
        .order_by(StudentSession.held_at.asc(), StudentSession.id.asc())
        .all()
    )
    session_no = max((session.session_no or 0) for session in same_day) + 1 if same_day else 1
    present_today = any(session.status == "present" for session in same_day)

    if absent:
        session = StudentSession(
            school_id=school.id,
            student_id=student.id,
            held_at=utcnow(),
            status="absent",
            session_no=session_no,
            vehicle=student.vehicle or "",
            signed=False,
            notes=notes,
            location=location,
            created_by_id=user.id,
        )
        student.sessions.append(session)
        db.session.commit()
        return [session]

    if student.status == "completed":
        raise ApiError(409, "student_completed", "This student has already completed the course.")

    count = integer(data, "count", "Number of classes", 1, 90, default=1)
    remaining = max(0, int(student.days) - student.present_count)
    if count > remaining:
        fail("count", f"Only {remaining} classes are left in this course.")

    instructor = text(data, "instructor", "Instructor", 1, 120)
    if instructor not in (school.instructors or []):
        fail("instructor", "Choose an instructor from your school list.")

    signature_path = _save_image(data.get("signature"), school, "signature", "signature")
    now = utcnow()
    created = []
    for offset in range(count):
        session = StudentSession(
            school_id=school.id,
            student_id=student.id,
            held_at=now,
            status="present",
            session_no=session_no + offset,
            instructor=instructor,
            vehicle=student.vehicle or "",
            signed=True,
            signature_path=signature_path,
            notes=notes,
            location=location,
            created_by_id=user.id,
        )
        student.sessions.append(session)
        created.append(session)

    if not present_today:
        base = student.next_class_at or now
        student.next_class_at = base + timedelta(days=1)
    if student.present_count >= student.days:
        student.status = "completed"
        student.next_class_at = None

    db.session.commit()
    return created


def add_payment(school, student, data, user):
    amount = integer(data, "amount", "Payment amount", 1, 1000000)
    balance = max(0, int(student.fee_total or 0) - student.paid_amount)
    if amount > balance:
        fail("amount", f"Payment cannot be more than the balance of Rs {balance}.")
    mode = choice(data, "mode", "payment mode", PAYMENT_MODES, student.fee_mode or "Cash")
    note = text(data, "note", "Note", 0, 200, required=False)

    payment = Payment(
        school_id=school.id,
        amount=amount,
        mode=mode,
        note=note,
        paid_at=utcnow(),
        created_by_id=user.id,
    )
    student.payments.append(payment)
    student.fee_mode = mode
    db.session.commit()
    return payment


def request_renewal(school, data, user):
    code = parse_utr(data)
    existing = RenewalRequest.query.filter_by(school_id=school.id, utr=code).first()
    if existing:
        raise ApiError(409, "utr_used", "That UTR has already been submitted for this school.")
    note = text(data, "note", "Note", 0, 240, required=False)

    request = RenewalRequest(
        school_id=school.id,
        utr=code,
        amount=current_app.config["SUBSCRIPTION_PRICE"],
        months=1,
        status="pending",
        note=note,
        submitted_by_id=user.id,
    )
    db.session.add(request)
    db.session.commit()
    return request


def approve_renewal(request, admin_user):
    if request.status != "pending":
        raise ApiError(409, "renewal_reviewed", "This renewal was already reviewed.")
    school = request.school
    base = school.subscription_ends_at if school.subscription_ends_at > utcnow() else utcnow()
    school.subscription_ends_at = base + timedelta(days=30 * max(1, request.months))
    school.subscription_status = "active"
    school.subscription_plan = "Premium"
    request.status = "approved"
    request.reviewed_at = utcnow()
    request.reviewed_by_id = admin_user.id
    db.session.commit()
    return request


def reject_renewal(request, admin_user, note=""):
    if request.status != "pending":
        raise ApiError(409, "renewal_reviewed", "This renewal was already reviewed.")
    request.status = "rejected"
    request.note = (note or request.note or "").strip()[:240]
    request.reviewed_at = utcnow()
    request.reviewed_by_id = admin_user.id
    db.session.commit()
    return request


def subscription(school):
    return subscription_payload(
        school,
        current_app.config["SUBSCRIPTION_PRICE"],
        current_app.config["SUBSCRIPTION_GRACE_HOURS"],
        current_app.config["SUBSCRIPTION_UPI_ID"],
    )


def today_rows(school):
    tz = school_zone(school)
    day = school_now(school).date()
    start, end = local_day_bounds(day, tz)
    rows = []
    seen = set()

    sessions = (
        StudentSession.query.join(Student)
        .filter(
            StudentSession.school_id == school.id,
            StudentSession.held_at >= start,
            StudentSession.held_at < end,
        )
        .order_by(StudentSession.held_at.asc())
        .all()
    )
    for session in sessions:
        seen.add(session.student_id)
        rows.append(
            {
                "at": iso_z(session.held_at),
                "done": True,
                "session": session.to_dict(),
                "student": session.student.to_dict(),
            }
        )

    upcoming = (
        Student.query.filter(
            Student.school_id == school.id,
            Student.status == "active",
            Student.next_class_at.isnot(None),
            Student.next_class_at >= start,
            Student.next_class_at < end,
        )
        .order_by(Student.next_class_at.asc())
        .all()
    )
    for student in upcoming:
        if student.id in seen:
            continue
        rows.append(
            {
                "at": iso_z(student.next_class_at),
                "done": False,
                "session": None,
                "student": student.to_dict(),
            }
        )

    rows.sort(key=lambda row: row["at"] or "")
    return rows


def upcoming_rows(school, days=8):
    tz = school_zone(school)
    today = school_now(school).date()
    _, end = local_day_bounds(today, tz)
    stop = end + timedelta(days=days)
    students = (
        Student.query.filter(
            Student.school_id == school.id,
            Student.status == "active",
            Student.next_class_at.isnot(None),
            Student.next_class_at > end,
            Student.next_class_at <= stop,
        )
        .order_by(Student.next_class_at.asc())
        .all()
    )
    return [
        {"at": iso_z(student.next_class_at), "done": False, "session": None, "student": student.to_dict()}
        for student in students
    ]


def history_rows(school, limit=60):
    sessions = (
        StudentSession.query.join(Student)
        .filter(StudentSession.school_id == school.id)
        .order_by(StudentSession.held_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {"at": iso_z(session.held_at), "done": True, "session": session.to_dict(), "student": session.student.to_dict()}
        for session in sessions
    ]


def compute_stats(school):
    students = Student.query.filter_by(school_id=school.id).all()
    active = sum(1 for s in students if s.status == "active")
    completed = sum(1 for s in students if s.status == "completed")
    pending = sum(max(0, int(s.fee_total or 0) - s.paid_amount) for s in students)
    pending_count = sum(1 for s in students if s.paid_amount < int(s.fee_total or 0))
    rows = today_rows(school)
    present = sum(1 for row in rows if row["session"] and row["session"]["status"] == "present")

    return {
        "active": active,
        "total": len(students),
        "completed": completed,
        "today": len(rows),
        "present": present,
        "absent": max(0, len(rows) - present),
        "pending": pending,
        "pendingCount": pending_count,
    }


def dashboard(school):
    stats = compute_stats(school)
    students = Student.query.filter_by(school_id=school.id).all()
    pending = sorted(
        [s for s in students if s.paid_amount < int(s.fee_total or 0)],
        key=lambda s: int(s.fee_total or 0) - s.paid_amount,
        reverse=True,
    )[:3]

    return {
        "stats": stats,
        "today": today_rows(school),
        "upcoming": upcoming_rows(school)[:20],
        "pendingStudents": [student.to_dict() for student in pending],
        "subscription": subscription(school),
    }


def bootstrap(school, user):
    students = Student.query.filter_by(school_id=school.id).order_by(Student.created_at.desc()).all()
    return {
        "user": user.to_dict(),
        "school": school.to_dict(),
        "subscription": subscription(school),
        "students": [student.to_dict(include_sessions=True) for student in students],
        "serverTime": iso_z(utcnow()),
    }


def pending_renewals():
    return (
        RenewalRequest.query.filter_by(status="pending")
        .order_by(RenewalRequest.submitted_at.asc())
        .all()
    )


def fee_report(school):
    total_billed = db.session.execute(
        select(func.coalesce(func.sum(Student.fee_total), 0)).where(Student.school_id == school.id)
    ).scalar_one()
    total_paid = db.session.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.school_id == school.id)
    ).scalar_one()
    return {"billed": int(total_billed), "collected": int(total_paid), "balance": max(0, int(total_billed) - int(total_paid))}
