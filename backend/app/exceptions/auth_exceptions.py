from app.exceptions.base import DomainException


class AuthenticationRequiredException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Token de autenticacao ausente ou invalido.",
            status_code=401,
            code="auth.required",
        )


class InvalidCredentialsException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "E-mail ou senha invalidos.",
            status_code=401,
            code="auth.invalid_credentials",
        )


class InactiveUserException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Usuario inativo. Contate o administrador.",
            status_code=403,
            code="auth.user_inactive",
        )


class NoActiveTenantAccessException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Usuario sem acesso a nenhuma empresa ativa.",
            status_code=403,
            code="auth.no_active_tenant_access",
        )
