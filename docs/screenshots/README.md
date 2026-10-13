# Screenshots

Images referenced from the main README go in this folder.

## Files to capture

| File name | Page | Set up before capturing |
|---|---|---|
| `landing.png` | `/` (signed out) | both services showing as running |
| `dashboard.png` | `/dashboard` | at least two documents and one conversation, so nothing is empty |
| `documents.png` | `/documents` | one document mid-processing if you can catch it, otherwise all "Ready" |
| `document-detail.png` | `/documents/<id>` | a PDF with a generated summary |
| `chat.png` | `/chat/<id>` | one answered question with **Sources** expanded |
| `tools.png` | `/tools` | a generated summary visible |
| `quiz.png` | `/tools/sets/<id>` | a question answered, with the explanation showing |

## Tips

- Use a browser window about 1280 pixels wide so the sidebar and the content
  are both visible, and capture just the page, not the browser frame.
- Pick light or dark mode and use it for every screenshot.
- Use a document you are happy to show publicly; its title and text will be visible.
- PNG keeps text sharp. Keep each file under about 500 KB.
- One phone-width capture of the chat (`chat-mobile.png`) is a nice extra to
  show the responsive layout.

After adding the files, replace the table in the README's "Screenshots" section
with image links such as:

```markdown
![Chat with cited sources](docs/screenshots/chat.png)
```
