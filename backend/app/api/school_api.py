from flask import g, jsonify

from ..auth import protected
from ..extensions import db
from ..utils import ApiError
from ..validation import body, phone as parse_phone, text
from . import api_bp


def _string_list(data, field, label):
    value = data.get(field)
    if not isinstance(value, list):
        raise ApiError(400, "validation_error", f"{label} must be a list.", {field: f"Send {label.lower()} as a list."})
    if len(value) > 20:
        raise ApiError(400, "validation_error", f"Add at most 20 {label.lower()}.", {field: f"Add at most 20 {label.lower()}."})
    cleaned = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ApiError(400, "validation_error", f"Each {label[:-1].lower()} needs a name.", {field: f"Each {label[:-1].lower()} needs a name."})
        cleaned.append(item.strip()[:80])
    return cleaned


def _course_label(value, field, label, max_length):
    if not isinstance(value, str) or not value.strip():
        message = f"{label} is required."
        raise ApiError(400, "validation_error", message, {field: message})
    value = value.strip()
    if len(value) > max_length:
        message = f"{label} must be {max_length} characters or fewer."
        raise ApiError(400, "validation_error", message, {field: message})
    return value


def _course_number(value, field, label, minimum, maximum):
    if isinstance(value, bool):
        value = None
    if isinstance(value, float) and not value.is_integer():
        value = None
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = None
    if number is None or number < minimum or number > maximum:
        message = f"{label} must be between {minimum} and {maximum}."
        raise ApiError(400, "validation_error", message, {field: message})
    return number


def _courses(data):
    value = data.get("courses")
    field = "courses"
    if not isinstance(value, list):
        message = "Courses must be a list."
        raise ApiError(400, "validation_error", message, {field: message})
    if not value:
        message = "Add at least one course."
        raise ApiError(400, "validation_error", message, {field: message})
    if len(value) > 12:
        message = "Add at most 12 courses."
        raise ApiError(400, "validation_error", message, {field: message})

    cleaned = []
    course_names = set()
    for course in value:
        if not isinstance(course, dict):
            message = "Each course must be an object."
            raise ApiError(400, "validation_error", message, {field: message})
        name = _course_label(course.get("name"), field, "Course name", 60)
        key = name.casefold()
        if key in course_names:
            message = f"Course names must be unique. '{name}' is repeated."
            raise ApiError(400, "validation_error", message, {field: message})
        course_names.add(key)
        price_per_session = _course_number(
            course.get("pricePerSession") if "pricePerSession" in course else course.get("price_per_session"),
            field,
            "Price per session",
            1,
            100000,
        )
        default_days = _course_number(
            course.get("defaultDays") if "defaultDays" in course else course.get("days") or course.get("default_days"),
            field,
            "Default sessions",
            1,
            90,
        )
        cleaned.append(
            {
                "name": name,
                "pricePerSession": price_per_session,
                "defaultDays": default_days,
            }
        )

    return cleaned


@api_bp.get("/school")
@protected()
def get_school():
    return jsonify({"school": g.school.to_dict()})


@api_bp.patch("/school")
@protected(owner=True, subscription=True)
def update_school():
    data = body()
    school = g.school

    if "name" in data:
        school.name = text(data, "name", "School name", 2, 120)
    if "owner" in data:
        school.owner_name = text(data, "owner", "Owner name", 2, 120)
    if "phone" in data:
        school.phone = parse_phone(data)
    if "email" in data:
        school.email = text(data, "email", "Email", 5, 160)
    if "address" in data:
        school.address = text(data, "address", "Address", 3, 240)
    if "instructors" in data:
        school.instructors = _string_list(data, "instructors", "Instructors")
    if "vehicles" in data:
        school.vehicles = _string_list(data, "vehicles", "Vehicles")
    if "courses" in data:
        school.courses = _courses(data)

    if not data:
        raise ApiError(400, "empty_update", "Send at least one field to update.")

    db.session.commit()
    return jsonify({"school": school.to_dict()})
