from app.exceptions.base import DomainException


class ProductNotFoundException(DomainException):
    def __init__(self) -> None:
        super().__init__("Produto nao encontrado.", status_code=404, code="product.not_found")


class DuplicateBarcodeException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Ja existe um produto com este codigo de barras.",
            status_code=409,
            code="product.duplicate_barcode",
        )


class DuplicateSkuException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Ja existe um produto com este SKU.",
            status_code=409,
            code="product.duplicate_sku",
        )


class InvalidProductPricingException(DomainException):
    def __init__(self) -> None:
        super().__init__(
            "Preco de venda nao pode ser menor que o custo.",
            status_code=400,
            code="product.invalid_pricing",
        )
