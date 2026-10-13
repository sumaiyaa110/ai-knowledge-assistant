# AI features

All generation is done by a local model through Ollama. Nothing is sent to an
external service.

## Models

| Role | Model | Where it runs |
|---|---|---|
| Embeddings | `all-MiniLM-L6-v2` (384 dimensions) | inside the Next.js process, via ONNX Runtime |
| Language model | `qwen2.5:3b` by default | Ollama |

Both are configurable (`EMBEDDING_MODEL`, `OLLAMA_MODEL`). The prompts are
written for small models: short, explicit, one task per request.

## Chat

Described in [RAG-PIPELINE.md](RAG-PIPELINE.md). In short: answers come only
from retrieved passages, cite them, and questions the documents cannot answer
are refused without calling the model.

## Suggested questions

When a document becomes `READY`, three starter questions are generated from
passages at its beginning, middle and end and stored on the document. An empty
chat shows up to three of them, mixing documents when the chat covers several.
If none exist yet (for example Ollama was not running at upload time), they are
generated when the chat opens.

Code: [`src/lib/ai/suggestions.ts`](../src/lib/ai/suggestions.ts).

## Summary

Code: [`src/lib/tools/summary.ts`](../src/lib/tools/summary.ts).

- **Short documents** (up to about 3,200 characters): one request on the full text.
- **Longer documents**: map-reduce. The text is cut into sections of about 2,400
  characters; each is summarized in two or three sentences; the final summary is
  written from those notes. At most 8 sections are used, picked at even
  intervals, so the wait stays within a few minutes. The summary records how
  many sections it is based on and the interface says so when it is a sample.

Output, stored in `documents.summary`:

```json
{
  "short": "Two or three sentences.",
  "mainPoints": ["...", "..."],
  "concepts": [{ "term": "...", "explanation": "..." }],
  "generatedAt": "2026-10-13T05:45:53.000Z",
  "model": "qwen2.5:3b",
  "coverage": { "sectionsUsed": 3, "sectionsTotal": 3 }
}
```

## Quiz

Code: [`src/lib/tools/study-sets.ts`](../src/lib/tools/study-sets.ts).

1. **Pick passages** spread evenly across the document, so the questions do not
   all come from the first page. With few passages, several questions are
   written from each.
2. **Write** one to three multiple-choice questions per passage: four options,
   the index of the correct one, and a one-sentence explanation.
3. **Validate** the JSON: four distinct options, a valid answer index, and no
   references to "the passage".
4. **Shuffle** the options, because models tend to put the correct answer first.
5. **Check the answer key.** The model is given the passage and the shuffled
   options without the key and asked which is correct. If it disagrees with the
   key, the question is discarded and one replacement is attempted.

Step 5 catches most wrong keys and ambiguous questions, at the cost of one extra
short model call per question. It also means a quiz can contain fewer questions
than requested.

## Flashcards

Same passage planning as the quiz, up to four cards per passage. Each card has a
short front (a question or term) and a one-sentence back. Cards with duplicate
fronts or that refer to "the passage" are dropped.

## Structured output

Every tool asks for JSON and gets it reliably through two layers
([`src/lib/ai/json.ts`](../src/lib/ai/json.ts)):

1. **Ollama's `format` parameter** is given a JSON schema, which constrains the
   model's output to that shape.
2. **A Zod schema** then checks what a JSON schema cannot guarantee in practice:
   minimum lengths, distinct options, value ranges.

A reply that fails either check is retried once at a slightly higher
temperature, so the model does not repeat the same mistake. Connection problems
are not retried.

## Background jobs

Code: [`src/lib/ai/jobs.ts`](../src/lib/ai/jobs.ts).

Generation takes from half a minute to several minutes on CPU, so it does not
happen inside a request:

- Starting a tool returns `202` with a job; the page polls for progress.
- Jobs run one at a time, in the order they were started.
- A job only writes its result when it finishes. A failure or a server restart
  leaves nothing half-saved.
- Starting the same tool twice for one document returns `409`.

## Failure handling

| Situation | What the user sees |
|---|---|
| Ollama not running | "The local AI model is not reachable. Make sure Ollama is running, then try again." |
| Model not downloaded | the `ollama pull` command to run |
| No answer in time | "The local AI model took too long to respond. Please try again." |
| Unusable output twice in a row | "The local model did not produce usable output. Try again; a larger model gives better results." |
| Document has no text | "This document has no text to work with." |

The start page, the chat screen and the tools page also show a notice when
Ollama or the model is unavailable, before anything is attempted.

## Honest limits

- A 3-billion-parameter model summarizes and quizzes well on clear text, and
  still gets details wrong. Every generated page says so.
- The answer check uses the same model that wrote the question, so a mistake the
  model makes consistently can pass.
- Summaries of very long documents are based on a sample of sections.
- Larger models (`qwen2.5:7b`, `mistral:7b`) improve quality at the cost of
  memory and speed; nothing else needs to change.
