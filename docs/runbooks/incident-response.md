# Runbook de Incidente (SPEC-006)

## Objetivo

Padronizar resposta a incidentes de indisponibilidade, degradacao de performance, falhas de autenticacao/autorizacao e erros de banco no Barcode Zen Platform.

## Severidade

- `SEV-1`: indisponibilidade total de fluxos core (login, produtos, inventarios).
- `SEV-2`: degradacao relevante (latencia alta, erros recorrentes sem indisponibilidade total).
- `SEV-3`: comportamento degradado com contorno simples.

## Fluxo de resposta

## 1. Triage inicial (ate 10 minutos)

1. Confirmar alerta e escopo (tenant unico ou geral).
2. Verificar saude:
   - `GET /api/v1/health/live`
   - `GET /api/v1/health/ready`
3. Verificar metricas:
   - taxa 5xx
   - P95 latencia
   - rejeicoes de auth
4. Classificar severidade.

## 2. Contencao (ate 20 minutos)

1. Se problema de dependencia externa:
   - ativar mensagem de indisponibilidade controlada no frontend.
2. Se problema de carga:
   - reduzir operacoes pesadas temporariamente.
3. Se problema de auth/cors:
   - validar configuracao de CORS, token e tenant header.

## 3. Mitigacao e recuperacao

1. Aplicar correcao mais segura e menor possivel.
2. Validar fluxos core apos ajuste:
   - login
   - listagem de produtos
   - criacao de inventario
3. Monitorar por 30 minutos para confirmar estabilidade.

## 4. Encerramento

1. Registrar timeline completa.
2. Registrar causa raiz preliminar.
3. Abrir tarefas de prevencao (testes, alertas, hardening).

## Checklist tecnico rapido

1. `docker compose ps` para estado de backend/postgres.
2. `python -m alembic current` para versao de migration.
3. `python -m pytest -q backend/tests/test_observability_audit.py` para smoke de observabilidade.
4. Verificar `request_id` em logs estruturados para rastrear erro ponta a ponta.
5. Verificar `audit_logs` para eventos sensiveis/rejeicoes.

## Comunicacao

1. Atualizacao inicial para stakeholders em ate 15 minutos.
2. Atualizacoes periodicas a cada 30 minutos em SEV-1 e SEV-2.
3. Mensagem de encerramento com impacto, causa raiz e acoes corretivas.

## Pos-incidente (obrigatorio)

1. Postmortem em ate 48h.
2. Definir owner e prazo para cada acao corretiva.
3. Revisar necessidade de novos alertas e testes de regressao.
