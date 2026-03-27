# SPEC-008 - Reporting Performance and Async Exports

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-008 |
| Prioridade | P1 |
| Status | Draft |
| Dono tecnico | Backend Lead |
| Dono produto | Product Owner |
| Dependencias | SPEC-004, SPEC-006 |

## Contexto

Relatorios e dashboard ainda dependem de agregacoes no cliente e consultas potencialmente custosas.

## Problema

Com crescimento de dados por tenant, o tempo de resposta tende a piorar e impactar UX.

## Objetivo

Mover agregacoes para backend e implementar exportacao assicrona para relatorios pesados.

## Fora de escopo

- BI completo com cubos analiticos.
- Data warehouse dedicado nesta fase.

## Requisitos funcionais

1. Endpoint agregado de dashboard por tenant.
2. Endpoint de relatorio paginado para visualizacao.
3. Job assicrono para exportacao CSV/XLSX/PDF.
4. Endpoint de status/download de job.

## Requisitos nao funcionais

1. Dashboard P95 <= 400ms para tenant medio.
2. Exportacao pesada nao bloqueia thread de API.
3. Timeout de API nao impacta geracao de arquivo.

## Contrato de API (minimo)

1. `GET /api/v1/dashboard/summary`
2. `GET /api/v1/reports/inventories/{id}`
3. `POST /api/v1/reports/exports`
4. `GET /api/v1/reports/exports/{job_id}`

## Modelo de dados e migrations

1. Criar tabela `report_export_jobs` tenant-aware.
2. Armazenar status (`queued`, `processing`, `completed`, `failed`).
3. Armazenar metadados de arquivo gerado.

## Seguranca e autorizacao

1. Usuario so acessa exports do proprio tenant.
2. Download protegido por autorizacao e expira em tempo definido.

## Observabilidade

1. Metricas de fila:
  - `report_jobs_queued`
  - `report_jobs_duration`
  - `report_jobs_failed`
2. Logs por job com `tenant_id` e `job_id`.

## Criterios de aceite

1. Dashboard principal nao depende de agregacao no frontend.
2. Exportacao de grande volume roda async sem timeout de API.
3. Usuario acompanha status e baixa arquivo quando pronto.
4. Testes de integracao cobrem fluxo completo de export.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T008-01 | Implementar endpoint agregado de dashboard | Backend | 1d | SPEC-004 |
| T008-02 | Definir worker async (Celery/Arq/RQ) e padrao de job | Arquitetura | 0.5d | SPEC-006 |
| T008-03 | Criar tabela `report_export_jobs` + migration | Dados | 0.5d | T008-02 |
| T008-04 | Implementar criacao e processamento de jobs de export | Backend | 1.5d | T008-03 |
| T008-05 | Implementar endpoints de status/download | Backend | 0.5d | T008-04 |
| T008-06 | Integrar frontend aos novos endpoints | Frontend | 1d | T008-05 |
| T008-07 | Testes de carga basicos e integracao de export | Teste | 1d | T008-05 |
