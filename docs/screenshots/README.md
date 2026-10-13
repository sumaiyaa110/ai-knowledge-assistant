# Screenshots

The images used in the main README. They were captured from a demo account
("Demo User") with three sample documents, in light mode at 1280×860.

| File | Page | What it shows |
|---|---|---|
| `landing.png` | `/` (signed out) | feature overview and local service status |
| `dashboard.png` | `/dashboard` | statistics, quick actions, recent activity |
| `documents.png` | `/documents` | upload area and the list with status badges |
| `document-detail.png` | `/documents/<id>` | metadata, generated summary, extracted text |
| `chat.png` | `/chat/<id>` | two answered questions, the last with its source expanded |
| `tools.png` | `/tools` | the summary and the generators |
| `quiz.png` | `/tools/sets/<id>` | a question answered, with the explanation |
| `flashcards.png` | `/tools/sets/<id>` | a flashcard deck |
| `chat-mobile.png` | `/chat/<id>` at 390×844 | the responsive layout |

## Recapturing them

`scripts/capture-screenshots.mjs` drives a locally installed Chrome or Edge in
headless mode and overwrites the files in this folder. It needs no extra
packages.

1. Start the app. A production build avoids the development indicator in the
   corner of the page:

   ```bash
   npm run build
   npm run start
   ```

2. Sign in with the account you want to show and prepare it: upload a few
   documents (one PDF), ask two questions in a chat, generate a summary, a quiz
   and a flashcard deck for the PDF. Use documents you are happy to show
   publicly, because their titles and text will be visible.

3. Run the script with that account's email and password:

   ```bash
   node scripts/capture-screenshots.mjs http://localhost:3000 you@example.com "your-password"
   ```

   It uses the account's PDF, its most recent chat, and its most recent quiz and
   deck. If the browser is not found, set `CHROME_PATH` to its executable.

## Capturing by hand

If you prefer to take them yourself: use a browser window about 1280 pixels
wide, capture only the page (not the browser frame), keep light or dark mode
the same for every image, and save as PNG with the file names above.
