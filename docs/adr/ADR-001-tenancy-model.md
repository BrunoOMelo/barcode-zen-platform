# ADR-001 - Tenancy Model and Naming Convergence

## Status

Proposed

## Date

2026-03-08

## Context

The current MVP uses `empresa` as business term and has partial multi-company support.  
The SaaS roadmap requires strict tenant isolation across backend, database, and authorization.

Without a canonical tenancy model, teams may implement inconsistent logic (`empresa_id` in some flows, user profile context in others), creating security and maintenance risks.

## Decision

Adopt a canonical platform concept:

- Platform term: `tenant`
- Business display term (UI/product): `empresa` (pt-BR)

Convergence strategy:

1. Keep existing business semantics in UI and communication (`empresa`).
2. Standardize backend/domain internals to `tenant`.
3. Map legacy `empresa_id` to `tenant_id` through migration and compatibility layer.
4. Require tenant context in all protected backend operations.

## Target model

- `tenants` (canonical tenant table)
- `user_tenant_memberships` (membership and tenant access)
- Domain resources are tenant-scoped by:
  - direct `tenant_id`, or
  - strict FK ownership chain to a tenant-scoped aggregate

## Compatibility rules

1. During transition, APIs may accept legacy references, but internal processing must resolve to `tenant_id`.
2. New backend services/repositories use `tenant_id` only.
3. Old `empresa_id` usage is treated as legacy debt and removed by phased cutover.

## Consequences

Positive:

- Consistent technical model for multi-tenant security.
- Better long-term maintainability and clearer authorization boundaries.
- Decouples business language from platform internals.

Trade-offs:

- Requires migration effort and temporary compatibility code.
- Requires coordinated refactor in frontend integration phase.

## Implementation plan (phased)

1. Introduce tenancy tables and migration scaffolding.
2. Add tenant resolution middleware and policy enforcement.
3. Refactor repositories/services to mandatory tenant filters.
4. Cut frontend to backend APIs using tenant context.
5. Remove legacy direct `empresa_id` paths after validation.

## Validation criteria

1. No protected endpoint executes without resolved tenant context.
2. Integration tests prove tenant isolation.
3. Cross-tenant access attempts are denied and audited.
