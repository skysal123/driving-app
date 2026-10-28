import re
from datetime import date, datetime

from flask import request

from .utils import ApiError

PHONE = re.compile(r"^[6-9]\d{9}$")
TIME = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
UTR = re.compile(r"^\d{12}$")


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "invalid_json", "Send a JSON object with the request.")
    return data


def fail(field, message):
    raise ApiError(400, "validation_error", message, {field: message})


def text(data, field, label, min_len=1, max_len=120, required=True):
    value = data.get(field)
    if value is None:
        value = ""
    if not isinstance(value, str):
        fail(field, f"{label} must be text.")
    value = value.strip()
    if required and len(value) < min_len:
        fail(field, f"Enter {label.lower()}.")
    if len(value) > max_len:
        fail(field, f"{label} must be {max_len} characters or fewer.")
    return value


def phone(data, field="phone"):
    value = text(data, field, "Mobile number", 10, 20)
    cleaned = re.sub(r"[\s\-+]", "", value)
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    if not PHONE.match(cleaned):
        fail(field, "Enter a valid 10-digit Indian mobile number.")
    return cleaned


def timing(data, field="timing"):
    value = text(data, field, "Class timing", 4, 5)
    if not TIME.match(value):
        fail(field, "Use a 24-hour time like 07:00.")
    return value


def date_value(data, field, label, required=True):
    value = data.get(field)
    if value in (None, "") and not required:
        return None
    if not isinstance(value, str):
        fail(field, f"Choose {label.lower()}.")
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        fail(field, f"Choose a valid {label.lower()}.")


def integer(data, field, label, minimum=0, maximum=1000000, default=None):
    value = data.get(field, default)
    if value is None or value == "":
        if default is not None:
            return default
        fail(field, f"Enter {label.lower()}.")
    try:
        number = int(value)
    except (TypeError, ValueError):
        fail(field, f"Enter {label.lower()} as a whole number.")
    if number < minimum or number > maximum:
        fail(field, f"{label} must be between {minimum} and {maximum}.")
    return number


def boolean(data, field, default=False):
    value = data.get(field, default)
    return bool(value)


def choice(data, field, label, options, default=None):
    value = data.get(field, default)
    if value not in options:
        fail(field, f"Choose a valid {label.lower()}.")
    return value


def utr(data):
    value = text(data, "utr", "UTR number", 12, 12)
    value = re.sub(r"\s", "", value)
    if not UTR.match(value):
        fail("utr", "Enter the 12-digit UTR from your UPI app.")
    return value


def iso_today():
    return datetime.now().date().isoformat()
