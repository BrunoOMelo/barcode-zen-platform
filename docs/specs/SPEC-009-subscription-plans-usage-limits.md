# SPEC-009 - Monetization Platform (Catalog, Entitlements, Metering and Billing Adapters)

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-009 |
| Prioridade | P2 |
| Status | Draft |
| Dono tecnico | Platform Engineer |
| Dono produto | Product Owner |
| Dependencias | SPEC-001, SPEC-006 |

## Contexto

O modelo de negocio ainda sera definido. Mesmo assim, a plataforma precisa nascer pronta para diferentes estrategias de monetizacao sem retrabalho estrutural.

## Problema

Se implementarmos monetizacao acoplada a um unico modelo (ex.: plano fixo simples), vamos bloquear evolucao comercial futura (seat-based, usage-based, hibrido, creditos, add-ons).

## Objetivo

Criar uma plataforma de monetizacao escalavel e agnostica de modelo comercial, com:

1. catalogo de preco versionado
2. motor de entitlements (capabilidades)
3. metering de uso confiavel
4. rating/billing desacoplado via adapters

## Fora de escopo

- Emissao fiscal completa.
- Revenue recognition contabil.
- Motor de cobranca internacional complexo nesta primeira fase.

## Requisitos funcionais

1. Definir um **product catalog versionado**:
  - produtos comerciais
  - pacotes/planos
  - add-ons
  - features/capabilidades
  - precos por moeda/ciclo
2. Definir **entitlements por tenant** baseados em catalogo:
  - limites quantitativos
  - flags de feature
  - regras de acesso por modulo
3. Definir **usage meters** reutilizaveis:
  - usuarios ativos
  - produtos cadastrados
  - inventarios ativos
  - exportacoes/relatorios
  - eventos futuros sem alterar arquitetura base
4. Implementar **pipeline de metering**:
  - ingestao de eventos de uso
  - agregacao por janela (dia/mes)
  - idempotencia e deduplicacao
5. Implementar **policy engine de limite**:
  - `allow`, `warn`, `hard_block`, `grace_period`
6. Implementar **subscription lifecycle**:
  - trial
  - active
  - past_due
  - suspended
  - canceled
7. Expor API para:
  - consultar entitlements atuais
  - consultar consumo
  - alterar pacote/assinatura
  - listar historico de eventos comerciais
8. Implementar camada de **billing provider adapter**:
  - interface padrao para provedores externos
  - troca de provedor sem refatorar dominio core

## Requisitos nao funcionais

1. Checagem de entitlement em baixa latencia (P95 <= 50ms em cache quente).
2. Metering com consistencia eventual controlada e reconciliacao diaria.
3. Idempotencia de eventos de uso.
4. Auditoria completa de mudancas de assinatura e limite.
5. Suporte a evolucao de preco sem migracao destrutiva (catalogo versionado).

## Contrato de API (minimo)

1. `GET /api/v1/billing/subscription`
2. `GET /api/v1/billing/entitlements`
3. `GET /api/v1/billing/usage`
4. `POST /api/v1/billing/change-package`
5. `POST /api/v1/billing/usage-events` (interno/plataforma)
6. `GET /api/v1/billing/catalog`

## Modelo de dados e migrations

1. `billing_products`
2. `billing_packages`
3. `billing_package_versions`
4. `billing_features`
5. `billing_prices`
6. `tenant_subscriptions`
7. `tenant_entitlements`
8. `usage_meters`
9. `usage_events`
10. `usage_aggregates`
11. `billing_events`
12. `billing_provider_links`

Todas tenant-aware quando aplicavel, com indices para consulta por `tenant_id`, `period_start`, `status`.

## Seguranca e autorizacao

1. Somente admin/owner do tenant pode alterar assinatura.
2. Toda mudanca comercial gera evento de auditoria.
3. Endpoints internos de usage-events exigem credencial de servico.
4. Bloqueio por limite nunca pode expor dados de outro tenant.

## Observabilidade

1. Metricas:
  - `entitlement_check_total`
  - `entitlement_block_total`
  - `usage_event_ingest_total`
  - `usage_event_lag_seconds`
  - `subscription_state_total`
  - `package_change_total`
2. Dashboards:
  - saude do metering pipeline
  - tenants perto do limite
  - bloqueios por capabilidade

## Criterios de aceite

1. Tenant possui assinatura, pacote e entitlements consultaveis por API.
2. Limites sao aplicados por policy engine (warn/block/grace) sem logica hardcoded por modulo.
3. Eventos de uso sao idempotentes e auditaveis.
4. Troca de pacote usa catalogo versionado sem quebrar subscriptions existentes.
5. Adapter de billing pode ser trocado sem alterar services de dominio.
6. Endpoints retornam erros de negocio claros em pt-BR.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T009-01 | Definir ADR de arquitetura de monetizacao (catalogo + entitlement + metering + adapters) | Arquitetura | 1d | SPEC-001 |
| T009-02 | Modelar schema escalavel de billing (catalog versionado e subscriptions) | Dados | 1.5d | T009-01 |
| T009-03 | Criar migrations de `usage_meters`, `usage_events`, `usage_aggregates` | Dados | 1d | T009-02 |
| T009-04 | Implementar ingestion idempotente de usage events | Backend | 1d | T009-03 |
| T009-05 | Implementar aggregator e reconciliacao de uso | Backend | 1d | T009-04 |
| T009-06 | Implementar entitlement service com policies `warn/block/grace` | Backend | 1d | T009-02 |
| T009-07 | Integrar entitlement checks em operacoes core selecionadas | Backend | 1d | T009-06 |
| T009-08 | Implementar contratos API (`subscription`, `entitlements`, `usage`, `catalog`) | Backend | 1d | T009-06 |
| T009-09 | Implementar interface de billing provider adapter + mock provider | Backend | 1d | T009-01 |
| T009-10 | Testes de integracao (idempotencia, bloqueio, troca de pacote versionado) | Teste | 1.5d | T009-08 |
| T009-11 | Documento de estrategia comercial tecnica para discovery de business model | Documentacao | 0.5d | T009-08 |
