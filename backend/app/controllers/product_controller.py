import uuid
from math import ceil

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.policy import Permission, require_permission
from app.core.tenant import get_current_tenant_id
from app.db.session import get_db
from app.schemas.product_schema import ProductCreate, ProductListResponse, ProductResponse, ProductUpdate
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])

PRODUCT_COMMON_ERROR_RESPONSES = {
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


def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(db)


@router.get(
    "/",
    response_model=ProductListResponse,
    responses=PRODUCT_COMMON_ERROR_RESPONSES,
    summary="List products with pagination and filters",
)
def list_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    active: bool | None = Query(default=None),
    category: str | None = Query(default=None, max_length=80),
    _: None = Depends(require_permission(Permission.PRODUCTS_READ)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: ProductService = Depends(get_product_service),
) -> ProductListResponse:
    products, total = service.list_products(
        tenant_id=tenant_id,
        page=page,
        page_size=page_size,
        search=search,
        active=active,
        category=category,
    )
    total_pages = ceil(total / page_size) if total > 0 else 0
    return ProductListResponse(
        items=products,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    responses={
        **PRODUCT_COMMON_ERROR_RESPONSES,
        404: {
            "description": "Produto nao encontrado no tenant informado",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Produto nao encontrado.",
                        "code": "product.not_found",
                    }
                }
            },
        },
    },
    summary="Get product by id",
)
def get_product(
    product_id: uuid.UUID,
    _: None = Depends(require_permission(Permission.PRODUCTS_READ)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    return service.get_product(tenant_id=tenant_id, product_id=product_id)


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        **PRODUCT_COMMON_ERROR_RESPONSES,
        400: {
            "description": "Regra de negocio invalida",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Preco de venda nao pode ser menor que o custo.",
                        "code": "product.invalid_pricing",
                    }
                }
            },
        },
        409: {
            "description": "Conflito de identificadores do produto",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Ja existe um produto com este SKU.",
                        "code": "product.duplicate_sku",
                    }
                }
            },
        },
    },
    summary="Create product",
)
def create_product(
    payload: ProductCreate,
    _: None = Depends(require_permission(Permission.PRODUCTS_WRITE)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    return service.create_product(tenant_id=tenant_id, payload=payload)


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    responses={
        **PRODUCT_COMMON_ERROR_RESPONSES,
        400: {
            "description": "Regra de negocio invalida",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Preco de venda nao pode ser menor que o custo.",
                        "code": "product.invalid_pricing",
                    }
                }
            },
        },
        404: {
            "description": "Produto nao encontrado no tenant informado",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Produto nao encontrado.",
                        "code": "product.not_found",
                    }
                }
            },
        },
        409: {
            "description": "Conflito de identificadores do produto",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Ja existe um produto com este codigo de barras.",
                        "code": "product.duplicate_barcode",
                    }
                }
            },
        },
    },
    summary="Update product",
)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    _: None = Depends(require_permission(Permission.PRODUCTS_WRITE)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    return service.update_product(tenant_id=tenant_id, product_id=product_id, payload=payload)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        **PRODUCT_COMMON_ERROR_RESPONSES,
        404: {
            "description": "Produto nao encontrado no tenant informado",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Produto nao encontrado.",
                        "code": "product.not_found",
                    }
                }
            },
        },
    },
    summary="Delete product",
)
def delete_product(
    product_id: uuid.UUID,
    _: None = Depends(require_permission(Permission.PRODUCTS_DELETE)),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    service: ProductService = Depends(get_product_service),
) -> Response:
    service.delete_product(tenant_id=tenant_id, product_id=product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
