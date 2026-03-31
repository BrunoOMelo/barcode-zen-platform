# ADR-002 - Inventory Status State Machine

## Status

Accepted

## Date

2026-03-27

## Context

Inventories need deterministic status transitions to avoid inconsistent counting behavior between frontend and backend.

Without a centralized state machine, each client may implement different transition rules and allow invalid operations (for example, counting on a closed inventory).

## Decision

Adopt a backend-controlled inventory state machine with explicit transitions and operation guards.

Statuses:

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

Disallowed transitions return `inventory.invalid_status_transition`.

Operation guards:

- Add/update inventory items: allowed only in `created` and `counting`.
- Register count: allowed only in `counting` (`first`) and `recounting` (`recount`).
- Final status `finished` is immutable.

## Consequences

Positive:

- Business rules become predictable and testable.
- Frontend complexity is reduced because transition rules are not duplicated client-side.
- Unauthorized or inconsistent transitions are blocked uniformly.

Trade-offs:

- Some legacy flows may require adaptation if they relied on direct status updates.
- Additional tests are required to preserve transition integrity over time.

## Validation Criteria

1. Transition matrix is covered by integration tests.
2. Count endpoint rejects unsupported status or count type.
3. API returns standardized error contract (`message`, `code`) for invalid transitions.
