python manage.py makemigrations

Scans your models.py files for any changes to your database schema (new models, changed fields, removed fields, etc.).

Creates new “migration” files under each app’s migrations/ folder. Each migration is a small, versioned script (in Python) that describes exactly how to apply those model changes to your database.

Note: It doesn’t actually touch the database yet—just prepares the migration scripts.

python manage.py migrate

Looks at the migration scripts (including ones just created by makemigrations) and applies them, in order, to your database.

Creates or alters the actual tables, columns, indexes, constraints, etc., so that your database schema matches the current state of your Django models.

Also keeps an internal “migration history” table in the database so that Django knows which migrations have already been applied and which are still pending.

python manage.py createsuperuser

Interactive prompt that lets you create a new user account with superuser (admin) privileges.

You’ll be asked for a username, email, and password.

This account can log in to Django’s built-in admin site (/admin/) and has full permissions to view, add, change, or delete any model.

Typical Workflow in Context
You add or change a model in flashcards/models.py.

Run makemigrations → Django generates a new migration file like 0002_auto_20250506_1234.py.

Run migrate → that file’s instructions execute against your database.

If you haven’t already got an admin account, run createsuperuser → you can now log into http://localhost:5000/admin/ and manage your data.

## RUN AND TEST

# in backend/
uvicorn core.wsgi:application --reload --port 5000
# or
python manage.py runserver 0.0.0.0:8000