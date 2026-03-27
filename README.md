# Barcode Zen Platform

Production-ready baseline extracted from the Lovable MVP, with clear separation between frontend and backend.

## Repository structure

```text
barcode-zen-platform/
  frontend/   # React + Vite client
  backend/    # FastAPI + SQLAlchemy + Alembic
  infra/      # Docker Compose and infra placeholders
  docs/       # Architecture documentation
```

## Architecture

- Frontend and backend are independent applications.
- Backend follows layered architecture:
  - Controller: HTTP concerns only
  - Service: business rules and orchestration
  - Repository: persistence logic
  - Model: database entity
  - Schema: DTO for request/response
- PostgreSQL integration is done through SQLAlchemy and Alembic.
- Custom backend exceptions expose pt-BR messages for users.

See details in `docs/architecture.md`.

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker Desktop (recommended for PostgreSQL)

## Local development

### 1. Start PostgreSQL (Docker)

```bash
cd infra
copy .env.example .env
docker compose up -d postgres
```

### 2. Run backend

```bash
cd backend
copy .env.example .env
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

Backend URL: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`  
Health: `http://localhost:8000/api/v1/health`

### 3. Run frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend URL: `http://localhost:8080`

## Optional: run backend + postgres with Docker Compose

```bash
cd infra
copy .env.example .env
copy ..\\backend\\.env.example ..\\backend\\.env
docker compose up --build
```

## Environment variables

### Frontend (`frontend/.env`)

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

### Backend (`backend/.env`)

- `APP_NAME`
- `APP_ENV`
- `API_V1_PREFIX`
- `DB_ECHO`
- `DATABASE_URL`

### Infra (`infra/.env`)

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `BACKEND_PORT`

## Development workflow

1. Start PostgreSQL.
2. Run `alembic upgrade head`.
3. Start backend and frontend independently.
4. Implement features using controller -> service -> repository flow.
5. Add migrations and tests for each backend feature increment.
