# SPEC Task Board

Quadro operacional para execucao das tarefas das specs.

## Semana 1-2 (Foundation Sprint)

| Task | Spec | Dono sugerido | Resultado esperado |
|---|---|---|---|
| T001-01 | SPEC-001 | Backend Lead | ADR de tenancy aprovado |
| T001-02 | SPEC-001 | Backend + DBA | Migrations de tenant/membership aplicadas |
| T001-03 | SPEC-001 | Backend + DBA | Backfill validado |
| T002-01 | SPEC-002 | Backend | Middleware auth pronto |
| T002-02 | SPEC-002 | Backend | Tenant context pronto |
| T002-03 | SPEC-002 | Backend | Policy engine basico pronto |

## Semana 3-4 (Core API Sprint)

| Task | Spec | Dono sugerido | Resultado esperado |
|---|---|---|---|
| T003-01..T003-05 | SPEC-003 | Backend + DBA | API de produtos pronta para consumo |
| T004-01..T004-05 | SPEC-004 | Backend + DBA | API de inventarios/contagens pronta |
| T002-07 | SPEC-002 | QA/Backend | Suite authz aprovando isolamento |
| T003-06 | SPEC-003 | QA/Backend | Suite produtos aprovada |
| T004-06 | SPEC-004 | QA/Backend | Suite inventarios aprovada |

## Semana 5-6 (Cutover Sprint)

| Task | Spec | Dono sugerido | Resultado esperado |
|---|---|---|---|
| T005-01 | SPEC-005 | Frontend | API client padrao criado |
| T005-02 | SPEC-005 | Frontend | Produtos no frontend via backend |
| T005-03 | SPEC-005 | Frontend | Inventarios no frontend via backend |
| T005-05 | SPEC-005 | Frontend | Feature flag de cutover ativa |
| T005-06..T005-07 | SPEC-005 | QA/Frontend | Fluxos core sem acesso direto a banco |

## Semana 6-7 (Partner Pilot Sprint)

| Task | Spec | Dono sugerido | Resultado esperado |
|---|---|---|---|
| T010-01..T010-03 | SPEC-010 | Platform | Frontend no Netlify com backend local via tunel HTTPS |
| T010-04..T010-05 | SPEC-010 | Backend + Platform | CORS e runbook de operacao do piloto definidos |
| T010-06..T010-08 | SPEC-010 | QA + Produto + Arquitetura | Validacao com socio e decisao de proximo ambiente |

## Semana 7-8 (Reliability Sprint)

| Task | Spec | Dono sugerido | Resultado esperado |
|---|---|---|---|
| T006-01..T006-06 | SPEC-006 | Platform + Backend | Logs, metricas, auditoria, alertas e runbook concluidos |
| T007-01..T007-04 | SPEC-007 | Platform | CI com gates obrigatorios |
| T007-05..T007-06 | SPEC-007 | Platform | Deploy governado e rollback documentado |

## Semana 9-10 (Scale Sprint)

| Task | Spec | Dono sugerido | Resultado esperado |
|---|---|---|---|
| T008-01..T008-05 | SPEC-008 | Backend | Dashboard agregado + export async |
| T008-06 | SPEC-008 | Frontend | Relatorios integrados com backend |
| T008-07 | SPEC-008 | QA/Performance | Carga basica validada |

## Semana 11+ (Monetization Sprint)

| Task | Spec | Dono sugerido | Resultado esperado |
|---|---|---|---|
| T009-01..T009-08 | SPEC-009 | Platform + Backend | Plataforma de monetizacao base ativa |
| T009-09..T009-11 | SPEC-009 | QA + Produto | Adapter e validacoes para discovery comercial |
