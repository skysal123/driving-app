import math
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

UTC = timezone.utc


class ApiError(Exception):
    def __init__(self, status=400, code="bad_request", message="The request could not be completed.", fields=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.fields = fields or {}

    def to_dict(self):
        return {"error": {"code": self.code, "message": self.message, "fields": self.fields}}


def utcnow():
    return datetime.now(UTC).replace(tzinfo=None)


def iso_z(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value.isoformat()
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)
    return value.isoformat().replace("+00:00", "Z")


def naive_utc(value):
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(UTC).replace(tzinfo=None)
    return value


def school_zone(school):
    name = (school.timezone if school and school.timezone else "Asia/Kolkata") or "Asia/Kolkata"
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("Asia/Kolkata")


def school_now(school):
    return datetime.now(school_zone(school))


def local_day_bounds(day, tz):
    start = datetime.combine(day, time(0, 0), tzinfo=tz)
    end = start + timedelta(days=1)
    return naive_utc(start), naive_utc(end)


def combine_local(day, hhmm, tz):
    parts = str(hhmm or "07:00").split(":")
    hour = int(parts[0]) if parts and parts[0].isdigit() else 7
    minute = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    local = datetime.combine(day, time(hour, minute), tzinfo=tz)
    return naive_utc(local)


def subscription_payload(school, price, grace_hours, upi_id="drivedesk@upi"):
    ends = school.subscription_ends_at
    now = utcnow()
    grace_end = ends + timedelta(hours=grace_hours) if ends else now

    if ends and ends > now:
        state = "trialing" if school.subscription_status in {"trialing", "trial"} else "active"
        can_write = True
    elif grace_end > now:
        state = "grace"
        can_write = True
    else:
        state = "expired"
        can_write = False

    days_left = max(0, math.ceil((ends - now).total_seconds() / 86400)) if ends and ends > now else 0

    return {
        "plan": school.subscription_plan,
        "status": school.subscription_status,
        "state": state,
        "endsAt": iso_z(ends),
        "graceEndsAt": iso_z(grace_end),
        "price": price,
        "upiId": upi_id,
        "daysLeft": days_left,
        "canWrite": can_write,
    }
