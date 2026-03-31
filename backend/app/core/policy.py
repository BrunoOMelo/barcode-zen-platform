from collections.abc import Callable

from fastapi import Depends

from app.core.tenant import TenantContext, get_current_tenant_context
from app.exceptions.authorization_exceptions import PermissionDeniedException


class Permission:
    PRODUCTS_READ = "products:read"
    PRODUCTS_WRITE = "products:write"
    PRODUCTS_DELETE = "products:delete"
    INVENTORIES_READ = "inventories:read"
    INVENTORIES_WRITE = "inventories:write"
    INVENTORIES_COUNT = "inventories:count"
    INVENTORIES_STATUS = "inventories:status"
    TENANT_CONTEXT_READ = "tenant:context:read"
    TENANT_SWITCH = "tenant:switch"


ROLE_PERMISSIONS: dict[str, set[str]] = {
    "owner": {
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_WRITE,
        Permission.PRODUCTS_DELETE,
        Permission.INVENTORIES_READ,
        Permission.INVENTORIES_WRITE,
        Permission.INVENTORIES_COUNT,
        Permission.INVENTORIES_STATUS,
        Permission.TENANT_CONTEXT_READ,
        Permission.TENANT_SWITCH,
    },
    "admin": {
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_WRITE,
        Permission.PRODUCTS_DELETE,
        Permission.INVENTORIES_READ,
        Permission.INVENTORIES_WRITE,
        Permission.INVENTORIES_COUNT,
        Permission.INVENTORIES_STATUS,
        Permission.TENANT_CONTEXT_READ,
        Permission.TENANT_SWITCH,
    },
    "manager": {
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_WRITE,
        Permission.PRODUCTS_DELETE,
        Permission.INVENTORIES_READ,
        Permission.INVENTORIES_WRITE,
        Permission.INVENTORIES_COUNT,
        Permission.INVENTORIES_STATUS,
        Permission.TENANT_CONTEXT_READ,
        Permission.TENANT_SWITCH,
    },
    "member": {
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_WRITE,
        Permission.INVENTORIES_READ,
        Permission.INVENTORIES_WRITE,
        Permission.INVENTORIES_COUNT,
        Permission.TENANT_CONTEXT_READ,
        Permission.TENANT_SWITCH,
    },
    "viewer": {
        Permission.PRODUCTS_READ,
        Permission.INVENTORIES_READ,
        Permission.TENANT_CONTEXT_READ,
        Permission.TENANT_SWITCH,
    },
}


def get_permissions_for_role(role: str) -> set[str]:
    normalized_role = role.strip().lower()
    return ROLE_PERMISSIONS.get(normalized_role, set())


def has_permission(role: str, permission: str) -> bool:
    return permission in get_permissions_for_role(role)


def require_permission(permission: str) -> Callable[[TenantContext], None]:
    def dependency(tenant_context: TenantContext = Depends(get_current_tenant_context)) -> None:
        if not has_permission(tenant_context.role, permission):
            raise PermissionDeniedException()

    return dependency
