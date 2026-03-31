from app.exceptions.base import DomainException


class InventoryNotFoundException(DomainException):
    def __init__(self) -> None:
        super().__init__("Inventario nao encontrado.", status_code=404, code="inventory.not_found")


class InventoryInvalidStatusTransitionException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Transicao de status de inventario invalida.",
            status_code=400,
            code="inventory.invalid_status_transition",
        )


class InventoryItemNotFoundException(DomainException):
    def __init__(self) -> None:
        super().__init__("Item de inventario nao encontrado.", status_code=404, code="inventory_item.not_found")


class InventoryItemAlreadyExistsException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Produto ja vinculado a este inventario.",
            status_code=409,
            code="inventory_item.already_exists",
        )


class InventoryCountNotAllowedException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Nao e permitido registrar contagem no status atual do inventario.",
            status_code=400,
            code="inventory_count.not_allowed",
        )


class InventoryCountTypeInvalidException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Tipo de contagem invalido para o status atual do inventario.",
            status_code=400,
            code="inventory_count.invalid_type",
        )


class ProductNotInTenantException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Produto nao pertence ao tenant informado.",
            status_code=404,
            code="inventory.product_not_in_tenant",
        )


class InventoryItemsMutationNotAllowedException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Nao e permitido alterar itens deste inventario no status atual.",
            status_code=400,
            code="inventory_item.mutation_not_allowed",
        )
