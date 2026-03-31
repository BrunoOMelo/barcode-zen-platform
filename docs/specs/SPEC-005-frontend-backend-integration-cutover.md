# SPEC-005 - Frontend Backend Integration Cutover

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-005 |
| Prioridade | P0 |
| Status | In Progress |
| Dono tecnico | Frontend Lead |
| Dono produto | Product Owner |
| Dependencias | SPEC-003, SPEC-004 |

## Contexto

Atualmente o frontend usa Supabase diretamente em hooks de dominio.

## Problema

Acesso direto ao banco no cliente impede centralizacao de regras, dificulta compliance e aumenta superficie de risco.

## Objetivo

Migrar frontend para consumir API backend em todos os fluxos core, mantendo experiencia de usuario estavel.

## Fora de escopo

- Redesign completo de UI.
- Reescrita total do frontend.

## Requisitos funcionais

1. Criar client HTTP padrao para backend.
2. Migrar hooks de produtos, inventarios, contagens e dashboard.
3. Preservar comportamento de telas e fluxos existentes.
4. Tratar erros de API de forma padronizada.

## Requisitos nao funcionais

1. Sem regressao de fluxo critico.
2. Tempo de tela principal equivalente ou melhor.
3. Feature toggle para rollback controlado.

## Contrato de integracao

1. Frontend envia token e `X-Tenant-Id`.
2. Frontend usa APIs documentadas em OpenAPI.
3. Mapeamento de erro backend -> toast/UI padrao.

## Seguranca e autorizacao

1. Nenhum dado de dominio core vindo de acesso direto ao banco no frontend.
2. Tenant context sempre enviado pelo client API.

## Observabilidade

1. Instrumentar erros de frontend por endpoint.
2. Medir taxa de sucesso de chamadas por modulo.

## Criterios de aceite

1. Hooks core nao usam mais query direta ao banco.
2. Fluxos principais (produtos, inventarios, contagens) aprovados em smoke test.
3. Rollback de integracao disponivel via feature flag.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T005-01 | Criar camada `apiClient` com interceptors e tenant header | Frontend | 1d | SPEC-002 |
| T005-02 | Migrar hook de produtos para backend API | Frontend | 1d | SPEC-003 |
| T005-03 | Migrar hooks de inventario/contagem para backend API | Frontend | 1.5d | SPEC-004 |
| T005-04 | Migrar dashboard para endpoint agregado backend | Frontend | 1d | SPEC-008 |
| T005-05 | Adicionar feature flags para cutover por modulo | Frontend | 0.5d | T005-01 |
| T005-06 | Executar smoke test dos fluxos criticos | QA | 1d | T005-03 |
| T005-07 | Remover acessos diretos de dominio ao Supabase no frontend | Frontend | 0.5d | T005-06 |

## Progresso de implementacao (2026-03-31)

- [x] T005-01 - client padrao para backend em `src/platform/api.ts`.
- [x] T005-02 - `useProdutos` migrado para backend-only.
- [x] T005-03 - `useInventarios`/`contagens` migrados para backend-only.
- [x] T005-04 - dashboard agregado backend em `GET /api/v1/dashboard/summary` + `useDashboard` backend-driven.
- [x] T005-05 - feature flags de cutover (`VITE_PLATFORM_CUTOVER_*`) adicionadas.
- [x] T005-06 - smoke test E2E executado com Playwright (`tests/e2e/platform-cutover.spec.ts`).
- [ ] T005-07 - remocao total de acessos diretos legacy ainda pendente em modulos fora do core.
