# SPEC-002 - Authentication, Authorization and Tenant Context

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-002 |
| Prioridade | P0 |
| Status | Draft |
| Dono tecnico | Backend Lead |
| Dono produto | Product Owner |
| Dependencias | SPEC-001 |

## Contexto

Hoje o frontend controla boa parte do contexto de usuario e empresa. Para SaaS, a autorizacao precisa ser centralizada no backend.

## Problema

Sem middleware de autenticacao e autorizacao tenant-aware no backend, cada endpoint pode implementar regras diferentes e inseguras.

## Objetivo

Padronizar autenticacao, tenant context e autorizacao por papel/permissao no backend.

## Fora de escopo

- SSO corporativo.
- MFA nesta fase.

## Requisitos funcionais

1. Backend valida token de usuario em toda rota protegida.
2. Backend resolve `current_user` e `current_tenant`.
3. Backend valida membership ativo do usuario no tenant ativo.
4. Backend aplica autorizacao por role/permissao.
5. Backend expoe endpoint de introspecao de contexto do usuario.

## Requisitos nao funcionais

1. Middleware com baixa latencia.
2. Erros padronizados em pt-BR para usuario final.
3. Tracing de decisao de autorizacao.

## Contrato de API (minimo)

1. `GET /api/v1/me/context`
2. `POST /api/v1/me/switch-tenant`
3. Headers obrigatorios em rotas protegidas:
  - `Authorization: Bearer <token>`
  - `X-Tenant-Id: <uuid>`

## Modelo de dados e migrations

1. Reutilizar `user_tenant_memberships` de SPEC-001.
2. Definir tabela de permissoes (se ausente) ou mapear permissoes existentes.

## Seguranca e autorizacao

1. Policy default deny.
2. Operacoes administrativas exigem permissao explicita.
3. Context switch so permitido para membership ativo.
4. Tenant header invalido ou ausente deve falhar com 403/401.

## Observabilidade

1. Logar `user_id`, `tenant_id`, `route`, `decision`.
2. Expor metricas:
  - `auth_denied_total`
  - `tenant_switch_total`
  - `permission_check_latency`

## Criterios de aceite

1. Nenhuma rota de negocio funciona sem auth + tenant context.
2. Rota protegida bloqueia usuario sem membership.
3. Troca de tenant invalida retorna erro esperado.
4. Testes de autorizacao por role/permissao aprovados.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T002-01 | Implementar middleware de auth e resolve de usuario | Backend | 1d | SPEC-001 |
| T002-02 | Implementar resolve de tenant ativo por header + membership | Backend | 1d | T002-01 |
| T002-03 | Criar camada de autorizacao por policy (RBAC/permissions) | Backend | 1d | T002-02 |
| T002-04 | Criar endpoint `/me/context` | Backend | 0.5d | T002-02 |
| T002-05 | Criar endpoint `/me/switch-tenant` com auditoria | Backend | 0.5d | T002-02 |
| T002-06 | Padronizar erros de auth/permission em pt-BR | Backend | 0.5d | T002-03 |
| T002-07 | Testes unitarios + integracao de authz cross-tenant | Teste | 1d | T002-03 |
| T002-08 | Atualizar docs de seguranca e contratos | Documentacao | 0.5d | T002-04 |
