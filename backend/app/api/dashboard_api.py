from flask import g, jsonify

from ..auth import protected
from ..services import dashboard
from . import api_bp


@api_bp.get("/dashboard")
@protected()
def get_dashboard():
    return jsonify(dashboard(g.school))
