# Frontend

React + Vite + TypeScript application extracted from the MVP and organized for independent development.

## Structure

- `src/app`: application shell and route definitions
- `src/components`: reusable UI and feature components
- `src/hooks`: data and state hooks
- `src/integrations`: integration clients (currently Supabase)
- `src/lib`: shared utility helpers
- `src/pages`: route pages

## Run

```bash
npm install
npm run dev
```

Default URL: `http://localhost:8080`

## Build

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env` and fill values:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
