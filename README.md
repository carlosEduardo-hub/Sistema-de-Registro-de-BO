# SSP Registros e B.O. (Orquestração)

Este repositório raiz serve para orquestrar o projeto completo (Frontend + Backend + Banco) usando um único `docker compose up`.

## Estrutura de diretórios esperada

Na mesma pasta onde está este `docker-compose.yml`, a estrutura esperada é:

```
meu-projeto/
├── docker-compose.yml
├── registro-remoto-de-bo/   # Frontend (React + Vite)
└── transcricao/             # Backend (API) + configuração do banco
```

## O que tem em cada diretório

### `registro-remoto-de-bo/` (Frontend)

- Aplicação React com Vite.
- Porta local: `http://localhost:8080`
- O frontend faz chamadas para `/api/*` e usa um proxy do Vite apontando para o backend.
  - No Docker Compose, essa rota é direcionada para `http://backend:3333` via variável `VITE_API_PROXY_TARGET`.

### `transcricao/` (Backend + Banco)

- API (Fastify) que expõe endpoints do sistema.
- Porta local: `http://localhost:3333`
- Banco PostgreSQL via Docker.
- Variáveis de ambiente do backend ficam em `transcricao/.env` (base em `transcricao/.env.example`).

## Como este `docker-compose.yml` funciona

O arquivo na raiz sobe 3 serviços:

### `db` (PostgreSQL)

- Imagem: `bitnami/postgresql:13.16.0`
- Porta: `5432:5432`
- Credenciais padrão:
  - usuário: `docker`
  - senha: `docker`
  - banco: `ssp_bo`
- Persistência:
  - `./transcricao/docker/postgres_data:/bitnami/postgresql`
  - Isso significa que os dados ficam na pasta `transcricao/docker/postgres_data` dentro do projeto.

### `backend` (API)

- Imagem: `node:22-slim`
- Monta o código do backend a partir de `./transcricao` dentro do container.
- Lê variáveis do arquivo: `./transcricao/.env`
- Sobrescreve a conexão do banco para apontar para o serviço `db`:
  - `DATABASE_URL=postgresql://docker:docker@db:5432/ssp_bo`
- Executa:
  - `npm install`
  - `npm run db:migrate`
  - sobe o servidor na porta `3333`

### `frontend` (React/Vite)

- Imagem: `node:20-slim`
- Monta o código do frontend a partir de `./registro-remoto-de-bo` dentro do container.
- Define o proxy do Vite para apontar para o backend pelo nome do serviço:
  - `VITE_API_PROXY_TARGET=http://backend:3333`
- Sobe o Vite na porta `8080` (exposta para o host).

## Como rodar (quando os repositórios estão separados no GitHub)

No GitHub, a ideia é ter:

- 1 repositório “orquestrador” (este) contendo o `docker-compose.yml`
- 1 repositório do frontend
- 1 repositório do backend

Para executar, você precisa clonar os 3 e deixar nessa estrutura:

```bash
mkdir meu-projeto
cd meu-projeto

# Repo orquestrador (este)
git clone <URL_DO_REPO_ORQUESTRADOR> .

# Repo do frontend (precisa ficar exatamente em ./registro-remoto-de-bo)
git clone <URL_DO_REPO_FRONTEND> registro-remoto-de-bo

# Repo do backend (precisa ficar exatamente em ./transcricao)
git clone <URL_DO_REPO_BACKEND> transcricao
```

Depois:

1. Crie o arquivo `transcricao/.env` a partir do exemplo:

```bash
cp transcricao/.env.example transcricao/.env
```

2. Preencha as chaves necessárias no `transcricao/.env` (ex.: `GEMINI_API_KEY`, `RESEND_API_KEY`, etc).

3. Suba tudo:

```bash
docker compose up -d
```

4. Acesse:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3333`
- Postgres: `localhost:5432`

Para parar:

```bash
docker compose down
```

## Observações

- Se quiser “resetar” o banco, apague a pasta `transcricao/docker/postgres_data` (com os containers parados) e suba novamente.
- Se você renomear as pastas `registro-remoto-de-bo/` ou `transcricao/`, ajuste os caminhos no `docker-compose.yml`.
