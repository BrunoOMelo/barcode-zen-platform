from app.exceptions.base import DomainException


class PermissionDeniedException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Voce nao tem permissao para executar esta acao.",
            status_code=403,
            code="auth.permission_denied",
        )
