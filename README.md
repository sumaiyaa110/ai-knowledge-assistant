# AI Knowledge Assistant

Upload documents and chat with them using a local AI model. Everything runs on
your machine with free, open-source tools: no paid APIs, no cloud AI.

**Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL + pgvector,
Prisma, Ollama, `@huggingface/transformers` (all-MiniLM-L6-v2 embeddings).

## Status

Phases 1-5 of 8 (foundation, authentication, app layout and dashboard, document
upload and processing, embeddings and vector search) are complete. Chat and AI
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
| `npm run embeddings:backfill` | Embed documents that are missing vectors |

## Authentication

Sessions are JWTs (HS256, signed with `JWT_SECRET` via `jose`) stored in an
httpOnly cookie for 7 days. Passwords are hashed with bcrypt.

- `src/lib/auth/` holds the JWT, password, session and rate-limit helpers.
- `src/middleware.ts` blocks anonymous access to app pages and API routes.
- Pages call `requireUser()`, which also checks the database, so deleted users
  and sessions issued before a password change are rejected.

## Document processing

Uploads (PDF, TXT, Markdown; 20 MB per file, 500 MB per user by default) are
stored at `uploads/<userId>/<documentId>.<ext>` and processed in the background:

```
UPLOADED -> EXTRACTING -> CHUNKING -> EMBEDDING -> READY   (or FAILED)
```

- `src/lib/documents/` validates and stores files and owns the database records.
- `src/lib/rag/` holds the pipeline: `extract.ts` (PDF text per page via
  `unpdf`), `clean.ts`, `chunk.ts` (recursive splitter, about 800 characters
  with 150 overlap) and `queue.ts` (in-process queue, one document at a time).
- Documents interrupted by a server restart are re-queued on startup
  (`src/instrumentation.ts`).

Scanned PDFs without a text layer are not supported (no OCR).

## Embeddings and search

Chunks are embedded in-process with `all-MiniLM-L6-v2` (384 dimensions) through
`@huggingface/transformers`. The model files (about 90 MB) are downloaded to
`.cache/models` the first time a document is processed; after that everything
works offline, and `EMBEDDING_OFFLINE=true` forbids network access entirely.

- `src/lib/embeddings/` loads the model and turns text into unit-length vectors.
- `src/lib/database/vectors.ts` stores vectors in pgvector and runs the cosine
  similarity query (raw SQL, HNSW index).
- `src/lib/rag/retrieve.ts` exposes `searchSimilarChunks()` and
  `getRelevantContext()`, always scoped to one user.
- `POST /api/search` with `{ "query": "..." }` returns the best chunks with scores.

A document only becomes `READY` once every chunk has a stored vector. To embed
documents that were processed before embeddings existed, or after changing
`EMBEDDING_MODEL`:

```bash
npm run embeddings:backfill
```

## Changing the LLM

Set `OLLAMA_MODEL` in `.env` to any model your Ollama has (for example
`qwen2.5:7b`, `llama3.2:3b` or `mistral:7b`) and restart the dev server.
