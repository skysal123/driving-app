# DriveDesk

Driving-school management app for small Indian schools. Owners manage admissions, student documents, daily attendance with signatures, fees and subscription renewals from a phone-sized interface. Ships as a responsive web app, ready to wrap with Capacitor for iOS and Android.

## Status

- Prototype UI: complete (dashboard, admissions wizard, students, editable profiles, attendance with instructor attribution and multiple same-day sessions, classes, financial-period business reports with trainer/vehicle drill-downs, owner-managed instructors/vehicles, more/settings).
- Languages: English and Marathi with runtime switching (login screen and More menu); the choice is stored per device and user data (names, course names) is never translated.
- Backend: Flask API, SQLite for local development, PostgreSQL 16 for production.
- Auth: JWT for the school app, Flask session + CSRF for the super-admin panel.
- Subscription: ₹199/month after 14-day trial; 48h grace; manual 12-character UTR renewal; write endpoints return `402 subscription_expired`.
- Tests: 52 pytest cases passing; smoke tests cover multiple classes in one submission, same-day session numbering, editable student profiles, attendance, reports, reload and the Marathi translation layer.

## Project layout

```text
backend/            Flask application, API, admin panel, tests
  app/api/          JSON endpoints
  app/admin/        Super-admin blueprint
  app/templates/    Jinja templates for /admin
  app/seed.py       Demo school and sample students
  tests/            pytest suite (SQLite temporary database)
  wsgi.py           Gunicorn entry point
prototype/          Frontend (index.html, styles.css, js/)
deploy/             Dockerfile and Caddyfile
docker-compose.yml  Postgres + Flask/Gunicorn + Caddy
.env.example        Compose secrets template
```

## Local development

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
python -m flask --app wsgi init-db
python -m flask --app wsgi seed-demo
python -m flask --app wsgi run --debug
```

Open `http://127.0.0.1:5000/`. Flask serves the prototype from `prototype/` and the frontend detects the live API automatically. Opening `prototype/index.html` directly, or serving it statically, keeps the offline demo mode.

Demo school login: `owner@sunrise.in` / `demo1234`.

Create or reset the super-admin:

```powershell
python -m flask --app wsgi create-admin --email admin@yourdomain.in
python -m flask --app wsgi set-password owner@sunrise.in
```

Use `seed-demo --reset` only in development; it drops and rebuilds all tables.

## Tests

```powershell
cd backend
python -m pytest
```

Tests use a temporary SQLite database and do not touch `instance/drivedesk.db` or uploaded files.

## API summary

All school endpoints require `Authorization: Bearer <token>` unless noted. Errors use `{"error": {"code", "message", "fields"}}`; expired subscriptions return HTTP 402 `subscription_expired` on write routes.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Email/phone + password, returns JWT |
| GET | `/api/me` | Current user, school, subscription |
| POST | `/api/auth/logout` | Client-side token disposal |
| GET | `/api/bootstrap` | User, school, subscription and all students with sessions/payments |
| GET | `/api/dashboard` | Stats, today's schedule, upcoming classes, pending fees |
| GET | `/api/students?q=&status=&pending=1` | Student list and stats |
| POST | `/api/students` | Admission (photo + signature data URLs) |
| GET | `/api/students/<code>` | Student detail with sessions and payments |
| PATCH | `/api/students/<code>` | Update profile, course, schedule, fees, photo or licence |
| POST | `/api/students/<code>/sessions` | Attendance; `count` marks multiple present classes in one submission; auto-numbered per day, present requires a signature and a school instructor |
| GET | `/api/students/<code>/sessions` | Session history |
| POST | `/api/students/<code>/payments` | Record a fee payment |
| GET | `/api/sessions?scope=today\|upcoming\|history` | Cross-student class feed |
| GET/PATCH | `/api/school` | School profile (PATCH is owner-only) |
| GET | `/api/subscription` | Plan, grace window and write access |
| GET/POST | `/api/subscription/renewals` | Owner submits a 12-digit UTR |
| GET | `/api/health` | Liveness probe |

Media is uploaded as a base64 data URL (PNG or JPEG, 4 MB limit), re-encoded with Pillow and stored under `UPLOAD_FOLDER`. Responses contain signed, 7-day URLs served from `/media/<token>`.

## Admin panel

`/admin` lists pending renewals and every school with its subscription state. Approving a request extends access by 30 days from `max(now, ends_at)`. Admin actions are POST-only with a CSRF token; sessions expire after 8 hours.

Use **Add school** to provision a school and its owner in one step: enter the school and owner details, choose a trial length, then copy the suggested temporary password before submitting. Instructors and vehicles can be added as comma-separated lists. The owner signs in with their email or mobile number. **Password** on the schools table issues a new temporary password if the owner loses access; existing app sessions stay valid until their token expires.

## Docker deployment

The stack runs on **SQLite by default** (the database lives in the `sqlite` named volume at `/app/backend/instance/drivedesk.db`). PostgreSQL lines remain in `docker-compose.yml` and `.env.example` as comments — uncomment the `db` service, `DATABASE_URL`, the `pgdata` volume and the `db` depends_on block to switch back.

1. Point a domain's DNS `A` record at the VPS.
2. Install Docker Engine and the Compose plugin.
3. Copy `.env.example` to `.env` and set `DOMAIN`, `SECRET_KEY`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. (Postgres-style: also set `POSTGRES_*` and `DATABASE_URL`.)
4. Start the stack:

```bash
docker compose up -d --build
docker compose exec app flask --app wsgi create-admin --email admin@yourdomain.in
```

Caddy obtains and renews HTTPS certificates automatically. Only ports 80/443 are public; Gunicorn stays on the internal network. Uploads and the SQLite database live in named volumes.

Useful operations:

```bash
docker compose ps
docker compose logs -f app
docker compose exec app flask --app wsgi init-db

# SQLite backup: copy the database and uploads out of the volumes
docker compose cp app:/app/backend/instance/drivedesk.db ./backup-drivedesk.db
docker compose cp app:/data/uploads ./uploads-backup

# PostgreSQL backup (after switching back)
docker compose exec db pg_dump -U drivedesk drivedesk > backup.sql

docker compose down            # keep volumes
docker compose down -v         # destructive: removes database and uploads
```

SQLite is fine for a small number of schools. Move back to PostgreSQL when concurrency or multiple app workers start misbehaving, or before enabling row-level security.

## Before real schools onboard

- Set `SUBSCRIPTION_UPI_ID` in `.env` to the live payment handle. The renewal modal shows it, copies it, and opens the device UPI app with the amount pre-filled.
- Add owner self-service password change and token revocation on password reset; admin reset currently leaves existing JWTs valid until expiry.
- Add rate limiting on login and renewal submission (for example, Caddy or Flask-Limiter).
- Add PostgreSQL row-level security as defence in depth; the app already scopes every query by `school_id`.
- Automate encrypted database and upload backups, and test restores.
- Decide store billing: in-app sale of the ₹199 renewal invokes Google Play/Apple commission. Renewal outside the app (web portal) avoids it.
- Wrap with Capacitor, set `window.DRIVEDESK_API` to the public API origin, and handle offline photo/signature capture separately.
