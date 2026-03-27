# Sprint 01 - Foundation Plan (Semanas 1-2)

Plano operacional para executar o P0 inicial das specs:

- SPEC-001 (Tenant Platform Foundation)
- SPEC-002 (Authentication, Authorization and Tenant Context)

## 1. Objetivo da sprint

Sair da sprint com fundacao de tenancy e autorizacao funcionando no backend, com validacao tecnica e testes minimos.

## 2. Escopo fechado da sprint

Tasks alvo:

- T001-01
- T001-02
- T001-03
- T001-04
- T001-05
- T001-07
- T002-01
- T002-02
- T002-03
- T002-04
- T002-05
- T002-06

Tasks fora da sprint (proxima janela):

- T001-06
- T002-07
- T002-08

## 2.1 Status de execucao (atual)

| Task | Status | Evidencia |
|---|---|---|
| T001-01 | Done (proposed, aguardando aceite PO) | `docs/adr/ADR-001-tenancy-model.md` |
| T001-02 | Done | Migration `20260308_0002` aplicada com `alembic upgrade head` |
| T001-03 | Done | `backend/scripts/backfill_tenants.py` (dry-run + run executados) |
| T001-04 | Not started | - |
| T001-05 | Not started | - |
| T001-07 | Not started | - |
| T002-01 | Done | `RequestAuthMiddleware` registrado em `app/api/app.py` |
| T002-02 | Not started | - |
| T002-03 | Not started | - |
| T002-04 | Not started | - |
| T002-05 | Not started | - |
| T002-06 | Not started | - |

## 3. Time e papeis sugeridos

- Backend Lead: arquitetura, middleware auth, policy engine
- Backend Engineer: endpoints de contexto e switch tenant
- DBA/Backend: migrations, backfill, indices e constraints
- QA Engineer: smoke tecnico de auth/tenant e validacao de regressao basica
- Product Owner: aprovacoes de regras de negocio e naming

## 4. Sequencia de execucao (dia a dia)

## Dia 1

- T001-01: ADR de tenancy e decisao de naming (`tenant` x `empresa`)
- Definir padrao de `tenant_id` em dominio core

Saida do dia:

- ADR aprovada
- decisoes bloqueantes resolvidas
- referencia: `docs/adr/ADR-001-tenancy-model.md`

## Dia 2

- T001-02: migration de `tenants`/`user_tenant_memberships`
- estrutura inicial de constraints e chaves

Saida do dia:

- migrations criadas e executando localmente

## Dia 3

- T001-03: backfill de tenant data
- script de consistencia (detectar orfaos e inconsistencias)

Saida do dia:

- dados legados com tenant mapping consistente

## Dia 4

- T001-04 + T001-05: adicionar `tenant_id` faltante, indices tenant-first, uniques tenant-aware

Saida do dia:

- schema core tenant-aware completo

## Dia 5

- T002-01: middleware de auth e resolve de usuario
- T002-06 (parcial): padrao de erro de auth em pt-BR

Saida do dia:

- rotas protegidas ja exigindo autenticacao valida

## Dia 6

- T002-02: resolve de tenant ativo por header + membership

Saida do dia:

- request context com `current_user` + `current_tenant`

## Dia 7

- T002-03: camada de autorizacao por policy (RBAC/permissao)

Saida do dia:

- autorizacao default deny operacional

## Dia 8

- T002-04: endpoint `/api/v1/me/context`
- T002-05: endpoint `/api/v1/me/switch-tenant`

Saida do dia:

- contratos de contexto e troca de tenant operacionais

## Dia 9

- T001-07: atualizar `docs/architecture.md`
- consolidar padrao de erros e contratos de resposta
- preparar evidencias tecnicas da sprint

Saida do dia:

- documentacao alinhada com implementacao

## Dia 10

- hardening final
- smoke tecnico integrado da sprint
- review e fechamento

Saida do dia:

- Sprint Review com checklist de aceite completo

## 5. Checklist de aceite por task

## T001-01

- ADR publicada em docs
- naming e estrategia de convergencia aprovados

## T001-02

- migrations executam `upgrade` e `downgrade`
- sem quebra de schema existente

## T001-03

- script de backfill idempotente
- relatorio de inconsistencias gerado

## T001-04 / T001-05

- entidades core com tenant scope verificavel
- indices e constraints tenant-aware aplicados

## T002-01 / T002-02

- auth obrigatoria em rotas protegidas
- tenant context obrigatorio e validado

## T002-03

- policy layer centralizada
- operacao sem permissao retorna erro esperado

## T002-04 / T002-05

- endpoint de contexto retorna usuario + tenant + permissoes
- switch de tenant bloqueia membership invalido

## T002-06

- mensagens de erro para usuario final em pt-BR
- formato de erro padronizado

## T001-07

- arquitetura documentada sem divergencia com codigo

## 6. Criterios de saida da sprint

1. Todas as tasks de escopo fechado concluidas.
2. Sem endpoint de negocio protegido funcionando sem auth + tenant.
3. Schema core com tenant scope e constraints principais aplicados.
4. Endpoints de contexto e switch tenant funcionando.
5. Evidencias tecnicas anexadas (migrations, logs, testes smoke).

## 7. Riscos e mitigacoes

1. Risco: divergencia entre `empresa` legado e `tenant` novo.
   - Mitigacao: ADR com plano de convergencia e aliases claros.
2. Risco: regressao por migration em dados legados.
   - Mitigacao: backfill idempotente + validacao por script + rollback testado.
3. Risco: autorizacao dispersa por endpoint.
   - Mitigacao: policy engine central + default deny.

## 8. Decisoes que precisam de aprovacao do produto

1. Nome canonico de dominio: manter `empresa` ou adotar `tenant` com migracao gradual.
2. Regras de troca de tenant (restricoes por papel, sessao e auditoria).
3. Mensagens de erro padrao para auth/authz no frontend.

## 9. Proxima sprint (previsao)

Apos completar esta sprint, iniciar:

- SPEC-003 (Products Domain API)
- SPEC-004 (Inventories and Counting Domain API)
