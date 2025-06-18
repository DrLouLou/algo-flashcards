# algo-flashcards
Learn algorithms the most efficient way

## Project Structure

- `backend/` — Django backend (API, admin, models, management commands)
- `frontend/algo-flashcards/` — React frontend (SPA, Vite, Tailwind)
- `docs/` — Documentation
- `data/` — Fixtures/sample data
- `.pre-commit-config.yaml` — Pre-commit hooks for code quality
- `docker-compose.yml` — Multi-service orchestration

---

## 🚀 Quick Start: Local Development

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for backend & database)
- [Node.js 20+](https://nodejs.org/) and [npm](https://www.npmjs.com/) (for frontend)
- Python 3.12+ (optional, for local backend dev)

### 2. Environment Setup
- Copy `.env.example` files to `.env` in both `backend/` and `frontend/algo-flashcards/` and fill in any secrets (see team lead for API keys).

---

## 🐘 Backend & Database Setup (Docker)

### 3. Start Backend & Database
```zsh
if change in backend do:
  docker-compose down
  docker-compose build
regardless do: 
  docker compose up backend db
```
- Backend API: http://localhost:8000
- Postgres DB: localhost:5432 (see backend/.env for credentials)

### 4. Run Database Migrations
```zsh
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

### 5. Import Anki Cards (Populate DB)
```zsh
# Import cards from backend/anki_cards.txt into the Starter Deck
# (This will clear and repopulate the Starter Deck)
docker compose exec backend python manage.py import_anki anki_cards.txt
```

### 5b. Backfill Starter Deck for Learn Mode
To ensure all users have UserCards for every card in the Starter Deck (so Learn mode works for everyone), run:
```zsh
docker compose exec backend python manage.py backfill_starter_usercards
```
This will create any missing UserCards for all users and all cards in the Starter Deck.

### 6. Create Django Superuser (Admin)
```zsh
docker compose exec backend python manage.py createsuperuser
```
- Follow the prompts to set username, email, and password.
- Log in at http://localhost:8000/admin with these credentials.

---

## 🐍 Backend & Database Setup (Local Python, No Docker)

If you prefer to run the backend and database locally (without Docker):

1. **Create and activate a virtual environment:**
   ```zsh
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install requirements:**
   ```zsh
   pip install -r requirements.txt -r requirements-dev.txt
   ```

3. **Remove the old SQLite database for a clean slate (optional):**
   ```zsh
   rm db.sqlite3
   ```

4. **Apply migrations:**
   ```zsh
   python manage.py migrate
   ```

5. **(Optional) Check the tables in your SQLite DB:**
   ```zsh
   sqlite3 db.sqlite3 ".tables"
   ```

6. **(Optional) Check the migration history:**
   ```zsh
   python manage.py showmigrations
   ```

7. **(Optional) Create a superuser for admin access:**
   ```zsh
   python manage.py createsuperuser
   ```

This sequence will give you a clean, working database and backend using your local Python environment.

---

## 🌐 Frontend Setup (Local)

### 7. Start Frontend Locally
```zsh
cd frontend/algo-flashcards
npm install
npm run dev
```
- Frontend: http://localhost:5173
- Ensure `VITE_API_BASE_URL` in `frontend/algo-flashcards/.env` is set to `http://localhost:8000/api`

---

## 🧹 Clean Database Setup & Check (Docker)

To start from a clean database and verify your Django DB formation in Docker:

1. **Stop all running containers (optional, but ensures a clean state):**
   ```zsh
   docker compose down
   ```

2. **Remove the old SQLite database (from your host, if you want a truly clean DB):**
   ```zsh
   rm backend/db.sqlite3
   ```

3. **Rebuild and start only the backend container:**
   ```zsh
   docker compose up --build -d backend
   ```

4. **Apply migrations inside the backend container:**
   ```zsh
   docker compose exec backend python manage.py migrate
   ```

5. **(Optional) Check the tables in your SQLite DB inside the container:**
   ```zsh
   docker compose exec backend sqlite3 db.sqlite3 ".tables"
   ```

6. **(Optional) Check the migration history:**
   ```zsh
   docker compose exec backend python manage.py showmigrations
   ```

7. **(Optional) Create a superuser for admin access:**
   ```zsh
   docker compose exec backend python manage.py createsuperuser
   ```

This sequence will remove any old DB, rebuild your backend, apply all migrations in a clean Docker environment, and let you inspect the DB and migration state.

---

## 🔄 How to Completely Reset Your Database (Docker)

[This section has been replaced by the new 'Clean Database Setup & Check (Docker)' instructions above.]

---

For more details, see `backend/README.md` and `docs/README.md`.
