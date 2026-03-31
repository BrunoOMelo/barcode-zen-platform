from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.db.session import engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/live")
def health_live_check() -> dict[str, str]:
    return {"status": "alive"}


@router.get("/health/ready")
def health_ready_check(response: Response) -> dict[str, str]:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "message": "Banco de dados indisponivel.",
        }
    return {"status": "ready"}
