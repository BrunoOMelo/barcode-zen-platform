from app.exceptions.base import DomainException


class TenantContextRequiredException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Tenant ativo nao informado.",
            status_code=403,
            code="tenant.context_required",
        )


class InvalidTenantContextException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Tenant ativo invalido.",
            status_code=400,
            code="tenant.context_invalid",
        )


class TenantMembershipRequiredException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Usuario sem vinculacao ativa com o tenant informado.",
            status_code=403,
            code="tenant.membership_required",
        )
