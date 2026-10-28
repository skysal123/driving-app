import base64
import io

import pytest
from PIL import Image, ImageDraw

from app import create_app
from app.extensions import db
from app.seed import seed_demo


def image_data_url(fmt="PNG", size=(200, 80)):
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    draw.line((10, 60, 60, 20, 120, 50, 180, 25), fill="black", width=4)
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    mime = "png" if fmt == "PNG" else "jpeg"
    return f"data:image/{mime};base64," + base64.b64encode(buffer.getvalue()).decode()


@pytest.fixture
def app(tmp_path):
    application = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///" + str(tmp_path / "test.db"),
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
            "FRONTEND_FOLDER": str(tmp_path / "frontend"),
            "SECRET_KEY": "test-secret",
            "JWT_SECRET": "test-jwt-secret",
            "ADMIN_EMAIL": "admin@test.in",
            "ADMIN_PASSWORD": "adminpass123",
            "ADMIN_NAME": "Test Admin",
            "SUBSCRIPTION_PRICE": 199,
            "SUBSCRIPTION_GRACE_HOURS": 48,
            "SUBSCRIPTION_UPI_ID": "test@upi",
        }
    )
    with application.app_context():
        db.create_all()
        seed_demo()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def token(client):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "owner@sunrise.in", "password": "demo1234"},
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["token"]


@pytest.fixture
def auth(token):
    return {"Authorization": "Bearer " + token}


@pytest.fixture
def png():
    return image_data_url("PNG")


@pytest.fixture
def jpeg():
    return image_data_url("JPEG")


@pytest.fixture
def admission(png):
    return {
        "name": "Test Kumar",
        "phone": "9876500011",
        "address": "Kalyani Nagar, Pune",
        "type": "Car — Manual",
        "days": 12,
        "timing": "09:30",
        "instructor": "Ramesh Patil",
        "vehicle": "MH12 AB 1234 · Swift",
        "startDate": "2026-10-26",
        "total": 7000,
        "paid": 2000,
        "mode": "UPI",
        "licensePresent": True,
        "licenseNumber": "MH12 20260001111",
        "licenseExpiry": "2028-01-01",
        "agree": True,
        "signature": png,
    }
