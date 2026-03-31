import logging
import uuid

from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.exceptions.tenant_exceptions import TenantMembershipRequiredException
from app.services.tenant_context_service import TenantContextService

logger = logging.getLogger(__name__)


class MeService:
    def __init__(self, db: Session) -> None:
        self.tenant_context_service = TenantContextService(db)

    def switch_tenant(self, user_id: uuid.UUID, previous_tenant_id: uuid.UUID, target_tenant_id: uuid.UUID) -> TenantContext:
        next_tenant_context = self.tenant_context_service.resolve_active_tenant_context(
            user_id=user_id,
            tenant_id=target_tenant_id,
        )
        if next_tenant_context is None:
            logger.info(
                "tenant_switch_denied",
                extra={
                    "user_id": str(user_id),
                    "previous_tenant_id": str(previous_tenant_id),
                    "target_tenant_id": str(target_tenant_id),
                },
            )
            raise TenantMembershipRequiredException()

        logger.info(
            "tenant_switch_allowed",
            extra={
                "user_id": str(user_id),
                "previous_tenant_id": str(previous_tenant_id),
                "target_tenant_id": str(target_tenant_id),
                "new_role": next_tenant_context.role,
            },
        )
        return next_tenant_context
