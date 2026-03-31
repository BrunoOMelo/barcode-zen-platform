# Frontend

React + Vite + TypeScript application extracted from the MVP and organized for independent development.

## Structure

- `src/app`: application shell and route definitions
- `src/components`: reusable UI and feature components
- `src/hooks`: data and state hooks
- `src/platform`: backend platform client/session/types
- `src/integrations`: legacy integrations (non-core modules)
- `src/lib`: shared utility helpers
- `src/pages`: route pages

## Run

```bash
npm install
npm run dev
```

Default URL: `http://localhost:5173`

## Platform Flow (Backend API)

Core modules (`products`, `inventories`, `counts`) use backend API only.

1. Open `http://localhost:5173/login`
2. Fill backend URL, e-mail and password
3. Validate access and select tenant
4. Enter the platform

Advanced mode with manual JWT token is still available in the login page.

Feature flags:

- `VITE_PLATFORM_CUTOVER_PRODUCTS=true`
- `VITE_PLATFORM_CUTOVER_INVENTORIES=true`

## Playwright MCP

Playwright MCP is installed for browser-driven validation:

```bash
npm run mcp:playwright
```

## E2E Validation

1. Prepare backend data:

```bash
cd ../backend
python -m alembic upgrade head
python scripts/seed_platform_e2e.py
```

2. Start backend and frontend servers.
3. Run E2E tests:

```bash
npm run e2e
```

## Build

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env` and fill values:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_PLATFORM_API_BASE_URL`
- `VITE_PLATFORM_CUTOVER_PRODUCTS`
- `VITE_PLATFORM_CUTOVER_INVENTORIES`
