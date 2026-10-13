# Architecture

## Overview

The application is a single Next.js 15 project. The same Node.js process serves
the React interface, the JSON API, the document processing pipeline, the
embedding model and the background jobs. It depends on two local services:

- **PostgreSQL 16 with pgvector** (Docker) for all data, including vectors.
- **Ollama** for the language model.

There is no message queue, cache server or separate worker. That keeps local
setup to "one app, one database, one model server", at the cost of the app
being a single-process design (see [Trade-offs](#trade-offs)).

## Layers

```
src/app/            routing: pages (server components) and API route handlers
src/components/     presentation: client components where interaction is needed
src/lib/            behaviour: everything the routes call
src/models/         contracts: types and Zod schemas shared by server and browser
```

Rules the code follows:

- **Routes are thin.** A route handler authenticates, validates input with a Zod
  schema, calls one function in `src/lib`, and maps the result to a response.
- **Every query is scoped to the user.** Functions in `src/lib` take a `userId`
  and include it in the `where` clause, so one user can never read another's
  rows. A resource that belongs to someone else is reported as "not found".
- **Server components by default.** Pages load their data on the server. Only
  components that need state, effects or event handlers are client components.
- **Types cross the network as DTOs.** `src/models` defines the JSON shapes
  (dates as ISO strings) so the browser never imports server code.

## Folder structure

```
prisma/
  schema.prisma              data model
  migrations/                SQL migrations (the first one also creates pgvector and the HNSW index)
scripts/
  setup.mjs                  one-command local setup
  download-embedding-model.mts
  backfill-embeddings.mts
src/
  middleware.ts              first check of the session cookie on every request
  instrumentation.ts         on server start: re-queue documents interrupted mid-processing
  app/
    page.tsx                 start page with service status
    (auth)/                  login, register
    (app)/                   everything behind sign-in, inside the sidebar layout
      dashboard/ documents/ chat/ tools/ profile/
      layout.tsx             app shell; shows a clear screen if the database is down
      error.tsx loading.tsx not-found.tsx
    api/
      auth/                  register, login, logout, me, password
      documents/             upload, list, detail, file, reprocess, summary, tools
      conversations/         list, create, rename, delete, messages (streaming), suggestions
      study-sets/            list, create, detail, delete
      search/                semantic search
      health/                database and Ollama status
  components/
    ui/                      shadcn/ui primitives
    layout/                  sidebar, header, theme, error and status screens
    auth/ dashboard/ documents/ chat/ tools/
  lib/
    auth/                    JWT, password hashing, session helpers, login rate limit
    database/                Prisma client, vector SQL, health and error helpers
    documents/               upload validation, file storage, document records
    rag/                     extract, clean, chunk, embed, retrieve, processing queue
    embeddings/              the local embedding model
    ai/                      Ollama client, prompts, JSON output helper, background jobs
    chat/                    conversations and the answer pipeline
    tools/                   summary, quiz and flashcard generation
    api/                     response helpers (server) and fetch helpers (browser)
    config.ts                all environment-driven settings in one place
  models/                    auth, document, chat, retrieval, study, dashboard
```

## Request flows

### Signing in

1. `POST /api/auth/login` validates the body, looks up the user and compares the
   password with bcrypt.
2. A JWT (HS256, 7 days) carrying the user id and the user's `sessionVersion` is
   set as an httpOnly, SameSite=Lax cookie.
3. On every later request, `middleware.ts` verifies the token's signature and
   expiry. Pages and API routes then call `getCurrentUser()`, which also loads
   the user and compares `sessionVersion`.
4. Changing the password increments `sessionVersion`, which invalidates every
   other session.

Two checks are needed because middleware runs in the edge runtime and cannot
reach the database.

### Uploading a document

1. `POST /api/documents` checks type, size, storage quota and the file's actual
   bytes, writes it to `uploads/<userId>/<documentId>.<ext>` and creates the row.
2. The document id is put on an in-process queue and the request returns 202.
3. The queue processes one document at a time; each stage is written to
   `documents.status`. The browser polls while anything is processing.

See [RAG-PIPELINE.md](RAG-PIPELINE.md) for the stages.

### Asking a question

`POST /api/conversations/:id/messages` returns a stream of newline-delimited
JSON events (`user_message`, `status`, `sources`, `token`, `done`, `error`), so
the answer appears as it is written. Closing the connection aborts generation in
Ollama. See [RAG-PIPELINE.md](RAG-PIPELINE.md).

### Generating study material

Starting a summary, quiz or flashcard deck creates a background job and returns
202. The page polls `GET /api/documents/:id/tools` for progress. See
[AI-FEATURES.md](AI-FEATURES.md).

## Error handling

- **Validation errors** return 400 with per-field messages.
- **Not found and not yours** both return 404.
- **Database unavailable**: the app layout catches the connection error and
  shows a dedicated screen with the commands to fix it; API calls made from the
  browser get a message pointing at the database.
- **Ollama unavailable, model missing, timeout**: each has its own message.
  Chat removes the unanswered question so "Try again" does not duplicate it;
  jobs end as failed with the message and save nothing.
- **Unexpected errors** are caught by `error.tsx` boundaries with a retry button.

## Trade-offs

| Choice | Benefit | Cost |
|---|---|---|
| Processing queue, jobs and rate limiter in memory | no extra services | single process only; a restart cancels running jobs (interrupted documents are re-queued on start) |
| Embedding model inside the Node.js process | no Python service | about 500 MB of memory in the app process |
| Polling for progress | simple and robust | a request every 1.5 seconds while something is running |
| pgvector instead of a vector database | one database, joins and filters in SQL | fine for personal collections, not tuned for millions of vectors |
| Text cleaning and chunking on the main thread | no worker setup | a very large text file briefly delays other requests |
