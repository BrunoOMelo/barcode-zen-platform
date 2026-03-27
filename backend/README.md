# Backend

FastAPI backend with layered architecture (`controller -> service -> repository`) prepared for PostgreSQL.

## Stack

- FastAPI
- SQLAlchemy 2.x
- Alembic
- PostgreSQL

## Run locally

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn main:app --reload
```

API base URL: `http://localhost:8000/api/v1`

## Main routes

- `GET /api/v1/health`
- `GET /api/v1/products`
- `GET /api/v1/products/{product_id}`
- `POST /api/v1/products`
- `PUT /api/v1/products/{product_id}`
- `DELETE /api/v1/products/{product_id}`
