import uuid

from sqlalchemy.orm import Session

from app.repositories.audit_log_repository import AuditLogRepository


class AuditLogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = AuditLogRepository(db)

    def record_event(
        self,
        *,
        event_type: str,
        action: str,
        tenant_id: uuid.UUID | None = None,
        user_id: uuid.UUID | None = None,
        request_id: str | None = None,
        method: str | None = None,
        path: str | None = None,
        status_code: int | None = None,
        outcome: str | None = None,
        error_code: str | None = None,
        details: dict | None = None,
    ) -> None:
        self.repository.create_log(
            tenant_id=tenant_id,
            user_id=user_id,
            request_id=request_id,
            event_type=event_type,
            action=action,
            method=method,
            path=path,
            status_code=status_code,
            outcome=outcome,
            error_code=error_code,
            details=details,
        )
