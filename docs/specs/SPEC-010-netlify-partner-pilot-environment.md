# SPEC-010 - Partner Pilot Environment (Netlify Frontend + Local Backend Tunnel)

## Metadata

| Campo | Valor |
|---|---|
| ID | SPEC-010 |
| Prioridade | P1 |
| Status | In Progress |
| Dono tecnico | Platform Engineer |
| Dono produto | Product Owner |
| Dependencias | SPEC-005 |

## Contexto

O produto precisa de uma camada de validacao externa para o socio testar fluxos reais antes da infraestrutura final de producao estar pronta.

## Problema

Ambiente local nao e acessivel externamente de forma simples e consistente. Sem uma URL compartilhavel com setup controlado, o ciclo de feedback de negocio fica lento.

## Objetivo

Publicar o frontend no Netlify como camada de "producao assistida" para validacao de negocio, consumindo backend executando na maquina local via tunel HTTPS temporario.

## Fora de escopo

- Backend definitivo em cloud com SLA.
- Ambiente de producao oficial.
- Alta disponibilidade 24/7.
- Escalabilidade horizontal nesta fase.

## Requisitos funcionais

1. Frontend publicado no Netlify com URL compartilhavel.
2. Deploy automatico do frontend a partir da branch principal.
3. SPA routing configurado para evitar 404 em refresh (`_redirects`).
4. Configuracao de variaveis de ambiente do frontend no Netlify.
5. Backend local exposto por tunel HTTPS (ngrok ou cloudflared).
6. `VITE_PLATFORM_API_BASE_URL` apontando para URL do tunel.
7. CORS do backend permitindo dominio Netlify e dominio do tunel.
8. Runbook de operacao para subir/desligar ambiente de teste com checklist.

## Requisitos nao funcionais

1. Setup operacional em no maximo 15 minutos.
2. Sem chave sensivel hardcoded no frontend.
3. Ambiente de teste com risco controlado e reversivel.
4. Processo de start/stop reproduzivel por pelo menos 2 pessoas do time.

## Contrato de integracao

1. Frontend envia `Authorization` + `X-Tenant-Id` para backend.
2. Backend responde via HTTPS do tunel para chamadas do dominio Netlify.
3. Falhas de backend/tunel devem resultar em erro claro de conectividade no frontend.

## Seguranca e autorizacao

1. JWT secret e credenciais de banco permanecem somente no backend local.
2. Variaveis `VITE_*` no Netlify nao devem conter segredos de servidor.
3. Contas de teste segregadas para piloto (sem usuarios de producao real).
4. CORS restritivo para dominios autorizados de teste.

## Observabilidade

1. Logs estruturados no backend local com `request_id`, `tenant_id` e `user_id`.
2. Checklist de validacao apos cada subida:
   - login
   - selecao de empresa
   - listagem de produtos
   - listagem de inventarios
3. Registro manual de incidentes do piloto (tempo fora, causa, acao).

## Criterios de aceite

1. Socio consegue acessar URL Netlify e autenticar com usuario de teste.
2. Fluxos core (produtos e inventarios) funcionam com backend local via tunel.
3. Time consegue reiniciar ambiente de ponta a ponta com runbook.
4. Erros de indisponibilidade do backend sao identificaveis sem diagnostico profundo.

## Tarefas

| ID | Tarefa | Tipo | Estimativa | Dependencias |
|---|---|---|---|---|
| T010-01 | Definir arquitetura alvo do piloto e riscos aceitos | Arquitetura | 0.5d | SPEC-005 |
| T010-02 | Configurar Netlify (build, publish, redirects e env vars) | Plataforma | 0.5d | T010-01 |
| T010-03 | Configurar tunel HTTPS padrao (ngrok/cloudflared) | Plataforma | 0.5d | T010-01 |
| T010-04 | Ajustar backend para CORS do dominio Netlify e tunel | Backend | 0.5d | T010-03 |
| T010-05 | Criar runbook operacional de start/stop e troubleshooting | Documentacao | 0.5d | T010-04 |
| T010-06 | Executar smoke de fluxo com socio (login, tenant, produtos, inventarios) | QA/Produto | 0.5d | T010-05 |
| T010-07 | Definir politica de janela de disponibilidade do piloto | Processo | 0.25d | T010-05 |
| T010-08 | Decidir go/no-go para backend em cloud dedicado | Produto/Arquitetura | 0.25d | T010-06 |

## Progresso de implementacao (2026-03-31)

- [x] T010-01 - Arquitetura alvo definida e registrada em `docs/adr/ADR-003-partner-pilot-netlify-local-backend.md`.
- [x] T010-02 - Configuracao Netlify adicionada (`netlify.toml` + `frontend/public/_redirects`).
- [x] T010-03 - Padrao de tunel HTTPS documentado (ngrok/cloudflared) no runbook.
- [~] T010-04 - `backend/.env.example` preparado para CORS de Netlify+tunel; falta aplicar dominio real do piloto.
- [x] T010-05 - Runbook operacional criado em `docs/runbooks/partner-pilot-netlify.md`.
- [ ] T010-06 - Smoke com socio pendente.
- [ ] T010-07 - Politica de janela do piloto pendente.
- [ ] T010-08 - Decisao go/no-go de backend cloud pendente.
