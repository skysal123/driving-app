import logging
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_file, send_from_directory
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from .cli import register_cli
from .config import Config
from .extensions import db
from .media import MediaError, load_media_path
from .utils import ApiError


def create_app(config_overrides=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate_schema(app)

    from .admin import admin_bp
    from .api import api_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(admin_bp)
    register_cli(app)
    register_routes(app)
    register_errors(app)
    register_headers(app)

    return app


def migrate_schema(app):
    import json

    from sqlalchemy import inspect, text

    from .defaults import default_courses

    with app.app_context():
        inspector = inspect(db.engine)
        tables = set(inspector.get_table_names())
        added = []
        with db.engine.begin() as connection:
            if "student_sessions" in tables:
                columns = {
                    column["name"]
                    for column in inspector.get_columns("student_sessions")
                }
                if "instructor" not in columns:
                    connection.execute(
                        text(
                            "ALTER TABLE student_sessions "
                            "ADD COLUMN instructor VARCHAR(120) NOT NULL DEFAULT ''"
                        )
                    )
                    added.append("student_sessions.instructor")
                if "vehicle" not in columns:
                    connection.execute(
                        text(
                            "ALTER TABLE student_sessions "
                            "ADD COLUMN vehicle VARCHAR(120) NOT NULL DEFAULT ''"
                        )
                    )
                    added.append("student_sessions.vehicle")
                    if "student_id" in columns and "students" in tables:
                        student_columns = {
                            column["name"]
                            for column in inspector.get_columns("students")
                        }
                        if "vehicle" in student_columns:
                            connection.execute(
                                text(
                                    "UPDATE student_sessions SET vehicle = COALESCE(("
                                    "SELECT vehicle FROM students "
                                    "WHERE students.id = student_sessions.student_id"
                                    "), '') "
                                    "WHERE vehicle = ''"
                                )
                            )
                if "session_no" not in columns:
                    connection.execute(
                        text(
                            "ALTER TABLE student_sessions "
                            "ADD COLUMN session_no INTEGER NOT NULL DEFAULT 1"
                        )
                    )
                    added.append("student_sessions.session_no")
                    if {"student_id", "held_at"}.issubset(columns):
                        connection.execute(
                            text(
                                "WITH numbered AS ("
                                "SELECT id, ROW_NUMBER() OVER ("
                                "PARTITION BY student_id, DATE(held_at) "
                                "ORDER BY held_at, id"
                                ") AS rn FROM student_sessions"
                                ") "
                                "UPDATE student_sessions SET session_no = ("
                                "SELECT rn FROM numbered "
                                "WHERE numbered.id = student_sessions.id"
                                ")"
                            )
                        )

            if "schools" in tables:
                school_columns = {
                    column["name"] for column in inspector.get_columns("schools")
                }
                if "courses" not in school_columns:
                    connection.execute(
                        text(
                            "ALTER TABLE schools "
                            "ADD COLUMN courses JSON NOT NULL DEFAULT '[]'"
                        )
                    )
                    added.append("schools.courses")
                default_json = json.dumps(default_courses())
                if connection.dialect.name == "sqlite":
                    statement = text(
                        "UPDATE schools SET courses = :courses "
                        "WHERE courses IS NULL OR courses = '' OR courses = '[]'"
                    )
                else:
                    statement = text(
                        "UPDATE schools SET courses = CAST(:courses AS JSON) "
                        "WHERE courses IS NULL OR courses = '' OR courses = '[]'"
                    )
                connection.execute(statement, {"courses": default_json})

        for name in added:
            app.logger.info("Applied schema addition: %s", name)


def register_routes(app):
    frontend = Path(app.config["FRONTEND_FOLDER"])

    @app.get("/")
    def index():
        target = frontend / "index.html"
        if not target.is_file():
            abort(404)
        response = send_from_directory(frontend, "index.html")
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/media/<token>")
    def media_file(token):
        try:
            path = load_media_path(token)
        except MediaError as exc:
            status = 410 if "expired" in str(exc).lower() else 404
            return str(exc), status
        return send_file(path, conditional=True, max_age=3600)

    @app.get("/<path:filename>")
    def frontend_file(filename):
        if filename.startswith(("api/", "admin", "media/")):
            abort(404)
        target = frontend / filename
        if not target.is_file():
            abort(404)
        response = send_from_directory(frontend, filename, max_age=0)
        if filename.endswith((".js", ".css")):
            response.headers["Cache-Control"] = "no-cache"
        return response


def register_errors(app):
    @app.errorhandler(ApiError)
    def handle_api_error(exc):
        return jsonify(exc.to_dict()), exc.status

    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        if request.path.startswith("/api/"):
            code = (exc.name or "error").lower().replace(" ", "_")
            return (
                jsonify({"error": {"code": code, "message": exc.description, "fields": {}}}),
                exc.code,
            )
        return exc

    @app.errorhandler(Exception)
    def handle_unexpected(exc):
        if app.config.get("TESTING"):
            raise exc
        app.logger.exception("Unhandled error on %s", request.path)
        if request.path.startswith("/api/"):
            return (
                jsonify(
                    {
                        "error": {
                            "code": "server_error",
                            "message": "Something went wrong on our side. Try again.",
                            "fields": {},
                        }
                    }
                ),
                500,
            )
        return "Something went wrong.", 500


def register_headers(app):
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    allowed = [origin.strip() for origin in (app.config.get("CORS_ORIGINS") or "*").split(",") if origin.strip()]

    @app.after_request
    def add_headers(response):
        is_api = request.path.startswith("/api/")
        is_media = request.path.startswith("/media/")

        if is_api or is_media:
            origin = request.headers.get("Origin")
            if "*" in allowed:
                response.headers["Access-Control-Allow-Origin"] = "*"
            elif origin and origin in allowed:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers.add("Vary", "Origin")
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Max-Age"] = "86400"
            response.headers["Access-Control-Expose-Headers"] = "Content-Length"

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

        if is_media:
            response.headers.setdefault("Cross-Origin-Resource-Policy", "cross-origin")
        if is_api or request.path.startswith("/admin"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response
