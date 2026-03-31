# Inventories API Contract (SPEC-004)

Base URL: `/api/v1`

Authentication:

- Header `Authorization: Bearer <jwt>`
- Header `X-Tenant-Id: <tenant_uuid>`

## Status Model

Inventory statuses:

- `created`
- `counting`
- `recounting`
- `review`
- `finished`

Allowed transitions:

- `created -> counting`
- `counting -> recounting`
- `counting -> review`
- `recounting -> review`
- `review -> recounting`
- `review -> finished`

## Endpoints

### 1) List inventories

`GET /inventories`

Query params:

- `page` (default `1`)
- `page_size` (default `20`, max `100`)
- `status` (optional)
- `search` (optional, by name)

### 2) Create inventory

`POST /inventories`

Request:

```json
{
  "name": "April cycle"
}
```

### 3) Get inventory by id

`GET /inventories/{inventory_id}`

### 4) Change inventory status

`PATCH /inventories/{inventory_id}/status`

Request:

```json
{
  "status": "counting"
}
```

### 5) List inventory items

`GET /inventories/{inventory_id}/items`

### 6) Add products to inventory

`POST /inventories/{inventory_id}/items`

Request:

```json
{
  "product_ids": [
    "f4ce71c7-e3d4-4d36-83ee-1f79d7ec70e4",
    "640b813f-7f2b-4e69-8d91-c22891d4f34f"
  ]
}
```

### 7) Register count

`POST /inventories/{inventory_id}/counts`

Request:

```json
{
  "product_id": "f4ce71c7-e3d4-4d36-83ee-1f79d7ec70e4",
  "quantity": 12
}
```

Notes:

- In `counting`, count type must be `first`.
- In `recounting`, count type must be `recount`.
- If `count_type` is omitted, backend derives it from inventory status.

### 8) List counts

`GET /inventories/{inventory_id}/counts`

Query params:

- `page` (default `1`)
- `page_size` (default `20`, max `100`)
- `product_id` (optional)

## Error Contract

Standard payload:

```json
{
  "message": "Mensagem de erro em pt-BR",
  "code": "domain.error_code"
}
```

Examples:

- `inventory.not_found`
- `inventory.invalid_status_transition`
- `inventory_item.already_exists`
- `inventory_item.mutation_not_allowed`
- `inventory_count.not_allowed`
- `inventory_count.invalid_type`
- `inventory.product_not_in_tenant`
