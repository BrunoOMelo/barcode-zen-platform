import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, desc, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_tenant_id_created_at_desc", "tenant_id", desc("created_at")),
        Index("ix_audit_logs_user_id_created_at_desc", "user_id", desc("created_at")),
        Index("ix_audit_logs_event_type_created_at_desc", "event_type", desc("created_at")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    request_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    method: Mapped[str | None] = mapped_column(String(10), nullable=True)
    path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
