import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.product_schema import ProductCreate, ProductListResponse, ProductResponse, ProductUpdate
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])


def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(db)


@router.get("/", response_model=ProductListResponse)
def list_products(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    service: ProductService = Depends(get_product_service),
) -> ProductListResponse:
    products, total = service.list_products(skip=skip, limit=limit)
    return ProductListResponse(items=products, total=total)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: uuid.UUID, service: ProductService = Depends(get_product_service)) -> ProductResponse:
    return service.get_product(product_id)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    return service.create_product(payload)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    return service.update_product(product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: uuid.UUID, service: ProductService = Depends(get_product_service)) -> Response:
    service.delete_product(product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
