# AI Knowledge Assistant

Upload documents and chat with them using a local AI model. Everything runs on
your machine with free, open-source tools: no paid APIs, no cloud AI.

**Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL + pgvector,
Prisma, Ollama, `@huggingface/transformers` (all-MiniLM-L6-v2 embeddings).

## Status

Phases 1-7 of 8 (foundation, authentication, app layout and dashboard, document
upload and processing, embeddings and vector search, RAG chat, AI study tools)
are complete. Final polish follows.

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

## Chat

Each question goes through the same steps:

```
question -> embed -> pgvector search (user's documents only) -> prompt with the
passages -> Ollama streams the answer -> answer and sources are saved
```

- If no passage is relevant enough, the app answers "I couldn't find that in
  your documents." itself, without calling the model.
- The model is told to answer only from the passages and to cite them as `[1]`,
  `[2]`. The sources shown under an answer are stored with the message, so old
  chats still read correctly after a document is deleted.
- A chat covers either all documents or the ones chosen when it was started.
- `src/lib/ai/` holds the Ollama client, the prompts and suggested questions;
  `src/lib/chat/` holds conversations and the answer pipeline.
- Three suggested questions are generated for each document once it is ready.

Small local models are slow on CPU and can still misread a passage, so answers
should be checked against the sources shown.

## AI tools

The AI Tools page works on one ready document at a time:

- **Summary**: a short overview, main points and important concepts. Short
  documents are summarized in one step; longer ones section by section, then
  combined (up to 8 sections, sampled evenly, so very long documents are
  summarized from a sample).
- **Quiz**: 3, 5 or 10 multiple-choice questions with the correct answer and an
  explanation, written from passages spread across the document.
- **Flashcards**: 6, 10 or 16 question/answer cards.

Generation runs as a background job with progress shown on the page; you can
leave and come back. Quizzes and flashcards are saved as study sets and can be
reopened or deleted. The summary is stored on the document.

- `src/lib/tools/` holds the generators; `src/lib/ai/jobs.ts` the job runner;
  `src/lib/ai/tool-prompts.ts` the prompts.
- Jobs live in memory and run one at a time. Restarting the server cancels a
  job in progress (nothing partial is saved); just start it again.

Everything is written by the local model and should be checked before relying
on it.

## Changing the LLM

Set `OLLAMA_MODEL` in `.env` to any model your Ollama has (for example
`qwen2.5:7b`, `llama3.2:3b` or `mistral:7b`) and restart the dev server.
