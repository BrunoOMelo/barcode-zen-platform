import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_log(
        self,
        *,
        tenant_id: uuid.UUID | None,
        user_id: uuid.UUID | None,
        request_id: str | None,
        event_type: str,
        action: str,
        method: str | None,
        path: str | None,
        status_code: int | None,
        outcome: str | None,
        error_code: str | None,
        details: dict | None,
    ) -> AuditLog:
        audit_log = AuditLog(
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
        self.db.add(audit_log)
        self.db.flush()
        return audit_log
