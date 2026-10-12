# AI Knowledge Assistant

Upload documents and chat with them using a local AI model. Everything runs on
your machine with free, open-source tools: no paid APIs, no cloud AI.

**Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL + pgvector,
Prisma, Ollama, `@huggingface/transformers` (all-MiniLM-L6-v2 embeddings).

## Status

Phases 1-2 of 8 (foundation, authentication) are complete. Uploads, chat and AI
tools follow.

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL + pgvector)
- [Ollama](https://ollama.com) running with the model named in `OLLAMA_MODEL`
  (default `qwen2.5:3b`)

## Setup

```bash
cp .env.example .env   # then set JWT_SECRET as described in the file
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

## Authentication

Sessions are JWTs (HS256, signed with `JWT_SECRET` via `jose`) stored in an
httpOnly cookie for 7 days. Passwords are hashed with bcrypt.

- `src/lib/auth/` holds the JWT, password, session and rate-limit helpers.
- `src/middleware.ts` blocks anonymous access to app pages and API routes.
- Pages call `requireUser()`, which also checks the database, so deleted users
  and sessions issued before a password change are rejected.

## Changing the LLM

Set `OLLAMA_MODEL` in `.env` to any model your Ollama has (for example
`qwen2.5:7b`, `llama3.2:3b` or `mistral:7b`) and restart the dev server.
