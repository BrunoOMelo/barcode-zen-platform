from fastapi import APIRouter

from app.controllers.auth_controller import router as auth_router
from app.controllers.dashboard_controller import router as dashboard_router
from app.controllers.health_controller import router as health_router
from app.controllers.inventory_controller import router as inventory_router
from app.controllers.me_controller import router as me_router
from app.controllers.product_controller import router as product_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(product_router)
api_router.include_router(inventory_router)
api_router.include_router(dashboard_router)
api_router.include_router(me_router)
