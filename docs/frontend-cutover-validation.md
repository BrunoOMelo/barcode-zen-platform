# Frontend Cutover Validation (SPEC-005)

Date: 2026-03-31

## Scope validated

- Platform login and tenant context
- Products list via backend API
- Inventories list via backend API
- Dashboard summary via backend API (`GET /api/v1/dashboard/summary`)
- Tenant switch data isolation
- Authorization block for viewer role on product creation

## Validation stack

- Playwright MCP package installed (`@playwright/mcp`)
- Playwright E2E tests (`@playwright/test`) for automated UI validation

## Commands executed

```bash
cd backend
python -m alembic upgrade head
python scripts/seed_platform_e2e.py

cd ../frontend
npm run e2e -- --reporter=line --workers=1
```

## Result

- E2E tests: `3 passed`
- Frontend typecheck: `OK`
- Frontend build: `OK`
- Backend dashboard integration tests: `2 passed` (`backend/tests/test_dashboard_summary_api.py`)
- Frontend bootstrap sem dependencia ativa de Supabase (`src/app/App.tsx` sem `AuthProvider` legado)
- Supabase removido dos modulos de frontend do produto atual (sem imports/residuos em `src`)

## E2E test file

- `frontend/tests/e2e/platform-cutover.spec.ts`

## Seed and test data

- `backend/scripts/seed_platform_e2e.py`
- Output file: `frontend/.e2e-seed.json`

## Remaining legacy Supabase usage (outside core inventory/product/dashboard)

- Nenhum no frontend atual (`rg -n supabase frontend/src` sem resultados).
