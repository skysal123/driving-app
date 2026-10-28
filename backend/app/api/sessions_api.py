from flask import g, jsonify, request

from ..auth import protected
from ..services import get_student, history_rows, today_rows, upcoming_rows
from . import api_bp


@api_bp.get("/sessions")
@protected()
def sessions():
    scope = (request.args.get("scope") or "today").strip()
    if scope == "upcoming":
        rows = upcoming_rows(g.school)
    elif scope == "history":
        try:
            limit = min(200, max(1, int(request.args.get("limit", "60"))))
        except ValueError:
            limit = 60
        rows = history_rows(g.school, limit)
    else:
        scope = "today"
        rows = today_rows(g.school)
    return jsonify({"scope": scope, "sessions": rows})


@api_bp.get("/students/<code>/sessions")
@protected()
def student_sessions(code):
    student = get_student(g.school, code)
    return jsonify({"sessions": [session.to_dict() for session in student.sessions]})
