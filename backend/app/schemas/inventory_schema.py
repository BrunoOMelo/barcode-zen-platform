import uuid
from datetime import datetime
from math import ceil
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

InventoryStatus = Literal["created", "counting", "recounting", "review", "finished"]
InventoryItemStatus = Literal["pending", "counted", "divergent"]
CountType = Literal["first", "recount"]


class InventoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)


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


class InventoryItemsUpsertRequest(BaseModel):
    product_ids: list[uuid.UUID] = Field(min_length=1, max_length=200)


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
