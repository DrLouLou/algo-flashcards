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

## 🛠️ Useful Database & Dev Commands

- **Load Sample Data (Fixtures):**
  ```zsh
  docker compose exec backend python manage.py loaddata data/fixtures/initial_data.json
  ```
- **Reset All Flashcards:**
  ```zsh
  docker compose exec backend python manage.py shell
  # Then in the shell:
  from flashcards.models import Card
  Card.objects.all().delete()
  exit()
  ```
- **Django Shell:**
  ```zsh
  docker compose exec backend python manage.py shell
  ```
- **Run backend tests:**
  ```zsh
  docker compose exec backend python manage.py test
  ```
- **Run frontend tests:**
  ```zsh
  cd frontend/algo-flashcards
  npm test
  ```

---

## Developer Tools & Code Quality

### 8. Install Python dev requirements (for pre-commit, linting, etc.)
```zsh
pip install -r backend/requirements-dev.txt
```
### 9. Enable pre-commit hooks
```zsh
pre-commit install
```

### 10. (Optional) Run Backend Locally (outside Docker)

- Create and activate a virtual environment, then install requirements:
  ```zsh
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt -r requirements-dev.txt
  python manage.py runserver
  ```

### 11. Updating Requirements

- If you add new Python packages, update requirements:
  ```zsh
  pip freeze > backend/requirements.txt
  ```

### 12. Creating New Fixtures

- To create a new fixture from the current DB:
  ```zsh
  docker compose exec backend python manage.py dumpdata --output data/fixtures/new_fixture.json
  ```

---

## 🔄 How to Completely Reset Your Database (Docker)

If you want to start with a fresh, empty database (e.g., to resolve migration or data issues):

```zsh
# Stop all running containers
docker compose down

# Remove the database volume (this deletes ALL data!)
docker volume rm algo-flashcards_db-data

# (Optional) Remove old migration files if you want to re-create them from scratch
# find backend/flashcards/migrations -not -name "__init__.py" -name "*.py" -delete

# Start backend and db again
# (this will re-create the database volume)
docker compose up backend db

# In a new terminal, run migrations
# (wait until backend is ready)
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Create a superuser (admin account)
docker compose exec backend python manage.py createsuperuser

# (Optional) Re-import cards or load fixtures as needed
```

**Warning:** This will erase all data in your database. Only do this if you are sure you want a clean slate.

---

For more details, see `backend/README.md` and `docs/README.md`.
