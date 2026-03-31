# Security, Auth and API Contracts

## Scope

This document defines the security contract currently implemented for:

- Authentication (JWT)
- Tenant context resolution
- Authorization (RBAC + default deny)
- Error payload standardization
- `/api/v1/me/*` endpoints

## Authentication

- Protected routes require header: `Authorization: Bearer <jwt_token>`.
- JWT is validated in `RequestAuthMiddleware`.
- Token claim `sub` is mandatory and must be a valid UUID.

### Auth error codes

- `auth.token_missing` (`401`): token absent in request.
- `auth.token_invalid` (`401`): malformed or invalid token.
- `auth.token_expired` (`401`): expired token.
- `auth.required` (`401`): missing auth context in dependency resolution.

## Tenant context

### Required tenant header

For tenant-scoped routes, the request must include:

- `X-Tenant-Id: <tenant_uuid>`

If `X-Tenant-Id` is missing/invalid/not authorized:

- `tenant.context_required` (`403`)
- `tenant.context_invalid` (`400`)
- `tenant.membership_required` (`403`)

### Tenant optional route

`GET /api/v1/me/tenants` is authenticated but does not require `X-Tenant-Id`.

## Authorization (RBAC)

Central policy location: `backend/app/core/policy.py`

Default behavior:

- unknown role => no permissions (`default deny`)

### Role-permission matrix (current)

- `owner`: `products:read`, `products:write`, `products:delete`, `tenant:context:read`, `tenant:switch`
- `admin`: `products:read`, `products:write`, `products:delete`, `tenant:context:read`, `tenant:switch`
- `manager`: `products:read`, `products:write`, `products:delete`, `tenant:context:read`, `tenant:switch`
- `member`: `products:read`, `products:write`, `tenant:context:read`, `tenant:switch`
- `viewer`: `products:read`, `tenant:context:read`, `tenant:switch`

Permission denial:

- `auth.permission_denied` (`403`)

## CORS contract

Configured CORS variables:

- `CORS_ALLOW_ORIGINS` (default: `http://localhost:5173,http://127.0.0.1:5173`)
- `CORS_ALLOW_CREDENTIALS` (default: `true`)
- `CORS_ALLOW_METHODS` (default: `*`)
- `CORS_ALLOW_HEADERS` (default: `*`)

Preflight:

- `OPTIONS` is allowed and bypasses auth middleware.

## Error payload contract

Default API error payload shape:

```json
{
  "message": "Mensagem para usuario final em pt-BR",
  "code": "namespace.error_code"
}
```

Validation error payload shape:

```json
{
  "message": "Dados de requisicao invalidos.",
  "code": "request.validation_error",
  "errors": []
}
```

## Endpoint contracts

## `GET /api/v1/me/tenants`

Headers:

- Required: `Authorization`
- Optional: `X-Tenant-Id` (ignored)

Response `200`:

```json
[
  {
    "tenant_id": "uuid",
    "membership_id": "uuid",
    "tenant_name": "Empreendimento Alpha",
    "tenant_slug": "demo-empreendimento-alpha",
    "role": "admin",
    "is_default": true
  }
]
```

## `GET /api/v1/me/context`

Headers:

- Required: `Authorization`
- Required: `X-Tenant-Id`

Response `200`:

```json
{
  "user_id": "uuid",
  "email": "user@email.com",
  "tenant_id": "uuid",
  "membership_id": "uuid",
  "role": "admin",
  "permissions": ["products:read", "products:write", "products:delete", "tenant:context:read", "tenant:switch"]
}
```

## `POST /api/v1/me/switch-tenant`

Headers:

- Required: `Authorization`
- Required: `X-Tenant-Id` (current tenant)

Request body:

```json
{
  "tenant_id": "target_tenant_uuid"
}
```

Response `200`:

```json
{
  "previous_tenant_id": "uuid",
  "current_tenant_id": "uuid",
  "role": "member",
  "permissions": ["products:read", "products:write", "tenant:context:read", "tenant:switch"]
}
```

## Product routes (tenant-scoped)

- `GET /api/v1/products/` => requires `products:read`
- `GET /api/v1/products/{id}` => requires `products:read`
- `POST /api/v1/products/` => requires `products:write`
- `PUT /api/v1/products/{id}` => requires `products:write`
- `DELETE /api/v1/products/{id}` => requires `products:delete`

All product routes require:

- `Authorization`
- `X-Tenant-Id`

Cross-tenant product access is blocked and returns:

- `product.not_found` (`404`) for tenant-mismatched resource IDs.

## Technical evidence

Automated tests covering this contract:

- `backend/tests/test_auth_middleware.py`
- `backend/tests/test_policy_and_me_context.py`
- `backend/tests/test_integration_tenant_authz.py`
