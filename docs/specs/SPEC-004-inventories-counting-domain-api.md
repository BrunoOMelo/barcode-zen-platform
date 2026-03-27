# SPEC-004 - Inventories and Counting Domain API

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-004 |
| Prioridade | P0 |
| Status | Draft |
| Dono tecnico | Backend Lead |
| Dono produto | Product Owner |
| Dependencias | SPEC-001, SPEC-002 |

## Contexto

Inventarios, itens e contagens representam o fluxo principal do produto.

## Problema

A implementacao atual depende de logica no frontend e em triggers isoladas no banco, reduzindo previsibilidade e controle de negocio.

## Objetivo

Implementar o fluxo completo de inventario no backend com regras consistentes, isolamento tenant-aware e contratos de API claros.

## Fora de escopo

- Workflows de aprovacao complexos multi-etapa.
- Integracao com hardware de coletor nesta fase.

## Requisitos funcionais

1. CRUD de inventarios.
2. Associacao de produtos ao inventario.
3. Registro de contagem e recontagem.
4. Calculo de divergencia com regra unica no backend.
5. Transicao de status de inventario com validacao de estado.

## Requisitos nao funcionais

1. Integridade transacional nas operacoes de contagem.
2. Controle de concorrencia para evitar sobrescrita indevida.
3. Rastreabilidade de quem contou e quando.

## Contrato de API (minimo)

1. `GET /api/v1/inventories`
2. `POST /api/v1/inventories`
3. `GET /api/v1/inventories/{id}`
4. `PATCH /api/v1/inventories/{id}/status`
5. `GET /api/v1/inventories/{id}/items`
6. `POST /api/v1/inventories/{id}/items`
7. `POST /api/v1/inventories/{id}/counts`
8. `GET /api/v1/inventories/{id}/counts`

## Modelo de dados e migrations

1. Garantir `tenant_id` ou cadeia de tenant ownership nas tabelas de inventario.
2. Constraints para evitar duplicidade de item no inventario.
3. Indices para leitura de dashboard e listagens operacionais.
4. Revisar trigger legado para evitar regra duplicada.

## Seguranca e autorizacao

1. Leitura conforme role/permissao.
2. Operacoes de contagem permitidas somente para roles autorizados.
3. Alteracao de status apenas para papeis de supervisao/admin.
4. Validar ownership tenant em todas operacoes.

## Observabilidade

1. Medir latencia de registro de contagem.
2. Medir taxa de divergencia por tenant.
3. Auditar mudanca de status de inventario.

## Criterios de aceite

1. Fluxo completo de inventario funciona via API backend.
2. Regras de transicao de status cobertas por teste.
3. Contagem e divergencia consistentes em cenarios de concorrencia.
4. Frontend nao depende de triggers para regra principal.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T004-01 | Definir maquina de estados de inventario (ADR curta) | Arquitetura | 0.5d | - |
| T004-02 | Implementar modelos/schemas de inventario e itens | Backend | 1d | T004-01 |
| T004-03 | Implementar services de status, itens e contagens | Backend | 1.5d | T004-02 |
| T004-04 | Implementar endpoints e autorizacao por permissao | Backend | 1d | T004-03 |
| T004-05 | Revisar migrations e indices de contagens/itens | Dados | 1d | T004-02 |
| T004-06 | Testes de integracao (happy path + concorrencia) | Teste | 1.5d | T004-04 |
| T004-07 | Contratos OpenAPI + exemplos de erro | Documentacao | 0.5d | T004-04 |
