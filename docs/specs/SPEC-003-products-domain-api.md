# SPEC-003 - Products Domain API

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-003 |
| Prioridade | P0 |
| Status | Draft |
| Dono tecnico | Backend Lead |
| Dono produto | Product Owner |
| Dependencias | SPEC-001, SPEC-002 |

## Contexto

O modulo de produtos ainda e majoritariamente operado pelo frontend com acesso direto ao banco.

## Problema

Regra de negocio distribuida no cliente gera risco de inconsistencias e dificulta escalabilidade.

## Objetivo

Disponibilizar API completa de produtos tenant-aware no backend e remover dependencia de logica de negocio no frontend.

## Fora de escopo

- Catalogo avancado com variacoes complexas.
- Integracao com ERP externo nesta fase.

## Requisitos funcionais

1. CRUD de produtos com validacoes de negocio.
2. Listagem com filtros e paginacao.
3. Busca textual por descricao, SKU e codigo de barras.
4. Regras de permissao por role.
5. Soft delete opcional (avaliar conforme negocio).

## Requisitos nao funcionais

1. P95 de listagem <= 300ms para tenant medio.
2. API idempotente para updates previsiveis.
3. Logs estruturados para mutacoes.

## Contrato de API (minimo)

1. `GET /api/v1/products`
2. `GET /api/v1/products/{id}`
3. `POST /api/v1/products`
4. `PUT /api/v1/products/{id}`
5. `DELETE /api/v1/products/{id}`

Query params minimos:

- `page`
- `page_size`
- `search`
- `active`
- `category`

## Modelo de dados e migrations

1. Garantir colunas necessarias (`sku`, `barcode`, `description`, `category`, `active`, `cost`, `price` se aplicavel).
2. Constraint de unicidade por tenant para SKU/barcode conforme regra.
3. Indices:
  - `(tenant_id, active)`
  - `(tenant_id, category)`
  - `(tenant_id, created_at DESC)`
  - indice de busca textual (quando necessario)

## Seguranca e autorizacao

1. Read para perfis autorizados.
2. Create/update/delete apenas para roles com permissao.
3. Sempre validar tenant ownership do recurso.

## Observabilidade

1. Metricas:
  - `products_list_latency`
  - `products_mutation_total`
2. Logs de mudancas com `before/after` resumido.

## Criterios de aceite

1. Frontend consegue operar produtos somente via API backend.
2. Testes de integracao cobrem CRUD e isolamento por tenant.
3. Nao existe query sem tenant filter no repositorio de produtos.
4. Erros de validacao e negocio retornam mensagem em pt-BR.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T003-01 | Revisar entidade Product para campos de dominio reais | Backend | 0.5d | SPEC-001 |
| T003-02 | Implementar filtros/paginacao no repository | Backend | 1d | T003-01 |
| T003-03 | Implementar validacoes de negocio no service | Backend | 1d | T003-02 |
| T003-04 | Implementar autorizacao por permissao nos endpoints | Backend | 0.5d | SPEC-002 |
| T003-05 | Criar migration de indices e constraints tenant-aware | Dados | 1d | T003-01 |
| T003-06 | Criar suite de testes (unit + integracao) | Teste | 1d | T003-03 |
| T003-07 | Documentar contrato OpenAPI e exemplos de erro | Documentacao | 0.5d | T003-04 |
