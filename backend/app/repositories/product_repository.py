import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product_schema import ProductCreate, ProductUpdate


class ProductRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, skip: int, limit: int) -> tuple[list[Product], int]:
        total_stmt = select(func.count()).select_from(Product)
        total = self.db.scalar(total_stmt) or 0

        stmt = select(Product).order_by(Product.created_at.desc()).offset(skip).limit(limit)
        products = list(self.db.scalars(stmt).all())
        return products, int(total)

    def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        return self.db.get(Product, product_id)

    def get_by_barcode(self, barcode: str) -> Product | None:
        stmt = select(Product).where(Product.barcode == barcode)
        return self.db.scalar(stmt)

    def create(self, payload: ProductCreate) -> Product:
        product = Product(
            name=payload.name,
            barcode=payload.barcode,
            description=payload.description,
            price=payload.price,
            quantity=payload.quantity,
        )
        self.db.add(product)
        self.db.flush()
        self.db.refresh(product)
        return product

    def update(self, product: Product, payload: ProductUpdate) -> Product:
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)
        self.db.flush()
        self.db.refresh(product)
        return product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
