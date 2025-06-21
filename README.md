# Algo Flashcards — Developer Quick Start (2025)

## 🚀 Full Local Setup (Docker + NPM)

### 1. Prerequisites
- **Docker Desktop** (for backend & Postgres DB)
- **Node.js 20+** and **npm** (for frontend)
- (Optional) Python 3.12+ for advanced backend dev

### 2. Clone & Prepare Environment
```zsh
git clone https://github.com/your-org/algo-flashcards.git
cd algo-flashcards
cp backend/.env.example backend/.env
cp frontend/algo-flashcards/.env.example frontend/algo-flashcards/.env
# Edit secrets in .env files as needed
```

### 3. Start Backend & Database (Docker)
```zsh
docker compose up --build backend db
```
- Backend API: http://localhost:8000
- Postgres DB: localhost:5432 (see backend/.env for credentials)

### 4. Run Database Migrations
```zsh
docker compose exec backend python manage.py migrate
```

### 5. Prefill Data: Import Starter Deck & UserCards
```zsh
# Import Anki cards into the Starter Deck (clears/repopulates it)
docker compose exec backend python manage.py import_anki anki_cards.txt
# Backfill UserCards for all users (enables Learn mode)
docker compose exec backend python manage.py backfill_starter_usercards
```

### 6. Fix Layout for Starter Deck (Default CardType)
```zsh
docker compose exec backend python manage.py fix_starter_layout
```
This ensures the default card type always has the correct front/back layout for the UI.

### 7. Create Django Superuser (Admin)
```zsh
docker compose exec backend python manage.py createsuperuser
```
- Log in at http://localhost:8000/admin

---

## 🌐 Frontend Setup (React + Vite)

### 8. Install & Run Frontend
```zsh
cd frontend/algo-flashcards
npm install
npm run dev
```
- Frontend: http://localhost:5173
- Make sure `VITE_API_BASE_URL` in `.env` is set to `http://localhost:8000/api`

---

## 🧹 Clean Database Reset (Optional)
To start from a clean DB:
```zsh
docker compose down
rm backend/db.sqlite3  # or drop Postgres DB if using Postgres
# Then repeat steps 3–7 above
```

---

## 🛠️ Useful Management Commands
- **Import Anki cards:** `python manage.py import_anki anki_cards.txt`
- **Backfill UserCards:** `python manage.py backfill_starter_usercards`
- **Fix Starter Layout:** `python manage.py fix_starter_layout`

---

For more, see `backend/README.md`, `frontend/algo-flashcards/README.md`, and `docs/README.md`.

---

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

5. **(Optional) Check the migration history:**
   ```zsh
   docker compose exec backend python manage.py showmigrations
   ```

6. **(Optional) Create a superuser for admin access:**
   ```zsh
   docker compose exec backend python manage.py createsuperuser
   ```

This sequence will remove any old DB, rebuild your backend, apply all migrations in a clean Docker environment, and let you inspect the DB and migration state.
