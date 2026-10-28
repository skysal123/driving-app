from flask import g, jsonify

from ..auth import protected
from ..models import RenewalRequest
from ..services import request_renewal, subscription
from ..validation import body
from . import api_bp


@api_bp.get("/subscription")
@protected()
def get_subscription():
    return jsonify({"subscription": subscription(g.school)})


@api_bp.get("/subscription/renewals")
@protected()
def list_renewals():
    rows = (
        RenewalRequest.query.filter_by(school_id=g.school.id)
        .order_by(RenewalRequest.submitted_at.desc())
        .limit(12)
        .all()
    )
    return jsonify({"renewals": [row.to_dict() for row in rows], "subscription": subscription(g.school)})


@api_bp.post("/subscription/renewals")
@protected(owner=True)
def submit_renewal():
    request = request_renewal(g.school, body(), g.user)
    return (
        jsonify({"renewal": request.to_dict(), "subscription": subscription(g.school)}),
        201,
    )
