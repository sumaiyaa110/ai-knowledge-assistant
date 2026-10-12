# AI Knowledge Assistant

Upload documents and chat with them using a local AI model. Everything runs on
your machine with free, open-source tools: no paid APIs, no cloud AI.

**Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL + pgvector,
Prisma, Ollama, `@huggingface/transformers` (all-MiniLM-L6-v2 embeddings).

## Status

Phase 1 of 8 (foundation) is complete. Auth, uploads, chat and AI tools follow.

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL + pgvector)
- [Ollama](https://ollama.com) with a model pulled: `ollama pull llama3.2:3b`

## Setup

```bash
cp .env.example .env
npm install
npm run db:up        # start PostgreSQL + pgvector on localhost:5433
npm run db:deploy    # apply migrations
npm run dev
```

Open http://localhost:3000 (Next.js picks the next free port if 3000 is taken).
The home page shows whether the database and Ollama are reachable.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run db:up` / `db:down` | Start / stop the database container (data is kept) |
| `npm run db:migrate` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply existing migrations |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Changing the LLM

Set `OLLAMA_MODEL` in `.env` (for example `qwen2.5:7b` or `mistral:7b`), pull it
with `ollama pull <model>`, and restart the dev server.
