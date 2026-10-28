from datetime import timedelta
from functools import wraps

import jwt
from flask import current_app, g, request

from .extensions import db
from .models import User
from .utils import ApiError, subscription_payload, utcnow


def issue_token(user):
    now = utcnow()
    payload = {
        "sub": str(user.id),
        "sid": user.school_id,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(days=current_app.config["JWT_TTL_DAYS"]),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def _bearer_token():
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    return header.split(" ", 1)[1].strip() or None


def _authenticate():
    token = _bearer_token()
    if not token:
        raise ApiError(401, "auth_required", "Sign in to continue.")

    try:
        payload = jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ApiError(401, "token_expired", "Your session has expired. Sign in again.") from exc
    except jwt.InvalidTokenError as exc:
        raise ApiError(401, "invalid_token", "Your session is not valid. Sign in again.") from exc

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError) as exc:
        raise ApiError(401, "invalid_token", "Your session is not valid. Sign in again.") from exc

    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        raise ApiError(401, "invalid_token", "This account is no longer active.")

    g.user = user
    g.school = user.school
    return user


def protected(owner=False, subscription=False):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = _authenticate()
            if not user.school:
                raise ApiError(403, "school_required", "Use a school account to access this resource.")
            if owner and user.role not in {"owner", "superadmin"}:
                raise ApiError(403, "owner_required", "Only the school owner can do this.")
            if subscription:
                state = subscription_payload(
                    user.school,
                    current_app.config["SUBSCRIPTION_PRICE"],
                    current_app.config["SUBSCRIPTION_GRACE_HOURS"],
                    current_app.config["SUBSCRIPTION_UPI_ID"],
                )
                if not state["canWrite"]:
                    raise ApiError(
                        402,
                        "subscription_expired",
                        "Your subscription has expired. Renew it to continue.",
                    )
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def find_user(identifier):
    key = (identifier or "").strip().lower()
    if not key:
        return None
    user = User.query.filter(db.func.lower(User.email) == key).first()
    if user:
        return user
    digits = "".join(ch for ch in key if ch.isdigit())
    if not digits:
        return None
    matches = User.query.filter(User.phone == digits[-10:]).limit(2).all()
    if len(matches) > 1:
        raise ApiError(400, "ambiguous_login", "That mobile number is linked to more than one school. Sign in with your email.")
    return matches[0] if matches else None
