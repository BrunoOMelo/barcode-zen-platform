# Architecture Overview

## Repository Layout

- `frontend/`: React + Vite SPA
- `backend/`: FastAPI API with layered architecture
- `infra/`: local infrastructure (`docker-compose`) and future deployment placeholders
- `docs/`: architecture notes, ADRs, specs, and sprint plans

## Backend Layering

- `controllers`: HTTP endpoints and dependency wiring
- `services`: business rules and orchestration
- `repositories`: persistence and query access via SQLAlchemy
- `models`: SQLAlchemy entities
- `schemas`: API contracts (request/response DTOs)
- `exceptions`: domain exceptions and global exception handlers
- `db`: engine, session factory, metadata
- `core`: shared runtime concerns (config, auth, middleware, tenant, policy)

Data flow:

`Controller -> Service -> Repository -> Database`

## Multi-Tenant Foundation

- Tenant model: `tenants`
- Membership model: `user_tenant_memberships`
- Core domain scope: `products.tenant_id` (not null)
- Tenant-aware constraints:
  - `uq_products_tenant_barcode`
  - `ix_products_tenant_id`
  - `ix_products_tenant_id_name`
  - `uq_inventory_items_inventory_product`
  - `ix_inventories_tenant_id_status`
  - `ix_inventory_counts_tenant_id_inventory_id`

## Request Security Flow

1. `RequestAuthMiddleware` validates JWT (`Authorization: Bearer`).
2. Middleware resolves active tenant from `X-Tenant-Id`.
3. Middleware validates active membership (`user_id + tenant_id + status=active`).
4. Middleware stores `current_user` and `current_tenant` in request state.
5. Controllers use dependency functions (`get_current_user`, `get_current_tenant_context`).

## Authorization Model (RBAC + Default Deny)

- Central policy module: `app/core/policy.py`
- Role-based permission map:
  - `owner`, `admin`, `manager`, `member`, `viewer`
- Unknown roles receive zero permissions (`default deny`).
- Permission dependencies are enforced at endpoint level (for example products write/delete).

## Auth/Tenant APIs

- `GET /api/v1/me/context`: returns user + tenant + role + effective permissions.
- `POST /api/v1/me/switch-tenant`: validates target membership and returns the next tenant context.

## Core Domain APIs (Current)

- Products:
  - `GET/POST /api/v1/products`
  - `GET/PUT/DELETE /api/v1/products/{id}`
- Inventories:
  - `GET/POST /api/v1/inventories`
  - `GET /api/v1/inventories/{id}`
  - `PATCH /api/v1/inventories/{id}/status`
  - `GET/POST /api/v1/inventories/{id}/items`
  - `GET/POST /api/v1/inventories/{id}/counts`

## Error Contract

- User-facing messages are in Brazilian Portuguese (`pt-BR`).
- Error payload is standardized with:
  - `message`
  - `code`

## Observability Baseline

- Tenant switch decisions are logged (`tenant_switch_allowed` / `tenant_switch_denied`).
- Additional observability specs (metrics/tracing/audit expansion) are planned in SPEC-006.
