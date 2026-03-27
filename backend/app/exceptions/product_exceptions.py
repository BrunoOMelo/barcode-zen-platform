from app.exceptions.base import DomainException


class ProductNotFoundException(DomainException):
    def __init__(self) -> None:
        super().__init__("Produto não encontrado.", status_code=404)


class DuplicateBarcodeException(DomainException):
    def __init__(self) -> None:
        super().__init__("Já existe um produto com este código de barras.", status_code=409)
