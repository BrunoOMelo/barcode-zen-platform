# Runbook - Partner Pilot (Netlify + Local Backend Tunnel)

## Objetivo

Publicar o frontend no Netlify para validacao com o socio, consumindo backend local via tunel HTTPS.

## Escopo

- Frontend: Netlify
- Backend: local (FastAPI)
- Banco: local/Docker
- Uso: piloto de negocio (nao producao final)

## Pre-requisitos

1. Repositorio conectado no Netlify.
2. Backend funcionando localmente em `http://localhost:8000`.
3. Banco PostgreSQL local ativo.
4. Ferramenta de tunel instalada:
   - Opcao A: `ngrok`
   - Opcao B: `cloudflared`

## Passo 1 - Build/deploy do frontend no Netlify

Com `netlify.toml` no repositorio:

- `base`: `frontend`
- `command`: `npm run build`
- `publish`: `dist`

SPA routing:

- `frontend/public/_redirects` com `/* /index.html 200`

## Passo 2 - Subir backend local

```bash
cd backend
copy .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Passo 3 - Abrir tunel HTTPS para o backend

Opcao A (`ngrok`):

```bash
ngrok http 8000
```

Opcao B (`cloudflared`):

```bash
cloudflared tunnel --url http://localhost:8000
```

Copie a URL HTTPS publicada (exemplo: `https://abc123.ngrok-free.app`).

## Passo 4 - Ajustar CORS do backend

No `backend/.env`, configure `CORS_ALLOW_ORIGINS` com:

- dominio Netlify
- dominio do tunel
- origens locais de dev

Exemplo:

```env
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://barcode-zen.netlify.app,https://abc123.ngrok-free.app
```

Reinicie o backend apos alterar `.env`.

## Passo 5 - Configurar env vars no Netlify

No projeto Netlify, em Site configuration > Environment variables:

1. `VITE_PLATFORM_API_BASE_URL=https://SEU_TUNEL_HTTPS`
2. `VITE_PLATFORM_CUTOVER_PRODUCTS=true`
3. `VITE_PLATFORM_CUTOVER_INVENTORIES=true`

Acione novo deploy apos atualizar as variaveis.

## Passo 6 - Smoke test do piloto

1. Abrir URL do Netlify.
2. Entrar em `/login`.
3. Validar login com usuario de teste.
4. Selecionar empresa no modal.
5. Validar:
   - listagem de produtos
   - listagem de inventarios
   - dashboard
6. Trocar tenant e validar isolamento.

## Troubleshooting rapido

1. Erro CORS:
   - confirmar dominios em `CORS_ALLOW_ORIGINS`
   - reiniciar backend
2. 401/403:
   - validar token/tenant no login
   - validar membership ativo
3. Timeout/rede:
   - conferir se tunel ainda esta ativo
   - gerar nova URL e atualizar `VITE_PLATFORM_API_BASE_URL` no Netlify
4. Front em branco apos refresh:
   - confirmar arquivo `_redirects` e deploy atualizado

## Encerramento da sessao

1. Parar backend local.
2. Fechar tunel.
3. Registrar incidentes e observacoes da sessao (tempo fora, causa, acao).

## Limites conhecidos

1. Ambiente depende da maquina local.
2. Nao possui SLA.
3. Nao usar para dados reais de producao.
