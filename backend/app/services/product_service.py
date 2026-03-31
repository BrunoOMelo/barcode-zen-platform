import uuid
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.exceptions.product_exceptions import (
    DuplicateBarcodeException,
    DuplicateSkuException,
    InvalidProductPricingException,
    ProductNotFoundException,
)
from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.product_schema import ProductCreate, ProductUpdate


class ProductService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ProductRepository(db)

    def list_products(
        self,
        tenant_id: uuid.UUID,
        page: int,
        page_size: int,
        search: str | None,
        active: bool | None,
        category: str | None,
    ) -> tuple[list[Product], int]:
        normalized_search = search.strip() if search else None
        normalized_category = category.strip() if category else None
        return self.repository.list(
            tenant_id=tenant_id,
            page=page,
            page_size=page_size,
            search=normalized_search,
            active=active,
            category=normalized_category,
        )

    def get_product(self, tenant_id: uuid.UUID, product_id: uuid.UUID) -> Product:
        product = self.repository.get_by_id(product_id=product_id, tenant_id=tenant_id)
        if product is None:
            raise ProductNotFoundException()
        return product

    def create_product(self, tenant_id: uuid.UUID, payload: ProductCreate) -> Product:
        normalized_sku = self._normalize_identifier(payload.sku or payload.barcode)
        normalized_barcode = self._normalize_identifier(payload.barcode)

        self._validate_pricing(payload.cost, payload.price)

        existing = self.repository.get_by_barcode(barcode=normalized_barcode, tenant_id=tenant_id)
        if existing is not None:
            raise DuplicateBarcodeException()
        existing_sku = self.repository.get_by_sku(sku=normalized_sku, tenant_id=tenant_id)
        if existing_sku is not None:
            raise DuplicateSkuException()

        payload = payload.model_copy(
            update={
                "name": payload.name.strip(),
                "sku": normalized_sku,
                "barcode": normalized_barcode,
                "description": payload.description.strip() if payload.description else None,
                "category": payload.category.strip() if payload.category else None,
            }
        )

        try:
            product = self.repository.create(payload=payload, tenant_id=tenant_id)
            self.db.commit()
            return product
        except IntegrityError as exc:
            self.db.rollback()
            raise self._map_integrity_error(exc) from exc

    def update_product(self, tenant_id: uuid.UUID, product_id: uuid.UUID, payload: ProductUpdate) -> Product:
        product = self.repository.get_by_id(product_id=product_id, tenant_id=tenant_id)
        if product is None:
            raise ProductNotFoundException()

        incoming_fields = payload.model_dump(exclude_unset=True)

        next_barcode = product.barcode
        if "barcode" in incoming_fields and payload.barcode is not None:
            next_barcode = self._normalize_identifier(payload.barcode)

        next_sku = product.sku
        if "sku" in incoming_fields and payload.sku is not None:
            next_sku = self._normalize_identifier(payload.sku)
        elif "barcode" in incoming_fields:
            next_sku = next_barcode

        next_cost = payload.cost if payload.cost is not None else product.cost
        next_price = payload.price if payload.price is not None else product.price
        self._validate_pricing(next_cost, next_price)

        if next_barcode != product.barcode:
            existing = self.repository.get_by_barcode(barcode=next_barcode, tenant_id=tenant_id)
            if existing is not None:
                raise DuplicateBarcodeException()
        if next_sku != product.sku:
            existing = self.repository.get_by_sku(sku=next_sku, tenant_id=tenant_id)
            if existing is not None:
                raise DuplicateSkuException()

        updates: dict[str, object] = {}
        if "name" in incoming_fields and payload.name is not None:
            updates["name"] = payload.name.strip()
        if "barcode" in incoming_fields or "sku" in incoming_fields:
            updates["barcode"] = next_barcode
            updates["sku"] = next_sku
        if "description" in incoming_fields:
            updates["description"] = payload.description.strip() if payload.description is not None else None
        if "category" in incoming_fields:
            updates["category"] = payload.category.strip() if payload.category is not None else None

        payload = payload.model_copy(update=updates)

        try:
            updated_product = self.repository.update(product, payload)
            self.db.commit()
            return updated_product
        except IntegrityError as exc:
            self.db.rollback()
            raise self._map_integrity_error(exc) from exc

    def delete_product(self, tenant_id: uuid.UUID, product_id: uuid.UUID) -> None:
        product = self.repository.get_by_id(product_id=product_id, tenant_id=tenant_id)
        if product is None:
            raise ProductNotFoundException()

        self.repository.delete(product)
        self.db.commit()

    @staticmethod
    def _normalize_identifier(value: str) -> str:
        return value.strip().upper()

    @staticmethod
    def _validate_pricing(cost: Decimal | None, price: Decimal | None) -> None:
        if cost is not None and price is not None and price < cost:
            raise InvalidProductPricingException()

    @staticmethod
    def _map_integrity_error(exc: IntegrityError) -> Exception:
        message = str(exc.orig).lower() if exc.orig is not None else str(exc).lower()
        if "uq_products_tenant_sku" in message:
            return DuplicateSkuException()
        if "uq_products_tenant_barcode" in message:
            return DuplicateBarcodeException()
        return DuplicateBarcodeException()
