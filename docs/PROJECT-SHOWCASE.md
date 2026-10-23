# Project showcase: AI Knowledge Assistant

*By Sumaiya Zaman. A walkthrough of why I built this, how it works, what went wrong
along the way, and what I would do next.*

## Motivation

As a student I collect a lot of reading: lecture notes, PDFs of papers, my own
Markdown notes. Two things kept bothering me.

First, finding something in them is slow. Keyword search only works when I
remember the exact words the author used.

Second, the tools that solve this well are cloud chatbots, and I was not
comfortable uploading everything I read to them. They also cost money once you
use them seriously, which matters on a student budget.

So I set myself a constraint: build a "chat with your documents" application
where nothing leaves my laptop and nothing costs money. That constraint shaped
almost every decision that follows.

## Problem statement

Build a web application where a user can:

1. upload PDF, text and Markdown documents,
2. ask questions and get answers that come from those documents, with the
   passages shown so the answer can be checked,
3. generate study material (summaries, quizzes, flashcards) from a document,

using only free, open-source software running locally, on ordinary hardware
without a graphics card.

## Solution

A single Next.js application backed by PostgreSQL and a local language model.

- Documents are split into small chunks. Each chunk is turned into a list of
  384 numbers (an embedding) that captures its meaning, and stored in
  PostgreSQL using the pgvector extension.
- A question is embedded the same way, and the database returns the chunks
  whose numbers are closest to it.
- Those chunks are given to a language model running in Ollama, with
  instructions to answer only from them and to cite them.

This pattern is called retrieval-augmented generation (RAG). I implemented each
step myself instead of using a framework such as LangChain, because I wanted to
understand what each step does and be able to explain it.

## Main features

- Accounts with registration, login, profile and password change.
- Drag-and-drop upload with live status as a document is processed.
- Chat that streams answers, cites sources, keeps conversation history, and
  declines questions the documents cannot answer.
- Summaries, multiple-choice quizzes and flashcards, saved for later.
- A dashboard, dark mode and a layout that works on a phone.

## Architecture decisions

**One application instead of several services.** The interface, the API, the
document processing and the embedding model all run in one Node.js process.
The alternative was a separate Python service for embeddings. I chose the
single process because it makes the project installable with one command, and
the embedding model I use is small enough to run in Node through ONNX Runtime.
The cost is that the app cannot be scaled across several servers as it stands.

**PostgreSQL for vectors too.** I could have added a dedicated vector database.
Keeping vectors in PostgreSQL means one database to run, and it lets a single
SQL query combine "closest in meaning" with "belongs to this user" and "from
these documents". For a personal document collection that is the right size of
tool.

**Hand-written authentication.** I used JWTs in httpOnly cookies with bcrypt
rather than an authentication library, to learn how sessions actually work.
The interesting part was invalidation: a JWT is valid until it expires, so
"sign out everywhere when I change my password" needed a version number stored
on the user and embedded in each token.

**Refusing before generating.** If no chunk is similar enough to the question,
the app answers "I couldn't find that in your documents" itself and never calls
the model. I consider this the most important decision in the project. Telling
a small model "don't make things up" works most of the time; not asking it at
all works every time.

**Background jobs with polling.** Summaries and quizzes take minutes on a CPU.
They run as jobs, and the page asks for progress every second and a half.
WebSockets would be more elegant, but polling is simple and survives a page
reload.

## AI implementation details

**Chunking.** Text is split recursively: by Markdown headings first, then
paragraphs, lines, sentences and words, always taking the largest unit that
fits in about 800 characters. Neighbouring chunks share 150 characters so a
fact on a boundary is findable from either side. PDF page numbers are carried
through so citations can say "page 3".

**Embeddings.** `all-MiniLM-L6-v2` produces unit-length vectors, which lets
pgvector compare them with cosine distance through an HNSW index.

**Prompting a small model.** The default model has about 3 billion parameters,
which is tiny. What worked was keeping every request short and specific:
sources wrapped in tags, numbered rules, one task per call. For quizzes I ask
for one to three questions from one passage at a time rather than "write ten
questions about this document".

**Structured output.** Quizzes and summaries must be valid JSON. Ollama can be
given a JSON schema that constrains the model's output, and I validate the
result again with Zod for things a schema cannot express, such as "the four
options must be different". Invalid output is retried once.

**Checking the model with the model.** After a quiz question is written, I
shuffle its options and ask the model to answer it from the passage without
the answer key. If it disagrees with the key, the question is thrown away.

## Technical challenges

**The vector index kept disappearing from migrations.** Prisma does not
understand pgvector, so I added the index by hand in SQL. The next time I
generated a migration, Prisma saw an index it did not know about and wanted to
drop it. The fix was to declare an index with the same name in the Prisma
schema, so Prisma considers it accounted for, while the real definition stays
in the hand-written SQL.

**Uploads larger than 10 MB were silently cut off.** Small files worked, large
ones failed in confusing ways. It turned out Next.js buffers request bodies
that pass through middleware and truncates them at 10 MB by default. I only
found it because I tested with a 15 MB file on purpose.

**Vector search and user isolation interact badly.** An approximate index
returns its nearest candidates first and the "belongs to this user" filter is
applied afterwards. If most of the nearest candidates belong to other users,
the query returns fewer results than asked for. pgvector's iterative scan
setting fixes this by continuing to walk the index until enough rows pass the
filter.

**Quiz answer keys were sometimes wrong.** In my first test, one question in
five had the wrong option marked as correct, and another had two defensible
answers. The answer-check step described above, plus stricter instructions
about short, clearly different options, removed the wrong keys in later runs.

**The first chat message vanished in development.** A question typed on the
"new chat" screen is handed to the chat page, which sends it on load. In
development React mounts components twice to expose bugs, and my cleanup code
cancelled the request the first mount had just started. Deferring the send by
one tick and cancelling that timer in cleanup fixed it.

**My laptop ran out of memory.** Several times during testing the whole Docker
engine froze. A language model, a database, a development server and a browser
together need more RAM than I had free. It did not change the code much, but it
is why the app has clear "database not reachable" and "model not reachable"
screens instead of a generic error.

## What I learned

- **RAG is mostly not about the model.** Chunking, retrieval thresholds and the
  refusal path decided answer quality far more than prompt wording did.
- **Test with awkward inputs on purpose.** The 15 MB file, the PDF with no text
  layer, the text file renamed to `.pdf`, the question about chocolate cake:
  each one found a real problem that a normal demo would never have shown.
- **Small models need small tasks.** Every time I asked for less per request,
  results improved.
- **Treat model output like user input.** Validate it, expect it to be wrong
  sometimes, and design the interface so mistakes are visible (citations) and
  cheap (retry, regenerate).
- **Progress beats speed.** I could not make a CPU model fast. Showing
  "Searching…", "Reading the sources…" and a streaming answer made a
  12-second wait feel acceptable.
- **Write down why.** Decisions like the `allDocuments` flag on conversations
  look odd without the reason next to them. Comments that explain why, not
  what, saved me more than once.

## Limitations I am aware of

- Answers, summaries and quizzes can still be wrong; the default model is small.
- Scanned PDFs do not work because there is no OCR.
- The app is a single process: jobs and rate limits live in memory.
- Summaries of very long documents are based on a sample of sections.
- It is built for local use and has not been hardened for the public internet;
  [SECURITY.md](SECURITY.md) lists what is missing.

## Future improvements

- **Better retrieval**: combine vector search with keyword search, and re-rank
  the candidates with a small cross-encoder model.
- **OCR** for scanned PDFs, using Tesseract locally.
- **Clickable citations** that open the document at the cited passage.
- **An evaluation set**: a fixed list of questions with known answers, so a
  change to chunking or prompts can be measured instead of judged by eye.
- **A proper job queue** persisted in PostgreSQL, so jobs survive restarts.
- **Larger models** where hardware allows, with the model selectable in the UI.
- **Spaced repetition** for flashcards.

## How to run it

See the [README](../README.md#quick-start) for setup, and the
[demo guide](DEMO-GUIDE.md) for a three-minute walkthrough.
