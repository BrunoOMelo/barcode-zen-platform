from time import perf_counter

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.core.metrics import observe_db_ready_check
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
    started_at = perf_counter()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        observe_db_ready_check(status="error", duration_ms=duration_ms)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "message": "Banco de dados indisponivel.",
        }
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    observe_db_ready_check(status="ok", duration_ms=duration_ms)
    return {"status": "ready"}
