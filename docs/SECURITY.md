# Security

This application is designed to run on your own computer for your own
documents. This page lists what it protects, how, and what it does not cover.

## Authentication

| Measure | Where |
|---|---|
| Passwords hashed with bcrypt (cost 12); plain text is never stored or logged | `src/lib/auth/password.ts` |
| Passwords limited to 72 bytes, so bcrypt never silently truncates one | `src/models/auth.ts` |
| Sessions are JWTs signed with HS256; the secret must be at least 32 characters or the app refuses to sign | `src/lib/auth/jwt.ts` |
| Session cookie is `httpOnly`, `SameSite=Lax`, and `Secure` in production builds | `src/lib/auth/session.ts` |
| Every request is checked twice: signature and expiry in middleware, then the user row and `sessionVersion` in the route | `src/middleware.ts`, `src/lib/auth/session.ts` |
| Changing the password invalidates every other session | `src/app/api/auth/password/route.ts` |
| Login gives the same error for an unknown email and a wrong password, and takes the same time for both | `src/app/api/auth/login/route.ts` |
| Post-login redirects only accept same-site relative paths | `src/lib/auth/constants.ts` |

### Rate limits

| Limit | Key | Purpose |
|---|---|---|
| 8 failed logins per 15 minutes | email | guessing one account's password |
| 40 failed logins per 15 minutes | client address | trying one password on many accounts |
| 10 registrations per hour | client address | mass account creation |
| 5 wrong current-password guesses per 15 minutes | signed-in user | abusing a stolen session |

The per-account limit is keyed on the email alone. The client address comes
from the `X-Forwarded-For` header, which a client can set to anything unless a
trusted reverse proxy overwrites it, so it is never the only protection.

## Data isolation

- Every database query for documents, chunks, vectors, conversations, messages
  and study sets includes the signed-in user's id. There is no "fetch by id"
  that skips the owner check.
- A resource that exists but belongs to someone else returns 404, the same as
  one that does not exist.
- Vector search joins through `documents.userId`, so one user's question can
  never retrieve another user's text, including when another user's document
  id is passed as a filter.
- Uploaded files are stored under `uploads/<userId>/` and served only through
  an authenticated route that checks ownership.

## File uploads

| Check | Detail |
|---|---|
| Type | extension must be `.pdf`, `.txt`, `.md` or `.markdown` |
| Content | a PDF must contain a PDF header; text files must not contain binary data |
| Size | per-file limit (20 MB by default), checked from the header before reading and again on the file |
| Quota | total per user (500 MB by default) |
| File name | directory parts and control characters are stripped; the stored name is generated from ids, never from the upload |
| Storage path | resolved and verified to stay inside the upload directory |
| Serving | text and Markdown are returned as `text/plain` with `nosniff`, so uploaded content is never interpreted as HTML |

## Input validation and output handling

- Every request body is parsed with a Zod schema before it is used.
- Database access goes through Prisma; the raw SQL used for vectors passes all
  values as bound parameters.
- React escapes text by default. Model output is rendered as Markdown with raw
  HTML disabled.
- Responses carry `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`
  and `Referrer-Policy: same-origin`.
- Errors shown to users never include stack traces or SQL; details go to the
  server log.

## Secrets and configuration

- `.env` is git-ignored; `.env.example` contains no secrets and an empty
  `JWT_SECRET`, which `npm run setup` fills with a random value.
- The database container listens on `127.0.0.1` only.
- The default database password in `.env.example` is meant for that local-only
  container. Change it if the database is ever exposed beyond your machine.

## AI-specific considerations

- **Prompt injection through documents.** A document can contain text such as
  "ignore your instructions". Sources are wrapped in tags and the system prompt
  tells the model to treat them as reference material, not instructions. This
  reduces the risk; it does not eliminate it. The impact is limited to the
  wording of an answer shown to the document's own owner: the model has no
  tools and cannot read other users' data.
- **Wrong answers.** Small models make mistakes. Answers cite their sources so
  they can be checked, and the interface says so.
- **Privacy.** Embeddings and generation run locally, and no document text or
  question is sent to an outside service. The only downloads are the models
  themselves, once. Set `EMBEDDING_OFFLINE=true` to forbid the embedding
  loader from using the network at all.

## Known limits

These are acceptable for a local, single-user or small-group installation and
would need work before exposing the app to the internet:

- No Content-Security-Policy header.
- Rate limits are held in memory: they reset on restart and are not shared
  between multiple server processes.
- The per-account login limit lets someone who knows your email lock your
  sign-in for 15 minutes by failing on purpose.
- Registration reveals whether an email is already registered.
- No email verification or password reset (there is no mail service).
- Sessions last seven days and are only revoked by a password change or by
  rotating `JWT_SECRET`.
- No HTTPS termination: put a reverse proxy in front for anything beyond localhost.
- `npm audit` reports issues in the build tooling bundled with Next.js 15 and
  in the Prisma CLI; their fixes require major-version upgrades.

## Reporting

This is a personal portfolio project. If you find a problem, please open an
issue on the repository.
