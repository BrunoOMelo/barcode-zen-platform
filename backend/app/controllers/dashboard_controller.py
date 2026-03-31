import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.policy import Permission, require_permission
from app.core.tenant import get_current_tenant_id
from app.db.session import get_db
from app.schemas.dashboard_schema import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

COMMON_ERROR_RESPONSES = {
    401: {
        "description": "Falha de autenticacao",
        "content": {
            "application/json": {
                "example": {
                    "message": "Token de autenticacao invalido.",
                    "code": "auth.token_invalid",
                }
            }
        },
    },
    403: {
        "description": "Acesso negado",
        "content": {
            "application/json": {
                "example": {
                    "message": "Voce nao tem permissao para executar esta acao.",
                    "code": "auth.permission_denied",
                }
            }
        },
    },
}


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get tenant dashboard summary",
)
def get_dashboard_summary(
    _: None = Depends(require_permission(Permission.PRODUCTS_READ)),
    __: None = Depends(require_permission(Permission.INVENTORIES_READ)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummaryResponse:
    return service.get_summary(tenant_id=tenant_id)
