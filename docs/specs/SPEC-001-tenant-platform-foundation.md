# SPEC-001 - Tenant Platform Foundation

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-001 |
| Prioridade | P0 |
| Status | Draft |
| Dono tecnico | Backend Lead |
| Dono produto | Product Owner |
| Dependencias | - |

## Contexto

O MVP possui suporte parcial a multiempresa, mas ainda sem um modelo de tenant unificado e governado pelo backend.

## Problema

Sem fundacao formal de tenant, ha risco de vazamento de dados entre empresas e inconsistencias de autorizacao.

## Objetivo

Criar uma fundacao unica de tenancy que seja obrigatoria para todas as camadas (API, DB e seguranca).

## Fora de escopo

- Implementar billing de planos.
- Reescrever todo schema legado em uma unica entrega.

## Requisitos funcionais

1. Definir tenant como entidade de plataforma.
2. Definir membership explicito usuario-tenant.
3. Definir tenant ativo por sessao/requisicao.
4. Garantir que todo recurso core seja tenant-scoped.

## Requisitos nao funcionais

1. Zero cross-tenant read/write sem autorizacao.
2. Rastreabilidade de operacoes por tenant.
3. Migrations reversiveis.

## Modelo de dados e migrations

1. Criar tabela `tenants` (ou formalizar `empresas` como alias de tenant com plano de convergencia).
2. Criar `user_tenant_memberships` com `user_id`, `tenant_id`, `role`, `status`.
3. Adicionar `tenant_id` nas tabelas core quando ausente.
4. Criar indices tenant-first nas tabelas core.
5. Ajustar constraints de unicidade para escopo tenant.

## Seguranca e autorizacao

1. Nenhuma query sem filtro tenant no repositorio.
2. Nenhuma mutacao sem membership valido.
3. Nenhuma troca de tenant sem verificacao de membership ativo.

## Observabilidade

1. Todo log de request deve incluir `tenant_id`.
2. Eventos de troca de tenant devem ser auditados.

## Plano de rollout

1. Criar schema novo sem quebrar leitura atual.
2. Backfill de dados tenant para tabelas legadas.
3. Ativar validacoes no backend.
4. Bloquear endpoints sem tenant context.
5. Remover caminhos legados apos cutover.

## Criterios de aceite

1. Todas as tabelas core possuem escopo de tenant validado.
2. Testes de integracao comprovam isolamento entre tenants.
3. Requisicoes sem tenant valido retornam 403/401.
4. Auditoria registra troca de tenant.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T001-01 | ADR do modelo de tenancy e naming (`tenant` vs `empresa`) | Arquitetura | 0.5d | - |
| T001-02 | Migration de `tenants`/`user_tenant_memberships` | Dados | 1d | T001-01 |
| T001-03 | Backfill e script de consistencia de tenant | Dados | 1d | T001-02 |
| T001-04 | Adicionar `tenant_id` em entidades core faltantes | Dados | 1d | T001-02 |
| T001-05 | Ajustar indices e uniques tenant-aware | Dados | 1d | T001-04 |
| T001-06 | Criar testes de isolamento cross-tenant no DB | Teste | 1d | T001-05 |
| T001-07 | Documentar modelo final em `docs/architecture.md` | Documentacao | 0.5d | T001-01 |
