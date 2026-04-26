# Dashboards e Alertas Minimos (SPEC-006)

## Objetivo

Definir um baseline operacional para detectar indisponibilidade, degradacao de performance e aumento de erros de autenticacao/autorizacao no SaaS.

## Metricas disponiveis

Endpoint: `GET /api/v1/metrics`

- `barcodezen_http_requests_total{method,path,status_code,outcome}`
- `barcodezen_http_request_duration_ms_bucket{method,path,le}`
- `barcodezen_auth_rejections_total{error_code}`
- `barcodezen_db_ready_checks_total{status}`
- `barcodezen_db_ready_check_duration_ms_bucket{status,le}`

## Dashboards recomendados

## 1. API Overview

- Requisicoes por minuto:
  - `sum(rate(barcodezen_http_requests_total[5m]))`
- Taxa de erro 5xx:
  - `sum(rate(barcodezen_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(barcodezen_http_requests_total[5m]))`
- P95 latencia global:
  - `histogram_quantile(0.95, sum(rate(barcodezen_http_request_duration_ms_bucket[5m])) by (le))`

## 2. Auth and Tenant Protection

- Rejeicoes por codigo:
  - `sum(rate(barcodezen_auth_rejections_total[5m])) by (error_code)`
- Top rotas com rejeicao:
  - `sum(rate(barcodezen_http_requests_total{outcome="rejected"}[10m])) by (path, status_code)`

## 3. Readiness and Database

- Readiness ok x error:
  - `sum(rate(barcodezen_db_ready_checks_total[5m])) by (status)`
- P95 tempo do ready check:
  - `histogram_quantile(0.95, sum(rate(barcodezen_db_ready_check_duration_ms_bucket[5m])) by (le, status))`

## Alertas minimos (staging e producao)

## Alerta 1 - API indisponivel (critical)

- Condicao:
  - `sum(rate(barcodezen_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(barcodezen_http_requests_total[5m])) > 0.05`
- Janela: `for: 10m`
- Acao:
  - Acionar responsavel de plantao.
  - Abrir incidente.

## Alerta 2 - Latencia elevada (warning)

- Condicao:
  - `histogram_quantile(0.95, sum(rate(barcodezen_http_request_duration_ms_bucket[5m])) by (le)) > 800`
- Janela: `for: 10m`
- Acao:
  - Investigar endpoints dominantes por `path`.

## Alerta 3 - Rejeicao de auth fora do padrao (warning)

- Condicao:
  - `sum(rate(barcodezen_auth_rejections_total[10m])) > 20`
- Janela: `for: 15m`
- Acao:
  - Verificar expiracao massiva de token, CORS e headers `Authorization`/`X-Tenant-Id`.

## Alerta 4 - Banco degradado (critical)

- Condicao:
  - `sum(rate(barcodezen_db_ready_checks_total{status="error"}[5m])) > 0`
- Janela: `for: 5m`
- Acao:
  - Executar runbook de incidente.

## Convencoes operacionais

1. Todo alerta deve ter owner tecnico e canal de notificacao.
2. Todo alerta critical vira incidente com timeline registrada.
3. Alteracao de limiar de alerta precisa de registro no changelog operacional.
