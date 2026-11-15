# SSP Registros e B.O.

Monorepo de orquestração do sistema completo (Frontend + Backend + PostgreSQL) com um único `docker compose up`.

## Estrutura

```
.
├── docker-compose.yml
├── registro-remoto-de-bo/   # Frontend (React + Vite)
└── transcricao/             # Backend (API Fastify) + banco
```

## Pré-requisitos

- Docker Desktop
- (Opcional) Node.js 20+ se for rodar front/back fora do Compose

## Configuração de ambiente

Os arquivos `.env` **não** são versionados. Use os exemplos:

```bash
# Backend (obrigatório)
cp transcricao/.env.example transcricao/.env

# Frontend (opcional — só se rodar o Vite fora do Docker)
cp registro-remoto-de-bo/.env.example registro-remoto-de-bo/.env

# Testes do backend (opcional)
cp transcricao/.env.test.example transcricao/.env.test
```

Preencha em `transcricao/.env`:

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Postgres local (no Compose é sobrescrito para o serviço `db`) |
| `GEMINI_API_KEY` | Transcrição de áudio e autofill |
| `RESEND_API_KEY` | Envio de e-mails |
| `EMAIL_FROM` | Remetente dos e-mails |

## Subir o ambiente

```bash
docker compose up -d
```

- Frontend: http://localhost:8080  
- Backend: http://localhost:3333  
- Postgres: `localhost:5432` (`docker` / `docker` / `ssp_bo`)

```bash
docker compose down
```

## Serviços (Docker Compose)

| Serviço | Porta | Notas |
|---------|-------|--------|
| `db` | 5432 | Bitnami PostgreSQL 13 |
| `backend` | 3333 | `npm install`, migrate e API |
| `frontend` | 8080 | Vite com proxy `/api` → backend |

Dados do Postgres ficam em `transcricao/docker/postgres_data/` (ignorado pelo Git).

## Seed (opcional)

Com os containers no ar:

```bash
docker compose exec -e DATABASE_URL=postgresql://docker:docker@db:5432/ssp_bo backend npm run db:seed
```
