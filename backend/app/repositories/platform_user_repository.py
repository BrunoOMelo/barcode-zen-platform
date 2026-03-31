from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.platform_user import PlatformUser


class PlatformUserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> PlatformUser | None:
        normalized_email = email.strip().lower()
        stmt = select(PlatformUser).where(func.lower(PlatformUser.email) == normalized_email)
        return self.db.scalar(stmt)
