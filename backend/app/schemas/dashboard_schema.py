import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.inventory_schema import InventoryStatus


class DashboardRecentInventory(BaseModel):
    id: uuid.UUID
    name: str
    status: InventoryStatus
    created_at: datetime


class DashboardProgressItem(BaseModel):
    inventory_id: uuid.UUID
    name: str
    total: int
    counted: int
    pending: int
    percentage: int


class DashboardDivergenceItem(BaseModel):
    inventory_id: uuid.UUID
    name: str
    ok: int
    divergent: int


class DashboardCategoryItem(BaseModel):
    category: str
    quantity: int


class DashboardSummaryResponse(BaseModel):
    active_inventories: int
    finished_inventories: int
    total_products: int
    counted_products: int
    divergent_items: int
    recent_inventories: list[DashboardRecentInventory]
    progress_by_inventory: list[DashboardProgressItem]
    divergence_by_inventory: list[DashboardDivergenceItem]
    categories_distribution: list[DashboardCategoryItem]
