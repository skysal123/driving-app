import hmac
import re
import secrets
from datetime import timedelta
from functools import wraps

from flask import (
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

from sqlalchemy.exc import IntegrityError

from ..defaults import default_courses
from ..extensions import db
from ..models import RenewalRequest, School, User
from ..services import approve_renewal, pending_renewals, reject_renewal
from ..utils import ApiError, subscription_payload, utcnow
from . import admin_bp

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")
PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"


def _temp_password():
    return "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(10))


def _clean_phone(raw):
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return digits


def _raw_school_values(form):
    return {
        "name": (form.get("name") or "").strip(),
        "owner_name": (form.get("owner_name") or "").strip(),
        "email": (form.get("email") or "").strip().lower(),
        "phone": (form.get("phone") or "").strip(),
        "address": (form.get("address") or "").strip(),
        "trial_days": (form.get("trial_days") or "14").strip(),
        "password": form.get("password") or "",
    }


def _validate_school_form(values):
    errors = []
    if len(values["name"]) < 2:
        errors.append("Enter the school name.")
    if len(values["owner_name"]) < 2:
        errors.append("Enter the owner's name.")
    if not EMAIL_RE.match(values["email"]):
        errors.append("Enter a valid owner email address.")
    phone = _clean_phone(values["phone"])
    values["phone"] = phone
    if not PHONE_RE.match(phone):
        errors.append("Enter a valid 10-digit Indian mobile number for the owner.")
    if len(values["name"]) > 120:
        errors.append("School name must be 120 characters or fewer.")
    if len(values["owner_name"]) > 120:
        errors.append("Owner name must be 120 characters or fewer.")
    if len(values["email"]) > 160:
        errors.append("Owner email must be 160 characters or fewer.")
    if len(values["address"]) > 240:
        errors.append("Address must be 240 characters or fewer.")
    if len(values["password"]) < 8:
        errors.append("Use a temporary password with at least 8 characters.")
    if len(values["password"]) > 128:
        errors.append("Temporary password must be 128 characters or fewer.")
    try:
        days = int(values["trial_days"])
    except (TypeError, ValueError):
        days = 0
    if days < 1 or days > 90:
        errors.append("Trial length must be between 1 and 90 days.")
    values["trial_days"] = str(days or 14)
    return errors


def _owner_of(school):
    return next((user for user in school.users if user.role == "owner"), None)


def _admin_user():
    user_id = session.get("admin_id")
    if not user_id:
        return None
    user = db.session.get(User, user_id)
    if not user or not user.is_active or user.role != "superadmin":
        return None
    return user


def _csrf_token():
    token = session.get("csrf")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf"] = token
    return token


def _check_csrf():
    sent = request.form.get("csrf", "")
    expected = session.get("csrf", "")
    if not expected or not sent or not hmac.compare_digest(sent, expected):
        return False
    return True


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not _admin_user():
            return redirect(url_for("admin.login", next=request.path))
        return fn(*args, **kwargs)

    return wrapper


@admin_bp.get("/login")
def login():
    if _admin_user():
        return redirect(url_for("admin.dashboard"))
    return render_template("admin/login.html", csrf=_csrf_token(), error=None)


@admin_bp.post("/login")
def login_post():
    if not _check_csrf():
        return render_template("admin/login.html", csrf=_csrf_token(), error="Your form expired. Try again."), 400

    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    user = User.query.filter(db.func.lower(User.email) == email, User.role == "superadmin").first()
    if not user or not user.is_active or not user.check_password(password):
        return render_template("admin/login.html", csrf=_csrf_token(), error="Incorrect admin email or password."), 401

    session.clear()
    session["admin_id"] = user.id
    session.permanent = True
    flash("Signed in as " + user.name, "success")
    target = request.args.get("next") or url_for("admin.dashboard")
    if not target.startswith("/admin"):
        target = url_for("admin.dashboard")
    return redirect(target)


@admin_bp.post("/logout")
@admin_required
def logout():
    if not _check_csrf():
        return redirect(url_for("admin.dashboard"))
    session.clear()
    flash("Signed out.", "info")
    return redirect(url_for("admin.login"))


@admin_bp.get("")
@admin_bp.get("/")
@admin_required
def dashboard():
    renewals = pending_renewals()
    schools = School.query.order_by(School.created_at.desc()).all()
    summary = []
    for school in schools:
        summary.append(
            {
                "school": school,
                "owner": next((u for u in school.users if u.role == "owner"), None),
                "subscription": subscription_payload(
                    school,
                    current_app.config["SUBSCRIPTION_PRICE"],
                    current_app.config["SUBSCRIPTION_GRACE_HOURS"],
                ),
                "students": len(school.students),
            }
        )

    recent = (
        RenewalRequest.query.filter(RenewalRequest.status != "pending")
        .order_by(RenewalRequest.reviewed_at.desc())
        .limit(8)
        .all()
    )

    active_count = sum(1 for row in summary if row["subscription"]["canWrite"])

    return render_template(
        "admin/dashboard.html",
        csrf=_csrf_token(),
        admin=_admin_user(),
        renewals=renewals,
        schools=summary,
        recent=recent,
        price=current_app.config["SUBSCRIPTION_PRICE"],
        active_count=active_count,
        mrr=active_count * current_app.config["SUBSCRIPTION_PRICE"],
        grace_hours=current_app.config["SUBSCRIPTION_GRACE_HOURS"],
    )


@admin_bp.route("/schools/new", methods=["GET", "POST"])
@admin_required
def school_new():
    if request.method == "POST":
        values = _raw_school_values(request.form)
        errors = _validate_school_form(values)
        if not _check_csrf():
            errors.append("Your form expired. Try again.")

        if values["email"] and User.query.filter(db.func.lower(User.email) == values["email"]).first():
            errors.append("That owner email is already used by another account.")
        if values["phone"] and User.query.filter(User.phone == values["phone"]).first():
            errors.append("That mobile number is already used by another account.")

        if not errors:
            school = School(
                name=values["name"],
                owner_name=values["owner_name"],
                phone=values["phone"],
                email=values["email"],
                address=values["address"],
                timezone=current_app.config["DEFAULT_TIMEZONE"],
                courses=default_courses(),
                subscription_plan="Premium trial",
                subscription_status="trialing",
                subscription_ends_at=utcnow() + timedelta(days=int(values["trial_days"])),
            )
            owner = User(
                name=values["owner_name"],
                email=values["email"],
                phone=values["phone"],
                role="owner",
                is_active=True,
            )
            owner.set_password(values["password"])
            try:
                db.session.add(school)
                db.session.flush()
                owner.school_id = school.id
                db.session.add(owner)
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                errors.append("Could not create the school because the owner details are already in use.")
            else:
                flash(
                    "Created %s. Owner %s can sign in with the temporary password you set."
                    % (school.name, school.email),
                    "success",
                )
                return redirect(url_for("admin.dashboard"))

        return (
            render_template(
                "admin/school_form.html",
                csrf=_csrf_token(),
                admin=_admin_user(),
                values=values,
                errors=errors,
                mode="create",
            ),
            400,
        )

    values = {
        "name": "",
        "owner_name": "",
        "email": "",
        "phone": "",
        "address": "",
        "trial_days": "14",
        "password": _temp_password(),
    }
    return render_template(
        "admin/school_form.html",
        csrf=_csrf_token(),
        admin=_admin_user(),
        values=values,
        errors=[],
        mode="create",
    )


@admin_bp.route("/schools/<int:school_id>/password", methods=["GET", "POST"])
@admin_required
def owner_password(school_id):
    school = db.session.get(School, school_id)
    if not school:
        flash("That school was not found.", "error")
        return redirect(url_for("admin.dashboard"))
    owner = _owner_of(school)
    if not owner:
        flash("That school has no owner account.", "error")
        return redirect(url_for("admin.dashboard"))

    values = {"password": _temp_password()}
    errors = []
    if request.method == "POST":
        values["password"] = request.form.get("password") or ""
        if not _check_csrf():
            errors.append("Your form expired. Try again.")
        if len(values["password"]) < 8:
            errors.append("Use a temporary password with at least 8 characters.")
        if len(values["password"]) > 128:
            errors.append("Temporary password must be 128 characters or fewer.")

        if not errors:
            owner.set_password(values["password"])
            db.session.commit()
            flash(
                "Password updated for %s. Share the new temporary password securely." % owner.email,
                "success",
            )
            return redirect(url_for("admin.dashboard"))

        return (
            render_template(
                "admin/owner_password.html",
                csrf=_csrf_token(),
                admin=_admin_user(),
                school=school,
                owner=owner,
                values=values,
                errors=errors,
            ),
            400,
        )

    return render_template(
        "admin/owner_password.html",
        csrf=_csrf_token(),
        admin=_admin_user(),
        school=school,
        owner=owner,
        values=values,
        errors=errors,
    )


@admin_bp.post("/renewals/<int:renewal_id>/approve")
@admin_required
def approve(renewal_id):
    if not _check_csrf():
        flash("Your form expired. Try again.", "error")
        return redirect(url_for("admin.dashboard"))

    renewal = db.session.get(RenewalRequest, renewal_id)
    if not renewal:
        flash("That renewal request was not found.", "error")
        return redirect(url_for("admin.dashboard"))

    try:
        approve_renewal(renewal, _admin_user())
    except ApiError as exc:
        flash(exc.message, "error")
    else:
        flash("Approved %s for %s." % (renewal.utr, renewal.school.name), "success")
    return redirect(url_for("admin.dashboard"))


@admin_bp.post("/renewals/<int:renewal_id>/reject")
@admin_required
def reject(renewal_id):
    if not _check_csrf():
        flash("Your form expired. Try again.", "error")
        return redirect(url_for("admin.dashboard"))

    renewal = db.session.get(RenewalRequest, renewal_id)
    if not renewal:
        flash("That renewal request was not found.", "error")
        return redirect(url_for("admin.dashboard"))

    try:
        reject_renewal(renewal, _admin_user(), request.form.get("note", ""))
    except ApiError as exc:
        flash(exc.message, "error")
    else:
        flash("Rejected %s." % renewal.utr, "info")
    return redirect(url_for("admin.dashboard"))
