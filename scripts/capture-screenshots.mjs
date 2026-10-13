// Capture the README screenshots with a locally installed Chrome or Edge.
//
//   node scripts/capture-screenshots.mjs <base-url> <email> <password> [ids.json]
//
// The account must already contain documents, a chat, a summary and study
// sets (see docs/screenshots/README.md). ids.json may name which ones to show:
//   { "pdfId": "...", "chatId": "...", "quizId": "...", "deckId": "..." }
// Without it, the most recent of each is used.
//
// No extra packages: the browser is driven over the DevTools protocol.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [baseUrl, email, password, idsFile] = process.argv.slice(2);
if (!baseUrl || !email || !password) {
  console.error("Usage: node scripts/capture-screenshots.mjs <base-url> <email> <password> [ids.json]");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "screenshots");
mkdirSync(outDir, { recursive: true });

const BROWSERS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const browserPath = BROWSERS.find((candidate) => existsSync(candidate));
if (!browserPath) {
  console.error("No Chrome or Edge found. Set CHROME_PATH to the browser executable.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = 9333;
const profile = mkdtempSync(path.join(tmpdir(), "aika-shots-"));
const browser = spawn(
  browserPath,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--window-size=1280,860",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function connect() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = targets.find((target) => target.type === "page");
      if (page) return new WebSocket(page.webSocketDebuggerUrl);
    } catch {
      // Browser still starting.
    }
    await sleep(200);
  }
  throw new Error("Could not connect to the browser.");
}

const socket = await connect();
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const waiters = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== undefined) {
    const { resolve, reject } = pending.get(message.id) ?? {};
    pending.delete(message.id);
    if (message.error) reject?.(new Error(message.error.message));
    else resolve?.(message.result);
  } else if (waiters.has(message.method)) {
    waiters.get(message.method)();
    waiters.delete(message.method);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const once = (method) => new Promise((resolve) => waiters.set(method, resolve));

/** Run JavaScript in the page and return its (awaited) result. */
async function evaluate(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? "evaluation failed");
  return result.value;
}

async function goto(pathname, settleMs = 1500) {
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: baseUrl + pathname });
  await loaded;
  await sleep(settleMs);
}

async function viewport(width, height, scale = 1, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile });
}

async function shoot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const file = path.join(outDir, `${name}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`  saved docs/screenshots/${name}.png (${Math.round(Buffer.from(data, "base64").length / 1024)} KB)`);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await viewport(1280, 860);

  // Light theme for every screenshot, set before the first real page loads.
  await goto("/login", 500);
  await evaluate(`localStorage.setItem("theme", "light")`);

  // 1. Start page, signed out.
  await goto("/");
  await shoot("landing");

  // Sign in through the app's own API so the session cookie is set normally.
  const status = await evaluate(`
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ${JSON.stringify(email)}, password: ${JSON.stringify(password)} }),
    }).then((response) => response.status)
  `);
  if (status !== 200) throw new Error(`Sign-in failed with status ${status}.`);

  // Work out which items to show.
  const ids = idsFile ? JSON.parse(readFileSync(idsFile, "utf8")) : {};
  const found = await evaluate(`
    (async () => {
      const get = (url) => fetch(url).then((r) => r.json());
      const [docs, chats, sets] = await Promise.all([get("/api/documents"), get("/api/conversations"), get("/api/study-sets")]);
      return {
        pdfId: (docs.documents.find((d) => d.mimeType === "application/pdf") ?? docs.documents[0])?.id,
        chatId: chats.conversations[0]?.id,
        quizId: sets.studySets.find((s) => s.type === "QUIZ")?.id,
        deckId: sets.studySets.find((s) => s.type === "FLASHCARDS")?.id,
      };
    })()
  `);
  const { pdfId, chatId, quizId, deckId } = { ...found, ...ids };

  // 2. Dashboard.
  await goto("/dashboard");
  await shoot("dashboard");

  // 3. Documents: upload area and the list with status badges.
  await goto("/documents");
  await shoot("documents");

  // 4. Document detail: metadata, summary, extracted chunks.
  if (pdfId) {
    await goto(`/documents/${pdfId}`);
    await shoot("document-detail");
  }

  // 5. Chat with the last answer's sources expanded.
  if (chatId) {
    await goto(`/chat/${chatId}`);
    await evaluate(`
      (() => {
        const sources = [...document.querySelectorAll("main details")];
        sources.at(-1)?.setAttribute("open", "");
        document.querySelector("main .overflow-y-auto")?.scrollTo(0, 1e6);
        document.activeElement?.blur();
      })()
    `);
    await sleep(400);
    await shoot("chat");
  }

  // 6. AI Tools with the summary.
  await goto(pdfId ? `/tools?document=${pdfId}` : "/tools");
  await shoot("tools");

  // 7. Quiz: answer the first question so the explanation shows.
  if (quizId) {
    await goto(`/tools/sets/${quizId}`);
    await evaluate(`document.querySelector("main ul button")?.click()`);
    await sleep(400);
    await shoot("quiz");
  }

  // 8. Flashcards.
  if (deckId) {
    await goto(`/tools/sets/${deckId}`);
    await shoot("flashcards");
  }

  // 9. Chat at phone size.
  if (chatId) {
    await viewport(390, 844, 2, true);
    await goto(`/chat/${chatId}`);
    await evaluate(`document.querySelector("main .overflow-y-auto")?.scrollTo(0, 1e6); document.activeElement?.blur()`);
    await sleep(400);
    await shoot("chat-mobile");
  }

  console.log("Done.");
} finally {
  socket.close();
  browser.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
