# Barcode Zen Platform: Relatório de Melhoria para SaaS

## Escopo

Este relatório avalia a maturidade atual do MVP e define um plano pragmático para evoluir o projeto para um SaaS multi-tenant pronto para produção.

## Resumo Executivo

Estado atual: o produto já possui fluxos de negócio relevantes e base inicial de multiempresa, mas ainda está em nível de MVP em arquitetura, qualidade e operação.

Recomendação principal: migrar as regras críticas de negócio para o backend FastAPI, formalizar o isolamento de tenant ponta a ponta e estruturar fundações de plataforma (segurança, observabilidade, CI/CD e testes) antes de escalar complexidade funcional.

## Avaliação de Maturidade Atual

- Funcionalidade de produto: **6/10**
- Arquitetura de aplicação: **4/10**
- Prontidão para multitenancy: **4/10**
- Segurança e compliance: **4/10**
- Observabilidade e operação: **2/10**
- Qualidade e confiabilidade de testes: **2/10**

## Pontos Fortes

- Fluxos centrais do domínio já existem (produtos, ciclo de inventário, contagem, divergências, relatórios).
- O schema do Supabase já contém RLS e entidades com escopo de empresa (`empresa_id`) nas tabelas principais.
- Existe fundação de backend com arquitetura em camadas (controller/service/repository).
- O frontend está modular o suficiente para migração incremental.

## Principais Riscos e Lacunas

### 1. Risco Arquitetural

- O frontend ainda acessa Supabase diretamente para a maior parte dos fluxos.
- O backend ainda expõe apenas recurso exemplo e não é o gatekeeper de negócio.

### 2. Risco de Multitenancy

- O contexto de tenant está fortemente acoplado ao estado mutável de profile (`empresa_id`) e não totalmente centralizado no backend.
- O suporte multiempresa existe, mas troca de contexto e governança de membership precisam de validação mais rígida.

### 3. Risco de Segurança

- Regras de negócio estão distribuídas entre frontend e políticas de banco, aumentando risco de desvio entre camadas.
- Falta padronização de autorização no FastAPI.
- Não há trilha robusta de auditoria para ações sensíveis.

### 4. Risco de Performance

- Dashboard e relatórios fazem agregações pesadas no cliente.
- Bundle frontend ainda está grande, com oportunidade clara de lazy loading por rota/módulo.
- Crescimento de dados por tenant pode degradar consultas sem agregação server-side.

### 5. Risco de Confiabilidade e Operação

- Cobertura automatizada de testes ainda é muito limitada.
- Falta stack de observabilidade (logs estruturados, métricas, tracing, alertas, SLOs).
- CI/CD e governança de release ainda não estão maduras.

## Modelo Alvo para SaaS Multi-Tenant

## Modelo de tenancy recomendado

- **Banco compartilhado, schema compartilhado, isolamento estrito por `tenant_id`**.
- Toda entidade de domínio precisa ser tenant-scoped direta (`tenant_id`) ou por cadeia de FK imutável.

## Regras obrigatórias de isolamento

- Membership explícito (`user_tenant_memberships`).
- Contexto de tenant validado no backend em toda requisição.
- Todas as queries de repositório filtradas por tenant.
- Constraints de unicidade sempre com escopo de tenant.

## Acesso e autorização

- Adotar autorização por política no backend:
  - validação de membership no tenant
  - validação de role/permissão
  - validação de escopo do recurso

## Recomendações para Evolução do Banco

## Tabelas de plataforma

- `tenants`
- `users` (ou mapeamento para provedor externo de autenticação)
- `user_tenant_memberships`
- `roles`
- `permissions`
- `role_permissions`
- `audit_logs`

## Regras para tabelas de domínio

Para as entidades principais (`products`, `inventories`, `inventory_items`, `counts`, etc.):

- Incluir escopo obrigatório de tenant (`tenant_id`) quando ausente.
- Criar índices tenant-first:
  - `(tenant_id, created_at DESC)`
  - `(tenant_id, status)`
  - `(tenant_id, campo_de_busca)`
- Criar constraints únicas por tenant:
  - `UNIQUE (tenant_id, sku)`
  - `UNIQUE (tenant_id, barcode)` quando fizer sentido de negócio

## Integridade de dados

- Evitar joins cross-tenant sem controle explícito de plataforma.
- Incluir validações de consistência por tenant nas migrations.

## Evolução da Arquitetura Backend

## Arquitetura alvo

- Controllers: apenas HTTP.
- Services: regra de negócio.
- Repositories: persistência.
- Exceções de domínio centralizadas e mensagens ao usuário em pt-BR.
- Services de aplicação para orquestração entre agregados.

## Ordem de migração (frontend -> backend)

1. Módulo de produtos
2. Módulo de inventários
3. Módulo de contagens e divergências
4. Módulo de usuários/perfis/permissões
5. Módulo de relatórios e analytics

## Recomendações de Performance

## Backend e dados

- Mover agregações pesadas do dashboard para endpoints backend.
- Introduzir views/materialized views para relatórios caros.
- Adotar paginação consistente (cursor onde necessário).
- Usar jobs assíncronos para exportação e geração de relatórios.

## Frontend

- Quebrar bundle com lazy loading por rota.
- Definir políticas de cache mais explícitas no React Query.
- Evitar fetch amplo repetitivo quando apenas contadores são necessários.

## Base de Segurança e Compliance

- Centralizar autenticação/autorização no backend.
- Adicionar auditoria para mudança de role, troca de tenant e mutações críticas.
- Proteger operações privilegiadas com checagem explícita de papel/permissão.
- Segregar ambientes e segredos (dev/staging/prod).

## Base de Qualidade e Entrega

- Estabelecer pirâmide de testes:
  - unitário para services/repositories
  - integração para API + banco
  - E2E smoke para jornadas críticas
- Criar gates de CI:
  - lint
  - typecheck
  - testes
  - validação de migrations
- Definir checklist de release e estratégia de rollback.

## Roadmap de 90 Dias

## Fase 0 (Semanas 1-2): Estabilização

- Formalizar modelo de tenant e membership.
- Corrigir inconsistências de encoding e padronizar mensagens.
- Registrar ADRs de tenancy e auth.

## Fase 1 (Semanas 3-6): Backend-First Core

- Implementar APIs de produção para produtos e inventários.
- Refatorar frontend para consumir backend nesses módulos.
- Adicionar testes de integração dos fluxos migrados.

## Fase 2 (Semanas 7-10): Hardening Multi-Tenant

- Enforçar constraints e índices tenant-aware.
- Adicionar middleware/políticas de autorização em todas as APIs.
- Implementar trilha de auditoria e governança admin.

## Fase 3 (Semanas 11-13): Prontidão de Plataforma

- Adicionar observabilidade (logs, métricas, traces, alertas).
- Introduzir jobs assíncronos de relatório e otimizações de performance.
- Consolidar gates de CI/CD e controles de release.

## Definição de Pronto para Baseline SaaS

- Backend como fonte única de regra de negócio.
- Isolamento de tenant validado e coberto por testes na API e no banco.
- Módulos centrais operando somente via contrato de API.
- Segurança, observabilidade e pipeline de entrega operacionais.
- Plataforma apta para onboarding seguro e escalável de novos tenants.
