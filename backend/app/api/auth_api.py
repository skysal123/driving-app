from flask import g, jsonify

from ..auth import find_user, issue_token, protected
from ..extensions import db
from ..services import bootstrap, subscription
from ..utils import ApiError
from ..validation import body, text
from . import api_bp


@api_bp.post("/auth/login")
def login():
    data = body()
    identifier = text(data, "identifier", "Email or mobile", 3, 160)
    password = text(data, "password", "Password", 1, 128)

    user = find_user(identifier)
    if not user or not user.is_active or not user.check_password(password):
        raise ApiError(401, "invalid_credentials", "Incorrect email, mobile number or password.")
    if user.role == "superadmin":
        raise ApiError(403, "admin_portal", "Use the DriveDesk admin portal to sign in.")
    if not user.school:
        raise ApiError(403, "school_required", "This account is not linked to a school.")

    return jsonify(
        {
            "token": issue_token(user),
            "user": user.to_dict(),
            "school": user.school.to_dict(),
            "subscription": subscription(user.school),
        }
    )


@api_bp.get("/me")
@protected()
def me():
    return jsonify(
        {
            "user": g.user.to_dict(),
            "school": g.school.to_dict(),
            "subscription": subscription(g.school),
        }
    )


@api_bp.post("/auth/logout")
def logout():
    return "", 204


@api_bp.get("/bootstrap")
@protected()
def bootstrap_data():
    return jsonify(bootstrap(g.school, g.user))


@api_bp.get("/health")
def health():
    db.session.execute(db.select(1))
    return jsonify({"status": "ok"})

