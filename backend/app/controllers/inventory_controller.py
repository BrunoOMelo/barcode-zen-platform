import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.policy import Permission, require_permission
from app.core.tenant import get_current_tenant_id
from app.db.session import get_db
from app.schemas.inventory_schema import (
    InventoryCountCreate,
    InventoryCountListResponse,
    InventoryCountResponse,
    InventoryCreate,
    InventoryItemsResponse,
    InventoryItemsUpsertRequest,
    InventoryItemResponse,
    InventoryListResponse,
    InventoryResponse,
    InventoryStatus,
    InventoryStatusUpdate,
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventories", tags=["inventories"])

INVENTORY_COMMON_ERROR_RESPONSES = {
    401: {
        "description": "Falha de autenticacao",
        "content": {
            "application/json": {
                "example": {
                    "message": "Token de autenticacao invalido.",
                    "code": "auth.token_invalid",
                }
            }
        },
    },
    403: {
        "description": "Acesso negado",
        "content": {
            "application/json": {
                "example": {
                    "message": "Voce nao tem permissao para executar esta acao.",
                    "code": "auth.permission_denied",
                }
            }
        },
    },
}


def get_inventory_service(db: Session = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get(
    "/",
    response_model=InventoryListResponse,
    responses=INVENTORY_COMMON_ERROR_RESPONSES,
    summary="List inventories with pagination",
)
def list_inventories(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: InventoryStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=160),
    _: None = Depends(require_permission(Permission.INVENTORIES_READ)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryListResponse:
    inventories, total = service.list_inventories(
        tenant_id=tenant_id,
        page=page,
        page_size=page_size,
        status=status_filter,
        search=search,
    )
    return InventoryListResponse.from_page(
        items=[InventoryResponse.model_validate(inventory) for inventory in inventories],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post(
    "/",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    responses=INVENTORY_COMMON_ERROR_RESPONSES,
    summary="Create inventory",
)
def create_inventory(
    payload: InventoryCreate,
    _: None = Depends(require_permission(Permission.INVENTORIES_WRITE)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryResponse:
    inventory = service.create_inventory(
        tenant_id=tenant_id,
        created_by=current_user.user_id,
        name=payload.name,
    )
    return InventoryResponse.model_validate(inventory)


@router.get(
    "/{inventory_id}",
    response_model=InventoryResponse,
    responses={
        **INVENTORY_COMMON_ERROR_RESPONSES,
        404: {
            "description": "Inventario nao encontrado no tenant informado",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Inventario nao encontrado.",
                        "code": "inventory.not_found",
                    }
                }
            },
        },
    },
    summary="Get inventory by id",
)
def get_inventory(
    inventory_id: uuid.UUID,
    _: None = Depends(require_permission(Permission.INVENTORIES_READ)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryResponse:
    inventory = service.get_inventory(tenant_id=tenant_id, inventory_id=inventory_id)
    return InventoryResponse.model_validate(inventory)


@router.patch(
    "/{inventory_id}/status",
    response_model=InventoryResponse,
    responses={
        **INVENTORY_COMMON_ERROR_RESPONSES,
        400: {
            "description": "Transicao de status invalida",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Transicao de status de inventario invalida.",
                        "code": "inventory.invalid_status_transition",
                    }
                }
            },
        },
    },
    summary="Change inventory status",
)
def change_inventory_status(
    inventory_id: uuid.UUID,
    payload: InventoryStatusUpdate,
    _: None = Depends(require_permission(Permission.INVENTORIES_STATUS)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryResponse:
    inventory = service.change_status(
        tenant_id=tenant_id,
        inventory_id=inventory_id,
        target_status=payload.status,
    )
    return InventoryResponse.model_validate(inventory)


@router.get(
    "/{inventory_id}/items",
    response_model=InventoryItemsResponse,
    responses=INVENTORY_COMMON_ERROR_RESPONSES,
    summary="List items from an inventory",
)
def list_inventory_items(
    inventory_id: uuid.UUID,
    _: None = Depends(require_permission(Permission.INVENTORIES_READ)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryItemsResponse:
    rows = service.list_items(tenant_id=tenant_id, inventory_id=inventory_id)
    items = [
        InventoryItemResponse(
            id=item.id,
            inventory_id=item.inventory_id,
            product_id=item.product_id,
            product_name=product.name,
            product_sku=product.sku,
            product_barcode=product.barcode,
            system_quantity=item.system_quantity,
            counted_quantity=item.counted_quantity,
            difference=item.difference,
            status=item.status,
            counted_by=item.counted_by,
            counted_at=item.counted_at,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item, product in rows
    ]
    return InventoryItemsResponse(items=items, total=len(items))


@router.post(
    "/{inventory_id}/items",
    response_model=InventoryItemsResponse,
    responses={
        **INVENTORY_COMMON_ERROR_RESPONSES,
        400: {
            "description": "Alteracao de itens nao permitida no status atual",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Nao e permitido alterar itens deste inventario no status atual.",
                        "code": "inventory_item.mutation_not_allowed",
                    }
                }
            },
        },
        409: {
            "description": "Item duplicado no inventario",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Produto ja vinculado a este inventario.",
                        "code": "inventory_item.already_exists",
                    }
                }
            },
        },
    },
    summary="Add products to inventory",
)
def add_inventory_items(
    inventory_id: uuid.UUID,
    payload: InventoryItemsUpsertRequest,
    _: None = Depends(require_permission(Permission.INVENTORIES_WRITE)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryItemsResponse:
    rows = service.add_items(
        tenant_id=tenant_id,
        inventory_id=inventory_id,
        product_ids=payload.product_ids,
    )
    items = [
        InventoryItemResponse(
            id=item.id,
            inventory_id=item.inventory_id,
            product_id=item.product_id,
            product_name=product.name,
            product_sku=product.sku,
            product_barcode=product.barcode,
            system_quantity=item.system_quantity,
            counted_quantity=item.counted_quantity,
            difference=item.difference,
            status=item.status,
            counted_by=item.counted_by,
            counted_at=item.counted_at,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item, product in rows
    ]
    return InventoryItemsResponse(items=items, total=len(items))


@router.post(
    "/{inventory_id}/counts",
    response_model=InventoryCountResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        **INVENTORY_COMMON_ERROR_RESPONSES,
        400: {
            "description": "Contagem nao permitida",
            "content": {
                "application/json": {
                    "examples": {
                        "status_not_allowed": {
                            "summary": "Status invalido",
                            "value": {
                                "message": "Nao e permitido registrar contagem no status atual do inventario.",
                                "code": "inventory_count.not_allowed",
                            },
                        },
                        "count_type_invalid": {
                            "summary": "Tipo invalido",
                            "value": {
                                "message": "Tipo de contagem invalido para o status atual do inventario.",
                                "code": "inventory_count.invalid_type",
                            },
                        },
                    }
                }
            },
        },
    },
    summary="Register inventory count",
)
def register_inventory_count(
    inventory_id: uuid.UUID,
    payload: InventoryCountCreate,
    _: None = Depends(require_permission(Permission.INVENTORIES_COUNT)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryCountResponse:
    count, product, _ = service.register_count(
        tenant_id=tenant_id,
        inventory_id=inventory_id,
        counted_by=current_user.user_id,
        payload=payload,
    )
    return InventoryCountResponse(
        id=count.id,
        inventory_id=count.inventory_id,
        inventory_item_id=count.inventory_item_id,
        product_id=count.product_id,
        product_name=product.name,
        product_sku=product.sku,
        product_barcode=product.barcode,
        counted_by=count.counted_by,
        count_type=count.count_type,
        quantity=count.quantity,
        created_at=count.created_at,
    )


@router.get(
    "/{inventory_id}/counts",
    response_model=InventoryCountListResponse,
    responses=INVENTORY_COMMON_ERROR_RESPONSES,
    summary="List counts from an inventory",
)
def list_inventory_counts(
    inventory_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    product_id: uuid.UUID | None = Query(default=None),
    _: None = Depends(require_permission(Permission.INVENTORIES_READ)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryCountListResponse:
    rows, total = service.list_counts(
        tenant_id=tenant_id,
        inventory_id=inventory_id,
        page=page,
        page_size=page_size,
        product_id=product_id,
    )
    items = [
        InventoryCountResponse(
            id=count.id,
            inventory_id=count.inventory_id,
            inventory_item_id=count.inventory_item_id,
            product_id=count.product_id,
            product_name=product.name,
            product_sku=product.sku,
            product_barcode=product.barcode,
            counted_by=count.counted_by,
            count_type=count.count_type,
            quantity=count.quantity,
            created_at=count.created_at,
        )
        for count, product in rows
    ]
    return InventoryCountListResponse.from_page(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
    )
