from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db
from .media import media_url
from .utils import iso_z, utcnow


class School(db.Model):
    __tablename__ = "schools"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    owner_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(160), nullable=False)
    address = db.Column(db.String(240), nullable=False, default="")
    timezone = db.Column(db.String(64), nullable=False, default="Asia/Kolkata")
    instructors = db.Column(db.JSON, nullable=False, default=list)
    vehicles = db.Column(db.JSON, nullable=False, default=list)
    courses = db.Column(db.JSON, nullable=False, default=list)

    subscription_plan = db.Column(db.String(64), nullable=False, default="Premium trial")
    subscription_status = db.Column(db.String(24), nullable=False, default="trialing")
    subscription_ends_at = db.Column(db.DateTime, nullable=False)

    student_seq = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    users = db.relationship("User", back_populates="school", lazy="selectin")
    students = db.relationship("Student", back_populates="school", lazy="select")
    renewals = db.relationship("RenewalRequest", back_populates="school", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "owner": self.owner_name,
            "phone": self.phone,
            "email": self.email,
            "address": self.address,
            "timezone": self.timezone,
            "instructors": self.instructors or [],
            "vehicles": self.vehicles or [],
            "courses": self.courses or [],
            "createdAt": iso_z(self.created_at),
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), nullable=False, unique=True, index=True)
    phone = db.Column(db.String(20), nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(24), nullable=False, default="owner")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    school = db.relationship("School", back_populates="users")

    def set_password(self, value):
        self.password_hash = generate_password_hash(value)

    def check_password(self, value):
        return check_password_hash(self.password_hash, value)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
        }


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    code = db.Column(db.String(32), nullable=False, unique=True, index=True)

    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(300), nullable=False)
    photo_path = db.Column(db.String(255), nullable=True)

    course_type = db.Column(db.String(80), nullable=False)
    days = db.Column(db.Integer, nullable=False, default=20)
    timing = db.Column(db.String(5), nullable=False, default="07:00")
    instructor = db.Column(db.String(120), nullable=False, default="")
    vehicle = db.Column(db.String(120), nullable=False, default="")

    start_date = db.Column(db.Date, nullable=False)
    fee_total = db.Column(db.Integer, nullable=False, default=0)
    fee_mode = db.Column(db.String(16), nullable=False, default="Cash")

    license_present = db.Column(db.Boolean, nullable=False, default=False)
    license_number = db.Column(db.String(40), nullable=False, default="")
    license_expiry = db.Column(db.Date, nullable=True)

    status = db.Column(db.String(16), nullable=False, default="active")
    next_class_at = db.Column(db.DateTime, nullable=True)

    agreement_signed_at = db.Column(db.DateTime, nullable=True)
    agreement_signature_path = db.Column(db.String(255), nullable=True)
    agreement_version = db.Column(db.String(8), nullable=False, default="v1")

    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    school = db.relationship("School", back_populates="students")
    sessions = db.relationship(
        "StudentSession",
        back_populates="student",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="StudentSession.held_at.desc()",
    )
    payments = db.relationship(
        "Payment",
        back_populates="student",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="Payment.paid_at.desc()",
    )

    @property
    def paid_amount(self):
        return sum(int(p.amount or 0) for p in self.payments)

    @property
    def present_count(self):
        return sum(1 for s in self.sessions if s.status == "present")

    def to_dict(self, include_sessions=False):
        balance = max(0, int(self.fee_total or 0) - self.paid_amount)
        data = {
            "id": self.code,
            "dbId": self.id,
            "schoolId": self.school_id,
            "name": self.name,
            "phone": self.phone,
            "address": self.address,
            "photo": media_url(self.photo_path),
            "package": {
                "type": self.course_type,
                "days": self.days,
                "timing": self.timing,
                "instructor": self.instructor,
                "vehicle": self.vehicle,
            },
            "fees": {
                "total": int(self.fee_total or 0),
                "paid": self.paid_amount,
                "balance": balance,
                "mode": self.fee_mode,
            },
            "license": {
                "present": bool(self.license_present),
                "number": self.license_number or "",
                "expiry": self.license_expiry.isoformat() if self.license_expiry else "",
            },
            "agreement": {
                "signed": bool(self.agreement_signed_at),
                "signedAt": iso_z(self.agreement_signed_at),
                "signature": media_url(self.agreement_signature_path),
                "version": self.agreement_version,
            },
            "startDate": self.start_date.isoformat() if self.start_date else None,
            "createdAt": iso_z(self.created_at),
            "status": self.status,
            "nextClass": iso_z(self.next_class_at),
            "completedClasses": self.present_count,
        }
        if include_sessions:
            data["sessions"] = [session.to_dict() for session in self.sessions]
            data["payments"] = [payment.to_dict() for payment in self.payments]
        return data


class StudentSession(db.Model):
    __tablename__ = "student_sessions"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    held_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    status = db.Column(db.String(16), nullable=False, default="present")
    session_no = db.Column(db.Integer, nullable=False, default=1)
    instructor = db.Column(db.String(120), nullable=False, default="")
    vehicle = db.Column(db.String(120), nullable=False, default="")
    signed = db.Column(db.Boolean, nullable=False, default=False)
    signature_path = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.String(300), nullable=False, default="")
    location = db.Column(db.Boolean, nullable=False, default=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    student = db.relationship("Student", back_populates="sessions")

    def to_dict(self):
        return {
            "id": str(self.id),
            "date": iso_z(self.held_at),
            "status": self.status,
            "sessionNo": int(self.session_no or 1),
            "instructor": self.instructor or "",
            "vehicle": self.vehicle or "",
            "signed": bool(self.signed),
            "signature": media_url(self.signature_path),
            "notes": self.notes or "",
            "location": bool(self.location),
        }


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    amount = db.Column(db.Integer, nullable=False)
    mode = db.Column(db.String(16), nullable=False, default="Cash")
    note = db.Column(db.String(200), nullable=False, default="")
    paid_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    student = db.relationship("Student", back_populates="payments")

    def to_dict(self):
        return {
            "id": str(self.id),
            "amount": int(self.amount or 0),
            "mode": self.mode,
            "note": self.note or "",
            "paidAt": iso_z(self.paid_at),
        }


class RenewalRequest(db.Model):
    __tablename__ = "renewal_requests"
    __table_args__ = (db.UniqueConstraint("school_id", "utr", name="uq_renewal_school_utr"),)

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    utr = db.Column(db.String(12), nullable=False, index=True)
    amount = db.Column(db.Integer, nullable=False)
    months = db.Column(db.Integer, nullable=False, default=1)
    status = db.Column(db.String(16), nullable=False, default="pending", index=True)
    note = db.Column(db.String(240), nullable=False, default="")
    submitted_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    school = db.relationship("School", back_populates="renewals")

    def to_dict(self):
        return {
            "id": self.id,
            "utr": self.utr,
            "amount": int(self.amount),
            "months": self.months,
            "status": self.status,
            "note": self.note,
            "submittedAt": iso_z(self.submitted_at),
            "reviewedAt": iso_z(self.reviewed_at),
            "school": {"id": self.school.id, "name": self.school.name} if self.school else None,
        }
