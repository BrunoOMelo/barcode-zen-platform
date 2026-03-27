import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.exceptions.product_exceptions import DuplicateBarcodeException, ProductNotFoundException
from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.product_schema import ProductCreate, ProductUpdate


class ProductService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ProductRepository(db)

    def list_products(self, skip: int, limit: int) -> tuple[list[Product], int]:
        return self.repository.list(skip=skip, limit=limit)

    def get_product(self, product_id: uuid.UUID) -> Product:
        product = self.repository.get_by_id(product_id)
        if product is None:
            raise ProductNotFoundException()
        return product

    def create_product(self, payload: ProductCreate) -> Product:
        existing = self.repository.get_by_barcode(payload.barcode)
        if existing is not None:
            raise DuplicateBarcodeException()

        try:
            product = self.repository.create(payload)
            self.db.commit()
            return product
        except IntegrityError as exc:
            self.db.rollback()
            raise DuplicateBarcodeException() from exc

    def update_product(self, product_id: uuid.UUID, payload: ProductUpdate) -> Product:
        product = self.repository.get_by_id(product_id)
        if product is None:
            raise ProductNotFoundException()

        if payload.barcode and payload.barcode != product.barcode:
            existing = self.repository.get_by_barcode(payload.barcode)
            if existing is not None:
                raise DuplicateBarcodeException()

        try:
            updated_product = self.repository.update(product, payload)
            self.db.commit()
            return updated_product
        except IntegrityError as exc:
            self.db.rollback()
            raise DuplicateBarcodeException() from exc

    def delete_product(self, product_id: uuid.UUID) -> None:
        product = self.repository.get_by_id(product_id)
        if product is None:
            raise ProductNotFoundException()

        self.repository.delete(product)
        self.db.commit()
