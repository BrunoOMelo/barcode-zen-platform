# Architecture Overview

## Repository layout

- `frontend/`: React/Vite client application
- `backend/`: FastAPI service with layered architecture
- `infra/`: local infrastructure and future deployment placeholders
- `docs/`: architecture and project documentation

## Backend layers

- `controllers`: HTTP-only concerns (request/response mapping)
- `services`: business rules and transaction orchestration
- `repositories`: persistence logic with SQLAlchemy
- `models`: database entities
- `schemas`: request/response DTOs
- `exceptions`: centralized custom domain exceptions and handlers
- `db`: engine/session setup and metadata exports
- `core`: app configuration

This separation keeps business logic out of controllers and avoids direct SQL access from the API layer.

## Data flow

`Controller -> Service -> Repository -> Database`

## Error handling

Custom domain exceptions are centralized and return pt-BR messages for users.
