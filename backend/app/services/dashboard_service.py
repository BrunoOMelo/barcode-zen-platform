import uuid

from sqlalchemy.orm import Session

from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    DashboardCategoryItem,
    DashboardDivergenceItem,
    DashboardProgressItem,
    DashboardRecentInventory,
    DashboardSummaryResponse,
)


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.repository = DashboardRepository(db)

    def get_summary(self, *, tenant_id: uuid.UUID) -> DashboardSummaryResponse:
        active_inventories = self.repository.count_active_inventories(tenant_id=tenant_id)
        finished_inventories = self.repository.count_inventories_by_status(tenant_id=tenant_id, status="finished")
        total_products = self.repository.count_active_products(tenant_id=tenant_id)
        counted_products = self.repository.count_counted_products_from_open_inventories(tenant_id=tenant_id)
        divergent_items = self.repository.count_divergent_items_from_open_inventories(tenant_id=tenant_id)

        recent_inventories = self.repository.list_recent_inventories(tenant_id=tenant_id, limit=5)
        inventory_ids = [inventory.id for inventory in recent_inventories]
        aggregate_by_inventory = self.repository.get_inventory_item_aggregate(
            tenant_id=tenant_id,
            inventory_ids=inventory_ids,
        )

        progress_by_inventory: list[DashboardProgressItem] = []
        divergence_by_inventory: list[DashboardDivergenceItem] = []
        recent_inventory_rows: list[DashboardRecentInventory] = []

        for inventory in recent_inventories:
            recent_inventory_rows.append(
                DashboardRecentInventory(
                    id=inventory.id,
                    name=inventory.name,
                    status=inventory.status,
                    created_at=inventory.created_at,
                )
            )
            aggregate = aggregate_by_inventory.get(
                inventory.id,
                {"total": 0, "counted": 0, "ok": 0, "divergent": 0},
            )

            total = aggregate["total"]
            counted = aggregate["counted"]
            pending = max(total - counted, 0)
            percentage = round((counted / total) * 100) if total > 0 else 0
            if total > 0:
                progress_by_inventory.append(
                    DashboardProgressItem(
                        inventory_id=inventory.id,
                        name=_short_label(inventory.name),
                        total=total,
                        counted=counted,
                        pending=pending,
                        percentage=percentage,
                    )
                )

            ok = aggregate["ok"]
            divergent = aggregate["divergent"]
            if ok > 0 or divergent > 0:
                divergence_by_inventory.append(
                    DashboardDivergenceItem(
                        inventory_id=inventory.id,
                        name=_short_label(inventory.name),
                        ok=ok,
                        divergent=divergent,
                    )
                )

        categories_distribution = [
            DashboardCategoryItem(category=category, quantity=quantity)
            for category, quantity in self.repository.list_category_distribution(
                tenant_id=tenant_id,
                limit=8,
            )
        ]

        return DashboardSummaryResponse(
            active_inventories=active_inventories,
            finished_inventories=finished_inventories,
            total_products=total_products,
            counted_products=counted_products,
            divergent_items=divergent_items,
            recent_inventories=recent_inventory_rows,
            progress_by_inventory=progress_by_inventory,
            divergence_by_inventory=divergence_by_inventory,
            categories_distribution=categories_distribution,
        )


def _short_label(value: str, max_length: int = 24) -> str:
    if len(value) <= max_length:
        return value
    return f"{value[:max_length]}..."
