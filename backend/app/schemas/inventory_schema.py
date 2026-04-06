import uuid
from datetime import datetime
from decimal import Decimal
from math import ceil
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

InventoryStatus = Literal["created", "counting", "recounting", "review", "finished"]
InventoryItemStatus = Literal["pending", "counted", "divergent"]
CountType = Literal["first", "recount"]


class InventoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)


class InventoryImportRow(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    sku: str | None = Field(default=None, min_length=2, max_length=64)
    barcode: str | None = Field(default=None, min_length=2, max_length=32)
    category: str | None = Field(default=None, max_length=80)
    cost: Decimal | None = Field(default=None, ge=0)
    initial_quantity: int | None = Field(default=None, ge=0)
    source_row: int | None = Field(default=None, ge=2)

    @model_validator(mode="after")
    def validate_identifier(self) -> "InventoryImportRow":
        has_sku = bool(self.sku and self.sku.strip())
        has_barcode = bool(self.barcode and self.barcode.strip())
        if not has_sku and not has_barcode:
            raise ValueError("Informe SKU ou codigo de barras para cada linha.")
        return self


class InventoryImportRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    rows: list[InventoryImportRow] = Field(min_length=1, max_length=5000)


class InventoryStatusUpdate(BaseModel):
    status: InventoryStatus


class InventoryResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    status: InventoryStatus
    created_by: uuid.UUID
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventoryListResponse(BaseModel):
    items: list[InventoryResponse]
    page: int
    page_size: int
    total: int
    total_pages: int

    @classmethod
    def from_page(
        cls,
        *,
        items: list[InventoryResponse],
        page: int,
        page_size: int,
        total: int,
    ) -> "InventoryListResponse":
        return cls(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=ceil(total / page_size) if total > 0 else 0,
        )


class InventoryItemUpsertPayload(BaseModel):
    product_id: uuid.UUID
    system_quantity: int | None = Field(default=None, ge=0)
    counted_quantity: int | None = Field(default=None, ge=0)


class InventoryItemsUpsertRequest(BaseModel):
    product_ids: list[uuid.UUID] | None = Field(default=None, min_length=1, max_length=200)
    items: list[InventoryItemUpsertPayload] | None = Field(default=None, min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_sources(self) -> "InventoryItemsUpsertRequest":
        has_product_ids = bool(self.product_ids)
        has_items = bool(self.items)

        if not has_product_ids and not has_items:
            raise ValueError("Informe ao menos um produto para vincular ao inventario.")
        if has_product_ids and has_items:
            raise ValueError("Envie apenas um formato por requisicao: product_ids ou items.")
        return self


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    inventory_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_sku: str
    product_barcode: str
    system_quantity: int
    counted_quantity: int | None
    difference: int | None
    status: InventoryItemStatus
    counted_by: uuid.UUID | None
    counted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class InventoryItemsResponse(BaseModel):
    items: list[InventoryItemResponse]
    total: int


class InventoryImportErrorRow(BaseModel):
    source_row: int | None = None
    identifier: str | None = None
    message: str


class InventoryImportSummaryResponse(BaseModel):
    total_rows: int
    processed_rows: int
    created_products: int
    linked_existing_products: int
    inventory_items_created: int
    skipped_rows: int


class InventoryImportResponse(BaseModel):
    inventory: InventoryResponse
    summary: InventoryImportSummaryResponse
    errors: list[InventoryImportErrorRow]


class InventoryCountCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=0)
    count_type: CountType | None = None


class InventoryCountResponse(BaseModel):
    id: uuid.UUID
    inventory_id: uuid.UUID
    inventory_item_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_sku: str
    product_barcode: str
    counted_by: uuid.UUID
    count_type: CountType
    quantity: int
    created_at: datetime


class InventoryCountListResponse(BaseModel):
    items: list[InventoryCountResponse]
    page: int
    page_size: int
    total: int
    total_pages: int

    @classmethod
    def from_page(
        cls,
        *,
        items: list[InventoryCountResponse],
        page: int,
        page_size: int,
        total: int,
    ) -> "InventoryCountListResponse":
        return cls(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=ceil(total / page_size) if total > 0 else 0,
        )
