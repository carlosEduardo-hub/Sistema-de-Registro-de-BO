# Sistema de Registro de B.O.

Plataforma web para **registro, consulta, edição e gestão de Boletins de Ocorrência**, com apoio de **inteligência artificial** (transcrição de áudio e preenchimento automático), **modo offline**, **auditoria** de alterações e **exportação em PDF**.

Este repositório é um **monorepo** que une frontend, backend e orquestração Docker em um único projeto.

**Produção:** [sistema-registro-bo.vercel.app](https://sistema-registro-bo.vercel.app)

---

## Sumário

- [Visão geral](#visão-geral)
- [Principais funcionalidades](#principais-funcionalidades)
- [Telas da aplicação](#telas-da-aplicação)
- [Arquitetura](#arquitetura)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Pré-requisitos](#pré-requisitos)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Como rodar (Docker Compose)](#como-rodar-docker-compose)
- [Deploy na Vercel (sem Docker)](#deploy-na-vercel-sem-docker)
- [Seed de dados de exemplo](#seed-de-dados-de-exemplo)
- [API (visão geral)](#api-visão-geral)
- [Identificadores de teste (auditoria)](#identificadores-de-teste-auditoria)
- [Comandos úteis](#comandos-úteis)
- [Observações](#observações)

---

## Visão geral

O sistema permite que um atendente/policial:

1. **Registre** um novo B.O. por formulário manual, atalhos rápidos ou com ajuda de IA.
2. **Grave áudio** do relato e receba a **transcrição automática** (Google Gemini).
3. Use um **prompt em linguagem natural** para a IA **preencher campos** do boletim.
4. Continue trabalhando **sem internet**: os registros ficam em fila local e **sincronizam** ao voltar online.
5. **Consulte o histórico**, filtre/busque ocorrências, edite ou exclua com **identificação policial** (auditoria).
6. **Exporte PDF** do boletim e acompanhe **relatórios** agregados.
7. (Opcional) Envie **e-mails** de confirmação/atualização/exclusão e integre **Telegram**.

---

## Principais funcionalidades

### Registro de Boletim de Ocorrência

- Formulário completo com dados do fato e da pessoa envolvida:
  - data/hora do evento, local, tipo de ocorrência
  - nome, CPF/RG, nascimento, gênero, nacionalidade, estado civil
  - profissão, endereço, telefone, e-mail
  - relação com o fato (vítima, testemunha, denunciante, etc.)
  - relato / transcrição
- Validação de campos no frontend e no backend.
- Persistência em PostgreSQL (`register_bo`).

### Inteligência artificial

| Recurso | O que faz |
|--------|-----------|
| **Transcrição de áudio** | Envia o áudio gravado no navegador; a API cria um *job* (`POST /transcriptions`) e o frontend consulta o status até concluir (`GET /transcriptions/:jobId`). Usa **Gemini**. |
| **Autofill do B.O.** | A partir de um texto/prompt, a IA sugere o preenchimento dos campos do boletim (`POST /autofill-bo`). |
| **Endpoint legado** | `POST /transcribe` continua disponível para transcrição síncrona simples. |

> As chaves `GEMINI_API_KEY` e `RESEND_API_KEY` são obrigatórias no `.env` do backend para esses recursos (e para o servidor subir corretamente no fluxo de e-mail).

### Histórico, busca e paginação

- Listagem paginada de B.O.s.
- Busca por termos (id, nome, tipo, local, etc.).
- Filtro por tipo de ocorrência.
- Visualização detalhada, edição e exclusão.

### Auditoria e identificação policial

- Edição (`PUT`) e exclusão (`DELETE`) exigem **número de identificação do policial**.
- Alterações e exclusões geram registros em `bo_audit_log` (ação, identificador, detalhes em JSON, data).
- Motivo obrigatório na exclusão.
- Identificadores válidos ficam em um mock no backend (`transcricao/src/services/police.ts`) — útil para testes locais.

### Modo offline e sincronização

- Com a conexão instável/ausente, o frontend pode **enfileirar** boletins localmente (armazenamento offline criptografado).
- Ao voltar online, a sincronização envia a fila para `POST /sync/boletins`.
- Na tela de histórico há gestão da **fila de pendentes** (sincronizar um, sincronizar todos, limpar fila).
- O app inicializa sync automático ao detectar retorno da rede (`useBoSync`).

### Exportação e comunicação

- **PDF** do boletim gerado no cliente a partir dos dados do registro.
- **E-mails** (Resend) em criação/atualização/exclusão, quando configurado.
- **Telegram** (opcional): token/username do bot via variáveis de ambiente.

### Relatórios

- Tela de relatórios com filtros de período/tipo e visualizações agregadas para apoio à gestão das ocorrências.

---

## Telas da aplicação

| Rota | Tela | Função |
|------|------|--------|
| `/` | Início | Boas-vindas e atalhos (registrar, histórico, relatórios) |
| `/registro` | Novo B.O. | Formulário + gravação de áudio + autofill por IA |
| `/historico` | Histórico | Lista, filtros, pendentes offline, editar/excluir, PDF |
| `/relatorios` | Relatórios | Painéis e filtros analíticos |

Interface responsiva, com sidebar de navegação e indicador de status de rede.

---

## Arquitetura

```
┌─────────────────┐     /api/* (proxy Vite)     ┌─────────────────┐
│  Frontend       │ ──────────────────────────► │  Backend        │
│  React + Vite   │                             │  Fastify        │
│  :8080          │                             │  :3333          │
└─────────────────┘                             └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  PostgreSQL     │
                                                │  :5432          │
                                                └─────────────────┘
                                                         │
                         ┌───────────────────────────────┼───────────────────────────────┐
                         ▼                               ▼                               ▼
                   Google Gemini                      Resend                      Telegram (opc.)
                 (transcrição/IA)                    (e-mail)
```

No Docker Compose:

- O **frontend** usa `VITE_API_PROXY_TARGET=http://backend:3333`.
- Chamadas do browser para `/api/...` são reescritas para o backend (sem `/api`).
- O **backend** recebe `DATABASE_URL` apontando para o serviço `db`.

---

## Stack tecnológica

### Frontend (`registro-remoto-de-bo/`)

- React + TypeScript + Vite
- React Router, TanStack Query
- Tailwind CSS + componentes shadcn/ui
- Armazenamento offline local + sincronização
- Geração de PDF no cliente

### Backend (`transcricao/`)

- Node.js + Fastify + TypeScript
- Drizzle ORM + PostgreSQL
- Zod (validação de env e payloads)
- Google Gemini (IA)
- Resend (e-mail)
- Multipart para upload de áudio

### Infra

- Docker Compose (db + backend + frontend) para desenvolvimento local
- Deploy na Vercel via Services (Vite + Fastify) sem Docker
- Imagem Postgres Bitnami 13 (local); Neon/Marketplace em produção

---

## Estrutura do monorepo

```
.
├── docker-compose.yml          # Sobe db, backend e frontend
├── vercel.json                 # Services: frontend + backend na Vercel
├── README.md
├── registro-remoto-de-bo/      # Frontend
│   ├── .env.example
│   └── src/
└── transcricao/                # Backend + schema/migrations
    ├── .env.example
    ├── .env.test.example
    └── src/
        ├── db/                 # schema, migrations, seed
        ├── http/routes/        # endpoints
        └── services/           # email, pdf, police, telegram
```

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Conta/chave **Google Gemini** (para IA)
- Conta/chave **Resend** (para e-mails; use um placeholder só para subir o servidor em ambiente local de teste)
- (Opcional) Node.js 20+ para rodar front/back fora do Compose

---

## Configuração de ambiente

Arquivos `.env` **não** são versionados. Use apenas os exemplos:

```bash
# Backend (obrigatório)
cp transcricao/.env.example transcricao/.env

# Frontend (opcional — só fora do Docker)
cp registro-remoto-de-bo/.env.example registro-remoto-de-bo/.env

# Testes do backend (opcional)
cp transcricao/.env.test.example transcricao/.env.test
```

### Variáveis do backend (`transcricao/.env`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim* | Conexão Postgres. *No Compose é sobrescrita para o serviço `db`. |
| `GEMINI_API_KEY` | Sim | Transcrição e autofill |
| `RESEND_API_KEY` | Sim | Envio de e-mails (não pode ficar vazio na inicialização) |
| `EMAIL_FROM` | Não | Remetente (padrão no exemplo) |
| `TELEGRAM_BOT_TOKEN` | Não | Bot Telegram |
| `TELEGRAM_BOT_USERNAME` | Não | Username do bot |

### Variáveis do frontend (`registro-remoto-de-bo/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_PROXY_TARGET` | Destino do proxy `/api` (padrão local: `http://localhost:3333`) |

---

## Como rodar (Docker Compose)

Na raiz do repositório:

```bash
docker compose up -d
```

| Serviço | URL / porta | Função |
|---------|-------------|--------|
| Frontend | http://localhost:8080 | Interface web |
| Backend | http://localhost:3333 | API |
| Postgres | `localhost:5432` | Banco (`docker` / `docker` / `ssp_bo`) |

Parar:

```bash
docker compose down
```

Logs:

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db
```

Na primeira subida o Postgres pode demorar (volume local). O Compose espera o healthcheck do banco antes de iniciar o backend.

---

## Deploy na Vercel (sem Docker)

O monorepo sobe como **um único projeto** com [Vercel Services](https://vercel.com/docs/services) (beta):

| Service | Pasta | Runtime |
|---------|-------|---------|
| `frontend` | `registro-remoto-de-bo/` | Vite |
| `backend` | `transcricao/` | Fastify (Functions) |

Roteamento (em `vercel.json`):

- `/api/*` → backend (o prefixo `/api` é removido antes de chegar nas rotas Fastify)
- demais paths → frontend (SPA com fallback para `index.html`)

O Postgres do Compose **não** vai para a Vercel. Use um banco gerenciado (recomendado: **Neon** no Marketplace).

### Passo a passo

1. Conta na [Vercel](https://vercel.com) e CLI atualizada (`npm i -g vercel`).
2. Na raiz do repo:
   ```bash
   vercel link
   ```
3. Provisionar Postgres e conectar ao projeto (injeta `DATABASE_URL`):
   ```bash
   vercel integration add neon
   ```
   Ou pelo dashboard: **Storage → Neon → Connect Project**.
4. Definir secrets no projeto (Production + Preview):
   - `GEMINI_API_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (opcional)
   - `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` (opcional)
5. Rodar migrations no banco de produção (uma vez, com a URL do Neon):
   ```bash
   cd transcricao
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```
6. Deploy:
   ```bash
   vercel          # preview
   vercel --prod   # produção
   ```
   Ou conecte o GitHub e deixe o deploy automático em cada push.

### Telegram na Vercel

Polling contínuo fica **desligado** quando `VERCEL` está definido. Use o webhook:

`https://<seu-dominio>/api/telegram/webhook`

### Limites a ter em mente

- Body de request nas Functions: **~4,5 MB** (áudios grandes podem falhar; o Compose local aceita mais).
- Contatos Telegram em memória não sobrevivem entre instâncias — webhook + storage externo seriam o próximo passo se precisar disso em produção.
- Dev local unificado: `vercel dev` (ou continue com Docker Compose).

---

## Seed de dados de exemplo

Com os containers no ar:

```bash
docker compose exec -e DATABASE_URL=postgresql://docker:docker@db:5432/ssp_bo backend npm run db:seed
```

Isso reaplica o seed (reset + inserção) com **20 boletins** variados para popular histórico e relatórios.

> Atenção: o seed **apaga** os dados atuais das tabelas do schema antes de inserir.

---

## API (visão geral)

Base local: `http://localhost:3333`  
Pelo frontend (proxy): `http://localhost:8080/api/...`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/transcriptions` | Cria job de transcrição (multipart) |
| `GET` | `/transcriptions/:jobId` | Consulta status/resultado do job |
| `POST` | `/transcribe` | Transcrição síncrona (legado) |
| `POST` | `/autofill-bo` | Sugestão de campos via IA |
| `POST` | `/register-bo` | Cria boletim |
| `GET` | `/register-bo` | Lista paginada + busca/filtro |
| `GET` | `/register-bo/all` | Lista ampliada para relatórios |
| `GET` | `/register-bo/:id` | Detalhe |
| `PUT` | `/register-bo/:id` | Atualiza (exige `police_identifier`) |
| `DELETE` | `/register-bo/:id` | Exclui (exige identificador + motivo) |
| `POST` | `/sync/boletins` | Sincroniza lote offline |
| `GET` | `/audit-logs` (e afins) | Consulta logs de auditoria |
| `POST` | rotas Telegram | Integração opcional |

---

## Identificadores de teste (auditoria)

Para editar/excluir em ambiente de desenvolvimento, use um dos identificadores mockados, por exemplo:

- `PM-0001`, `PM-1234`, `PM-9999`
- `100001`, `200123`

A lista completa está em `transcricao/src/services/police.ts`. Na interface, o modal de identificação mostra atalhos para testes.

---

## Comandos úteis

### Backend (dentro do container ou com Node local)

```bash
# Dependências / API
npm install
npm run dev

# Banco
npm run db:generate
npm run db:migrate
npm run db:seed

# Testes
npm test
```

### Frontend

```bash
npm install
npm run dev
```

---

## Observações

- **Secrets:** nunca commite `.env`. Apenas `*.env.example` / `*.env.*.example` vão para o Git.
- **Volume do Postgres:** dados em `transcricao/docker/postgres_data/` (ignorado pelo Git). Para resetar o banco, pare os containers e apague essa pasta.
- **Hot reload no Windows/OneDrive:** o Vite no Docker usa *polling* para detectar alterações de arquivo.
- **Backend sem hot reload:** após mudar código da API, reinicie com `docker compose restart backend` (ou `up -d --force-recreate backend` se precisar recarregar o `.env`).
- Remote `ssp-upstream` (se existir localmente) aponta para o repositório original de orquestração da organização; o `origin` deste clone pessoal é o GitHub do mantenedor.

---

## Licença / uso

Projeto orientado a demonstração e evolução do fluxo de registro de B.O. com IA. Ajuste chaves, e-mails e regras de identificação policial antes de qualquer uso em ambiente real.
