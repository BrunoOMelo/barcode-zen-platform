from fastapi import APIRouter, Response

from app.core.metrics import METRICS_CONTENT_TYPE, render_metrics

router = APIRouter(tags=["metrics"])


@router.get("/metrics", include_in_schema=False)
def get_metrics() -> Response:
    return Response(content=render_metrics(), media_type=METRICS_CONTENT_TYPE)
