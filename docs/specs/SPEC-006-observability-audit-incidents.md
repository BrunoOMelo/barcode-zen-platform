# SPEC-006 - Observability, Audit and Incident Response

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-006 |
| Prioridade | P1 |
| Status | Implemented (Closed 2026-04-26) |
| Dono tecnico | Platform Engineer |
| Dono produto | Product Owner |
| Dependencias | SPEC-002 |

## Contexto

Sem observabilidade, nao ha como operar SaaS de forma confiavel.

## Problema

Falhas de autorizacao, performance e dados podem passar despercebidas sem logs, metricas e auditoria estruturada.

## Objetivo

Criar baseline operacional com monitoramento, auditoria e procedimento de incidentes.

## Fora de escopo

- SOC completo.
- Plataforma de SIEM enterprise nesta fase.

## Requisitos funcionais

1. Logs estruturados por request com `request_id`, `user_id`, `tenant_id`.
2. Metricas de API, authz e banco.
3. Audit log para operacoes sensiveis.
4. Health checks padronizados (`live`, `ready`).
5. Runbook de incidentes.

## Requisitos nao funcionais

1. Rastreabilidade ponta a ponta de requisicao.
2. Alertas para erro 5xx e latencia elevada.
3. Retencao minima de logs conforme politica.

## Modelo de dados e migrations

1. Criar tabela `audit_logs` tenant-aware.
2. Definir estrategia de retencao/particionamento.

## Seguranca e autorizacao

1. Audit log imutavel para eventos criticos.
2. Acesso de leitura de auditoria restrito.

## Observabilidade (implementacao)

1. Estruturar logger JSON.
2. Exportar metricas Prometheus/OpenTelemetry.
3. Tracing basico em rotas criticas.

## Criterios de aceite

1. Toda rota core gera logs estruturados.
2. Operacoes sensiveis sao registradas em `audit_logs`.
3. Alertas basicos disparam em ambiente de staging.
4. Runbook de incidente documentado.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T006-01 | Definir padrao de log estruturado e correlation id | Plataforma | 0.5d | - |
| T006-02 | Instrumentar middleware de logging e metricas | Backend | 1d | T006-01 |
| T006-03 | Criar modelo e migration de `audit_logs` | Dados | 1d | SPEC-001 |
| T006-04 | Implementar escrita de auditoria em eventos criticos | Backend | 1d | T006-03 |
| T006-05 | Configurar dashboards e alertas minimos | Plataforma | 1d | T006-02 |
| T006-06 | Criar runbook de incidente e operacao | Documentacao | 0.5d | T006-05 |

## Progresso de implementacao (Closed 2026-04-26)

- [x] T006-01 - Padrao de logging estruturado e `request_id` definido no middleware.
- [x] T006-02 - Middleware com metricas HTTP/auth e endpoint Prometheus (`GET /api/v1/metrics`).
- [x] T006-03 - Modelo + migration `audit_logs` criada e aplicada (`20260426_0007_create_audit_logs.py`).
- [x] T006-04 - Escrita de auditoria implementada para mutacoes e rejeicoes de seguranca.
- [x] T006-05 - Dashboards e alertas minimos definidos em `docs/observability/dashboards-alerts.md`.
- [x] T006-06 - Runbook de incidentes definido em `docs/runbooks/incident-response.md`.

## Evidencias de fechamento

1. Metricas:
   - `backend/app/core/metrics.py`
   - `backend/app/controllers/metrics_controller.py`
2. Auditoria:
   - `backend/app/models/audit_log.py`
   - `backend/app/services/audit_log_service.py`
   - `backend/app/repositories/audit_log_repository.py`
   - `backend/migrations/versions/20260426_0007_create_audit_logs.py`
3. Integracao middleware/health:
   - `backend/app/core/middleware.py`
   - `backend/app/controllers/health_controller.py`
4. Validacao automatizada:
   - `backend/tests/test_observability_audit.py`
   - `python -m pytest -q backend/tests` -> `34 passed`
