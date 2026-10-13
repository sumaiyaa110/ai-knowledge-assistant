// One-command local setup:  npm run setup
//
// Safe to run again at any time. It never deletes data: it only creates what
// is missing (.env, the database container, tables, the embedding model cache)
// and reports what still needs doing by hand (Ollama).
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const ok = (message) => console.log(`  ok    ${message}`);
const todo = (message) => console.log(`  TODO  ${message}`);
const step = (title) => console.log(`\n${title}`);
const problems = [];

function fail(message) {
  console.error(`\n  FAILED  ${message}\n`);
  process.exit(1);
}

/** Run a command, showing its output. Returns true on success. */
function run(command, args) {
  // shell: true so that npx/docker resolve on Windows as well.
  return spawnSync([command, ...args].join(" "), { stdio: "inherit", shell: true }).status === 0;
}

function canConnect(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

/** Minimal .env reader: KEY=value lines, optional quotes, # comments. */
function readEnv(file) {
  const values = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

// --- 1. Node.js -------------------------------------------------------------
step("1/6  Node.js");
const major = Number(process.versions.node.split(".")[0]);
if (major < 20) fail(`Node.js 20 or newer is required (found ${process.versions.node}).`);
ok(`Node.js ${process.versions.node}`);

// --- 2. .env ----------------------------------------------------------------
step("2/6  Environment file");
if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  ok("created .env from .env.example");
} else {
  ok(".env already exists (left as it is)");
}
let envText = readFileSync(".env", "utf8");
if (/^JWT_SECRET\s*=\s*(""|'')?\s*$/m.test(envText)) {
  const secret = randomBytes(48).toString("base64url");
  envText = envText.replace(/^JWT_SECRET\s*=.*$/m, `JWT_SECRET="${secret}"`);
  writeFileSync(".env", envText);
  ok("generated a random JWT_SECRET");
} else {
  ok("JWT_SECRET is set");
}
const env = readEnv(".env");

// --- 3. PostgreSQL + pgvector --------------------------------------------------
step("3/6  PostgreSQL with pgvector");
let dbUrl;
try {
  dbUrl = new URL(env.DATABASE_URL);
} catch {
  fail("DATABASE_URL in .env is missing or not a valid URL.");
}
const dbHost = dbUrl.hostname;
const dbPort = Number(dbUrl.port || 5432);

if (await canConnect(dbHost, dbPort)) {
  ok(`a database is already listening on ${dbHost}:${dbPort}`);
} else {
  if (spawnSync("docker info", { shell: true, stdio: "ignore" }).status !== 0) {
    fail("Docker is not running. Start Docker Desktop, wait until it is ready, and run this again.");
  }
  console.log("  starting the database container (first run downloads the image)...");
  if (!run("docker", ["compose", "up", "-d", "--wait"])) {
    fail(`Could not start the database. If port ${dbPort} is taken, change POSTGRES_PORT and DATABASE_URL in .env.`);
  }
  ok(`database container is running on ${dbHost}:${dbPort}`);
}

// --- 4. Tables -----------------------------------------------------------------
step("4/6  Database tables");
if (!run("npx", ["prisma", "migrate", "deploy"])) {
  fail("Applying the migrations failed. Check DATABASE_URL in .env against docker-compose.yml.");
}
if (!run("npx", ["prisma", "generate"])) fail("Generating the Prisma client failed.");
ok("migrations applied and Prisma client generated");

// --- 5. Embedding model ----------------------------------------------------------
step("5/6  Embedding model (all-MiniLM-L6-v2, about 90 MB, runs inside the app)");
const cacheDir = path.resolve(env.EMBEDDING_CACHE_DIR || "./.cache/models");
const cached = existsSync(cacheDir) && readdirSync(cacheDir).length > 0;
if (cached) {
  ok(`already downloaded to ${path.relative(root, cacheDir)}`);
} else if (run("npm", ["run", "--silent", "embeddings:download"])) {
  ok(`downloaded to ${path.relative(root, cacheDir)}`);
} else {
  problems.push("The embedding model could not be downloaded. Check your internet connection and run: npm run embeddings:download");
  todo(problems.at(-1));
}

// --- 6. Ollama ---------------------------------------------------------------------
step("6/6  Ollama (the local language model)");
const ollamaUrl = env.OLLAMA_BASE_URL || "http://localhost:11434";
const model = env.OLLAMA_MODEL || "qwen2.5:3b";
try {
  const response = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
  const { models = [] } = await response.json();
  ok(`Ollama is running at ${ollamaUrl}`);
  if (models.some((entry) => entry.name === model)) {
    ok(`model ${model} is installed`);
  } else {
    problems.push(`Download the language model with: ollama pull ${model}`);
    todo(problems.at(-1));
  }
} catch {
  problems.push(`Ollama is not reachable at ${ollamaUrl}. Install it from https://ollama.com, start it, then run: ollama pull ${model}`);
  todo(problems.at(-1));
}

// --- Summary -------------------------------------------------------------------------
console.log("\n----------------------------------------");
if (problems.length === 0) {
  console.log("Setup complete. Start the app with:\n\n  npm run dev\n");
} else {
  console.log("Almost there. Uploading and searching will work; chat and the AI tools need:\n");
  for (const problem of problems) console.log(`  - ${problem}`);
  console.log("\nThen start the app with:\n\n  npm run dev\n");
}
