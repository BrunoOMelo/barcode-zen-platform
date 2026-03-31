import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product_schema import ProductCreate, ProductUpdate


class ProductRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(
        self,
        tenant_id: uuid.UUID,
        page: int,
        page_size: int,
        search: str | None,
        active: bool | None,
        category: str | None,
    ) -> tuple[list[Product], int]:
        filters = [Product.tenant_id == tenant_id]
        if active is not None:
            filters.append(Product.active == active)
        if category is not None:
            filters.append(Product.category == category)
        if search is not None:
            search_pattern = f"%{search}%"
            filters.append(
                or_(
                    Product.name.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                    Product.sku.ilike(search_pattern),
                    Product.barcode.ilike(search_pattern),
                )
            )

        total_stmt = select(func.count()).select_from(Product).where(*filters)
        total = self.db.scalar(total_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Product)
            .where(*filters)
            .order_by(Product.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        products = list(self.db.scalars(stmt).all())
        return products, int(total)

    def get_by_id(self, product_id: uuid.UUID, tenant_id: uuid.UUID) -> Product | None:
        stmt = select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
        return self.db.scalar(stmt)

    def get_by_barcode(self, barcode: str, tenant_id: uuid.UUID) -> Product | None:
        stmt = select(Product).where(Product.barcode == barcode, Product.tenant_id == tenant_id)
        return self.db.scalar(stmt)

    def get_by_sku(self, sku: str, tenant_id: uuid.UUID) -> Product | None:
        stmt = select(Product).where(Product.sku == sku, Product.tenant_id == tenant_id)
        return self.db.scalar(stmt)

    def create(self, payload: ProductCreate, tenant_id: uuid.UUID) -> Product:
        product = Product(
            tenant_id=tenant_id,
            name=payload.name,
            sku=payload.sku or payload.barcode,
            barcode=payload.barcode,
            description=payload.description,
            category=payload.category,
            active=payload.active,
            cost=payload.cost,
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
