# SPEC-007 - Quality Gates, CI/CD and Release Governance

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-007 |
| Prioridade | P1 |
| Status | Draft |
| Dono tecnico | Platform Engineer |
| Dono produto | Product Owner |
| Dependencias | SPEC-003, SPEC-004 |

## Contexto

Sem pipeline e governanca de release, o risco de regressao e alto.

## Problema

Mudancas podem entrar sem validacao minima de qualidade e sem estrategia de rollback.

## Objetivo

Implantar pipeline de qualidade e entrega continua com gates obrigatorios.

## Fora de escopo

- Deploy multi-regiao.
- Blue/green global nesta fase.

## Requisitos funcionais

1. Pipeline CI com lint, typecheck, testes e validacao de migration.
2. Pipeline CD com deploy controlado por ambiente.
3. Checklist de release e rollback.
4. Politica de branch e convencao de commit.

## Requisitos nao funcionais

1. Build reproduzivel.
2. Tempo de pipeline aceitavel para fluxo diario.
3. Bloqueio de merge sem gates minimos.

## Seguranca e autorizacao

1. Segredos somente via secret manager.
2. Sem chave sensivel em repositorio.
3. Scanner de vulnerabilidade em pipeline.

## Observabilidade

1. Pipeline publica status e duracao por etapa.
2. Deploy registra versao e changelog.

## Criterios de aceite

1. PR sem testes/lint nao mergeia.
2. Migration invalida bloqueia deploy.
3. Deploy para staging e producao segue aprovacao definida.
4. Rollback documentado e testado.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T007-01 | Definir padrao de branch/PR e checklists | Processo | 0.5d | - |
| T007-02 | Criar workflow CI frontend e backend | Plataforma | 1d | T007-01 |
| T007-03 | Adicionar job de validacao Alembic/migrations | Plataforma | 0.5d | T007-02 |
| T007-04 | Adicionar testes de seguranca basicos (deps scan) | Plataforma | 0.5d | T007-02 |
| T007-05 | Criar workflow de deploy staging com aprovacao | Plataforma | 1d | T007-02 |
| T007-06 | Criar checklist de release e rollback | Documentacao | 0.5d | T007-05 |
