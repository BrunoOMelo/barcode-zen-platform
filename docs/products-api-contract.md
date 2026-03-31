# Products API Contract

Contract reference for `SPEC-003` product domain endpoints.

Base path: `/api/v1/products`

## Security

All endpoints require:

- `Authorization: Bearer <jwt_token>`
- `X-Tenant-Id: <tenant_uuid>`

Permissions:

- `GET /products` and `GET /products/{id}` => `products:read`
- `POST /products` and `PUT /products/{id}` => `products:write`
- `DELETE /products/{id}` => `products:delete`

## Query parameters (`GET /products`)

- `page` (default `1`)
- `page_size` (default `20`, max `100`)
- `search` (optional, search on `name`, `description`, `sku`, `barcode`)
- `active` (optional boolean)
- `category` (optional string)

## Product payload fields

- `name` (required)
- `sku` (optional on create, auto-fallback to barcode)
- `barcode` (required)
- `description` (optional)
- `category` (optional)
- `active` (default `true`)
- `cost` (optional)
- `price` (optional)
- `quantity` (default `0`)

Business validations:

- `price >= cost` when both are informed
- uniqueness by tenant:
  - `(tenant_id, sku)`
  - `(tenant_id, barcode)`

## Response examples

### `GET /products`

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0,
  "total_pages": 0
}
```

### Error contract

```json
{
  "message": "Mensagem em pt-BR",
  "code": "namespace.error_code"
}
```

Common product error codes:

- `product.not_found` (`404`)
- `product.duplicate_sku` (`409`)
- `product.duplicate_barcode` (`409`)
- `product.invalid_pricing` (`400`)
- `auth.permission_denied` (`403`)
- `tenant.membership_required` (`403`)
