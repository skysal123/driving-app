import click
from flask.cli import with_appcontext

from .extensions import db
from .models import User
from .seed import seed_demo


def register_cli(app):
    @app.cli.command("init-db")
    @with_appcontext
    def init_db():
        db.create_all()
        click.echo("Database tables are ready.")

    @app.cli.command("seed-demo")
    @click.option("--reset", is_flag=True, help="Drop every table and rebuild the demo school.")
    @with_appcontext
    def seed_command(reset):
        db.create_all()
        summary = seed_demo(reset=reset)
        if summary["created"]:
            click.echo("Demo school created.")
        else:
            click.echo("A school already exists; demo data was left untouched.")
        click.echo(
            "schools=%d students=%d users=%d"
            % (summary["schools"], summary["students"], summary["users"])
        )
        click.echo("Owner login: owner@sunrise.in / demo1234")

    @app.cli.command("create-admin")
    @click.option("--email", prompt="Admin email")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    @click.option("--name", default="DriveDesk Admin", show_default=True)
    @with_appcontext
    def create_admin(email, password, name):
        email = email.strip().lower()
        if len(password) < 8:
            raise click.ClickException("Use a password with at least 8 characters.")
        user = User.query.filter(db.func.lower(User.email) == email).first()
        if user:
            user.role = "superadmin"
            user.school_id = None
            user.is_active = True
            user.name = name or user.name
            user.set_password(password)
            click.echo("Updated the existing account as a super admin.")
        else:
            user = User(name=name, email=email, role="superadmin", school_id=None)
            user.set_password(password)
            db.session.add(user)
            click.echo("Created a new super admin.")
        db.session.commit()

    @app.cli.command("set-password")
    @click.argument("email")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    @with_appcontext
    def set_password(email, password):
        if len(password) < 8:
            raise click.ClickException("Use a password with at least 8 characters.")
        user = User.query.filter(db.func.lower(User.email) == email.strip().lower()).first()
        if not user:
            raise click.ClickException("No account found with that email.")
        user.set_password(password)
        db.session.commit()
        click.echo("Password updated for " + user.email)
