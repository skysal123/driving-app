FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend
COPY prototype ./prototype

RUN mkdir -p /app/backend/instance /data/uploads \
    && chown -R app:app /app /data

USER app
WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)" || exit 1

# SQLite mode (default): single worker so concurrent gunicorn processes
# never contend on the SQLite write lock.
CMD ["sh", "-c", "flask --app wsgi init-db && exec gunicorn --bind 0.0.0.0:8000 --workers 1 --threads 8 --timeout 60 --access-logfile - --error-logfile - wsgi:app"]

# PostgreSQL mode: restore this line (and docker-compose db service) instead.
# CMD ["sh", "-c", "flask --app wsgi init-db && exec gunicorn --bind 0.0.0.0:8000 --workers 3 --threads 4 --timeout 60 --access-logfile - --error-logfile - wsgi:app"]
