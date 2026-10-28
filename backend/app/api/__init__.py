from flask import Blueprint

api_bp = Blueprint("api", __name__, url_prefix="/api")

from . import auth_api, dashboard_api, school_api, sessions_api, students_api, subscription_api  # noqa: E402,F401
