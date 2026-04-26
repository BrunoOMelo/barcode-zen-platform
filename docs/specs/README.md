# Specs SaaS - Barcode Zen Platform

Este diretorio contem as especificacoes oficiais (SDD) para evolucao do projeto para um SaaS multi-tenant de producao.

## Estado das specs

| ID | Nome | Prioridade | Status |
|---|---|---|---|
| SPEC-001 | Tenant Platform Foundation | P0 | Implemented (Sprint 01) |
| SPEC-002 | Authentication, Authorization and Tenant Context | P0 | Implemented (Sprint 01) |
| SPEC-003 | Products Domain API | P0 | Implemented (Closed 2026-03-31) |
| SPEC-004 | Inventories and Counting Domain API | P0 | Implemented (Closed 2026-04-06) |
| SPEC-005 | Frontend Backend Integration Cutover | P0 | Implemented (Closed 2026-03-31) |
| SPEC-006 | Observability, Audit and Incident Response | P1 | Implemented (Closed 2026-04-26) |
| SPEC-007 | Quality Gates, CI/CD and Release Governance | P1 | Draft |
| SPEC-008 | Reporting Performance and Async Exports | P1 | Draft |
| SPEC-009 | Monetization Platform (Catalog, Entitlements, Metering and Billing Adapters) | P2 | Draft |
| SPEC-010 | Partner Pilot Environment (Netlify Frontend + Local Backend Tunnel) | P1 | Closed (Scope reduced 2026-04-06) |

## Regras para usar este pacote de specs

1. Nenhuma implementacao comeca sem spec aprovada.
2. Toda spec deve ter tarefas com dono, estimativa e criterio de aceite.
3. Toda task deve referenciar um ID de spec.
4. Toda PR deve informar quais criterios de aceite da spec foram atendidos.
5. Alteracoes de escopo atualizam a spec antes de atualizar codigo.

## Ordem recomendada de execucao

1. SPEC-001
2. SPEC-002
3. SPEC-003
4. SPEC-004
5. SPEC-005
6. SPEC-010
7. SPEC-006
8. SPEC-007
9. SPEC-008
10. SPEC-009

## Documento de planejamento

Ver backlog consolidado em [SPEC-BACKLOG-MASTER.md](/c:/Users/Bruno%20Melo/OneDrive/Documentos/GitHub/barcode-zen-platform/docs/specs/SPEC-BACKLOG-MASTER.md).

Plano de execucao imediato em [SPRINT-01-FOUNDATION-PLAN.md](/c:/Users/Bruno%20Melo/OneDrive/Documentos/GitHub/barcode-zen-platform/docs/specs/SPRINT-01-FOUNDATION-PLAN.md).
