import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")


def _bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _database_uri():
    raw = os.getenv("DATABASE_URL", "").strip()
    if not raw:
        return "sqlite:///" + str(BACKEND_DIR / "instance" / "drivedesk.db")
    if raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql+psycopg://", 1)
    if raw.startswith("postgresql://"):
        return raw.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET = os.getenv("JWT_SECRET") or SECRET_KEY
    JWT_TTL_DAYS = int(os.getenv("JWT_TTL_DAYS", "30"))

    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BACKEND_DIR / "instance" / "uploads"))
    FRONTEND_FOLDER = os.getenv("FRONTEND_FOLDER", str(ROOT_DIR / "prototype"))
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))
    MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(4 * 1024 * 1024)))
    MEDIA_URL_TTL = int(os.getenv("MEDIA_URL_TTL", str(7 * 24 * 3600)))

    SUBSCRIPTION_PRICE = int(os.getenv("SUBSCRIPTION_PRICE", "199"))
    SUBSCRIPTION_GRACE_HOURS = int(os.getenv("SUBSCRIPTION_GRACE_HOURS", "48"))
    SUBSCRIPTION_UPI_ID = os.getenv("SUBSCRIPTION_UPI_ID", "drivedesk@upi")
    DEFAULT_TIMEZONE = os.getenv("DEFAULT_TIMEZONE", "Asia/Kolkata")

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@drivedesk.in")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme123")
    ADMIN_NAME = os.getenv("ADMIN_NAME", "DriveDesk Admin")

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _bool("SESSION_COOKIE_SECURE", False)
    PERMANENT_SESSION_LIFETIME = int(os.getenv("ADMIN_SESSION_SECONDS", str(8 * 3600)))
