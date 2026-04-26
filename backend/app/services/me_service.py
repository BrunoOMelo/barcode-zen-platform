import logging
import uuid

from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.exceptions.tenant_exceptions import TenantMembershipRequiredException
from app.services.audit_log_service import AuditLogService
from app.services.tenant_context_service import TenantContextService

logger = logging.getLogger(__name__)


class MeService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.tenant_context_service = TenantContextService(db)
        self.audit_log_service = AuditLogService(db)

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
            self._record_tenant_switch_audit(
                user_id=user_id,
                previous_tenant_id=previous_tenant_id,
                target_tenant_id=target_tenant_id,
                allowed=False,
                new_role=None,
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
        self._record_tenant_switch_audit(
            user_id=user_id,
            previous_tenant_id=previous_tenant_id,
            target_tenant_id=target_tenant_id,
            allowed=True,
            new_role=next_tenant_context.role,
        )
        return next_tenant_context

    def _record_tenant_switch_audit(
        self,
        *,
        user_id: uuid.UUID,
        previous_tenant_id: uuid.UUID,
        target_tenant_id: uuid.UUID,
        allowed: bool,
        new_role: str | None,
    ) -> None:
        try:
            self.audit_log_service.record_event(
                event_type="tenant.switch",
                action="allowed" if allowed else "denied",
                tenant_id=target_tenant_id if allowed else previous_tenant_id,
                user_id=user_id,
                outcome="success" if allowed else "rejected",
                error_code=None if allowed else "tenant.membership_required",
                details={
                    "previous_tenant_id": str(previous_tenant_id),
                    "target_tenant_id": str(target_tenant_id),
                    "new_role": new_role,
                },
            )
            self.db.commit()
        except Exception:  # pragma: no cover - audit must not break business operation
            self.db.rollback()
            logger.warning(
                "tenant_switch_audit_failed",
                extra={
                    "user_id": str(user_id),
                    "previous_tenant_id": str(previous_tenant_id),
                    "target_tenant_id": str(target_tenant_id),
                },
            )
