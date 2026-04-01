# ADR-003 - Partner Pilot with Netlify Frontend and Local Backend Tunnel

## Status

Accepted

## Date

2026-03-31

## Context

O time precisa validar rapidamente o produto com o socio em ambiente externo, antes de provisionar backend cloud definitivo.

O frontend ja esta backend-driven e pode ser publicado como SPA estatico. O backend (FastAPI + PostgreSQL) ainda opera localmente no ambiente do time.

## Decision

Adotar arquitetura de piloto:

1. Frontend publicado no Netlify (deploy automatico da branch `main`).
2. Backend executando localmente (maquina do time).
3. Exposicao do backend local por tunel HTTPS temporario (ngrok/cloudflared).
4. Frontend apontando para URL HTTPS do tunel via `VITE_PLATFORM_API_BASE_URL`.
5. CORS do backend liberando somente:
   - dominio do frontend no Netlify
   - dominio do tunel ativo
   - origens locais de desenvolvimento

## Consequences

Positivas:

- URL compartilhavel para validacao com socio sem esperar infraestrutura final.
- Custo baixo e setup rapido.
- Mantem arquitetura principal (frontend separado do backend) sem retrabalho.

Trade-offs:

- Disponibilidade depende da maquina local e da sessao do tunel.
- Nao ha SLA de producao.
- URL do tunel pode mudar (especialmente plano gratuito).

## Guardrails

1. Ambiente classificado como piloto/homologacao externa, nao producao final.
2. Somente contas e dados de teste.
3. Segredos continuam no backend local; frontend recebe apenas `VITE_*`.
4. Check operacional de start/stop e smoke test obrigatorio por sessao.

## Validation Criteria

1. Frontend abre pelo dominio Netlify e autentica no backend via tunel.
2. Fluxos core (login, tenant, produtos, inventarios) executam sem erro de CORS.
3. Time consegue repetir setup em ate 15 minutos usando runbook.
