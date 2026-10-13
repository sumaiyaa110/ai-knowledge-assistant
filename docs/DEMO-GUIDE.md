# Demo guide

A three-minute walkthrough for an interview, a class presentation or a screen
recording, with what to say at each step.

## Before you start (5 minutes, off camera)

The local model is slow the first time it is used and fast afterwards, so
prepare:

1. **Start everything**: Docker Desktop, then `npm run db:up`, Ollama, then
   `npm run dev`. The start page should show both services with green ticks.
2. **Warm the model.** Ask one throwaway question in any chat. The first answer
   loads the model into memory (up to 40 seconds); later answers start in
   about 10 seconds.
3. **Pick the demo document.** A text-based PDF of 3 to 10 pages on a topic you
   can talk about works best: lecture notes or a short article. Avoid scanned
   PDFs (no OCR) and anything private.
4. **Prepare three questions** for that document:
   - one with a clear, specific answer on a known page,
   - one follow-up that depends on the first ("Why is that?"),
   - one the document definitely does not answer ("What is the capital of France?").
5. **Decide what to pre-generate.** A quiz takes about two minutes on CPU,
   which is too long to wait for live. Use a second document that already has a
   summary, a quiz and flashcards, and generate live only if you have time.
6. **Close other heavy programs.** The model needs free memory.
7. Use a fresh account name for the demo, and have the browser at about
   1280 pixels wide.

## The three-minute flow

| Time | Step | Do | Say |
|---|---|---|---|
| 0:00 | Introduce | Show the start page | "This is a document assistant where everything, including the AI model, runs on this laptop. No API keys, no cloud." Point at the two green service checks. |
| 0:15 | 1. Register | Create an account | "Authentication is written from scratch: bcrypt for passwords, a signed JWT in an httpOnly cookie." |
| 0:30 | 2. Upload | Drag the PDF onto **Documents** | "The file is validated by its actual content, not just its name, then processed in the background." |
| 0:40 | 3. Pipeline | Watch the status badge change | "Extracting text, splitting into chunks, then indexing: each chunk becomes a vector stored in PostgreSQL with pgvector." Open the document and scroll the chunks with their page numbers. |
| 1:00 | 4. Ask | Press **Chat with this document**, click a suggested question or type your first one | "The question is embedded the same way, the database finds the closest chunks, and only those go to the model." Let the answer stream. |
| 1:25 | 5. Citations | Expand **Sources** under the answer | "Every answer cites the passages it used, with the page number, so it can be checked." |
| 1:40 | Follow-up and refusal | Ask the follow-up, then the off-topic question | "It keeps the conversation context. And when the documents don't contain the answer, it says so. That reply doesn't come from the model at all: retrieval found nothing relevant, so the model is never asked." |
| 2:05 | 6. Summary | Open **AI Tools**, show the summary (or press **Summarize** on a short document) | "Long documents are summarized section by section and then combined, because the whole text wouldn't fit in the model's context." |
| 2:20 | 7. Quiz | Open a saved quiz, answer one question right and one wrong | "Each question is generated from one passage. Before it's saved, the model has to answer it without the key; if it disagrees, the question is discarded." |
| 2:40 | 8. Flashcards | Open a saved deck, flip two cards, press **Shuffle** | "Same pipeline, different output format, validated against a schema." |
| 2:50 | Close | Toggle dark mode, or resize to phone width | "It's responsive, and everything you saw runs offline." |

## What to highlight

If you only have time to make three points, make these:

1. **It refuses instead of guessing.** Show the off-topic question. This is the
   feature that separates a grounded assistant from a chatbot, and it is a
   design decision, not a prompt trick.
2. **Citations with page numbers.** They exist because page numbers are carried
   from PDF extraction through chunking into the database.
3. **It is all local.** Mention the stack once: Next.js, PostgreSQL with
   pgvector, Ollama, and an embedding model running inside the Node process.

Good details to have ready if asked:

- **Why pgvector and not a vector database?** One database, and the user filter
  and the similarity search happen in the same SQL query.
- **Why no LangChain?** The whole pipeline is about 1,200 lines across a dozen
  files, comments included; writing it meant understanding every step.
- **How do you stop one user seeing another's documents?** Every query,
  including the vector search, is scoped by user id; another user's id returns
  "not found".
- **What happens when the model is wrong?** Sources are shown for checking,
  output is schema-validated, quiz keys are double-checked, and the interface
  says the content is model-written.
- **What was the hardest bug?** Pick one from
  [PROJECT-SHOWCASE.md](PROJECT-SHOWCASE.md#technical-challenges) that you can
  explain comfortably.

## If something goes wrong

| Problem | What to do |
|---|---|
| The answer takes too long to start | Keep talking through the pipeline; the status line shows "Reading the sources…". This is where warming the model beforehand pays off. |
| "The local AI model is not reachable" | Ollama stopped. Start it, press **Try again**. It is also a chance to show the error handling. |
| "The database is not reachable" | `npm run db:up`, then reload. |
| An answer is wrong or odd | Say so, expand the sources, and explain that the default model is a small one chosen to run on a laptop CPU. |
| A quiz comes back with fewer questions than requested | Expected: questions that failed the answer check were dropped. |
| Everything freezes | The machine is out of memory. Have a short screen recording as a backup. |

## Recording a video instead

- Record at 1280×720 or 1920×1080, with the browser zoomed to 110% so text is readable.
- Cut or speed up the waits (first token, quiz generation) in editing, and say
  that you did.
- A 90-second version: upload, one question with sources, the refusal, one quiz question.

## Taking the README screenshots

Run through this flow once and capture the screens listed in
[screenshots/README.md](screenshots/README.md) as you go.
