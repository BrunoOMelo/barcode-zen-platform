# AGENTS.md

Guia operacional para engenharia de software do projeto `barcode-zen-platform`.

## 1. Objetivo

Este documento define o padrão de execução para transformar o produto em um SaaS multi-tenant robusto, com foco em:

- manutenibilidade
- segurança
- escalabilidade
- previsibilidade de entrega

## 2. Princípios Não Negociáveis

- Backend é a fonte única de regra de negócio.
- Frontend não implementa regra crítica de domínio.
- Toda operação é tenant-aware.
- Sem isolamento de tenant validado, a entrega não é aceita.
- Sem testes mínimos e critérios de aceite, a entrega não é aceita.

## 3. Regras de Codificação

## 3.1 Regras gerais

- Código, nomes de classes/funções/variáveis/pastas em inglês.
- Mensagens para usuário final e exceções de domínio em pt-BR.
- Evitar complexidade desnecessária; preferir soluções simples e testáveis.
- Não misturar responsabilidades entre camadas.
- Toda mudança relevante deve atualizar documentação técnica.

## 3.2 Backend (FastAPI + SQLAlchemy)

- Seguir arquitetura em camadas:
  - `controllers`: HTTP e validação de entrada/saída
  - `services`: regra de negócio e orquestração
  - `repositories`: acesso a dados
  - `models`: entidades persistidas
  - `schemas`: DTOs de request/response
- Controllers não acessam banco diretamente.
- Services não conhecem HTTP (status code, request object).
- Repositories não contêm regra de negócio.
- Toda query deve respeitar contexto de tenant.
- Exceções de domínio centralizadas e tratadas em handlers.

## 3.3 Frontend (React + TypeScript)

- Frontend consome API do backend para domínio de negócio.
- Evitar acesso direto a banco/SDK para regra crítica.
- Componentes de UI sem regra de negócio pesada.
- Hooks de dados separados de componentes visuais.
- Rotas e módulos com lazy loading quando possível.

## 3.4 Banco e migrations

- Migrations sempre versionadas (Alembic).
- Mudanças de schema devem incluir:
  - índices necessários
  - constraints de integridade
  - estratégia de rollback
- Unicidade sensível a tenant deve incluir `tenant_id`.

## 4. Regras de Multi-Tenancy

- Modelo alvo: shared DB + shared schema + isolamento estrito por tenant.
- Todo recurso de domínio deve ter escopo de tenant direto ou indireto verificável.
- Toda requisição autenticada deve carregar contexto de tenant ativo.
- Toda operação deve validar:
  - membership no tenant
  - papel/permissão
  - escopo do recurso
- Queries sem filtro de tenant são proibidas em produção.

## 5. Spec-Driven Development (SDD)

## 5.1 Regra base

Nenhuma feature começa pela implementação. Toda feature começa por especificação.

## 5.2 Artefatos obrigatórios por feature

- Spec funcional/técnica (curta, objetiva)
- Critérios de aceite testáveis
- Contrato de API (request/response/erros)
- Impacto em dados (schema, migrations, índices)
- Regras de autorização e tenant
- Plano de observabilidade (logs, métricas, eventos)
- Plano de rollout e rollback

## 5.3 Fluxo SDD

1. Descoberta do problema e escopo
2. Especificação (o que será e o que não será feito)
3. Quebra em tarefas verticais (backend, frontend, dados, testes)
4. Implementação incremental
5. Validação por critérios de aceite
6. Revisão técnica + documentação
7. Deploy controlado

## 5.4 Template mínimo de spec

- Contexto
- Problema
- Objetivo
- Fora de escopo
- Requisitos funcionais
- Requisitos não funcionais
- Contrato de API
- Modelo de dados e migrações
- Segurança/autorização
- Observabilidade
- Critérios de aceite

## 6. Qualidade e Testes

- Pirâmide mínima:
  - unitários (services/repositories)
  - integração (API + banco)
  - smoke e2e dos fluxos críticos
- Toda correção de bug deve incluir teste de regressão.
- Mínimo para merge:
  - lint ok
  - typecheck ok
  - testes obrigatórios ok
  - migrations validadas

## 7. Segurança

- Validação de entrada em todas as fronteiras.
- Princípio do menor privilégio para roles/permissões.
- Segredos fora do código.
- Auditoria para ações críticas:
  - troca de tenant
  - alteração de permissões
  - mutações sensíveis de dados

## 8. Performance e Escala

- Evitar agregações pesadas no cliente.
- Priorizar agregação server-side para dashboard e relatórios.
- Paginação obrigatória em listagens grandes.
- Monitorar queries lentas e revisar índices continuamente.

## 9. Definição de Pronto (DoD)

Uma entrega só é considerada pronta quando:

- atende à spec aprovada
- cumpre isolamento de tenant
- passa em testes e validações automatizadas
- possui observabilidade mínima
- possui documentação atualizada

## 10. Processo de Decisão

- Decisões arquiteturais relevantes devem gerar ADR.
- Em caso de conflito entre velocidade e segurança de tenant, vence segurança de tenant.
- Em caso de conflito entre prazo e qualidade mínima, escopo reduz; qualidade mínima não reduz.
