// Tests for personalize.mjs. Run with: npm test
//
// Each test copies the script into a temporary project with its own
// author.config.json and the four files it edits, then runs it there.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "personalize.mjs");

const FILES = ["README.md", "LICENSE", "package.json", "docs/PROJECT-SHOWCASE.md"];

/** Every file with one name and one username in it, as the real files have. */
function contents(name, username) {
  return {
    "README.md": `| **Author** | ${name} ([@${username}](https://github.com/${username})) |\n\n© ${name}\n`,
    LICENSE: `Copyright (c) 2026 ${name}\n`,
    "package.json": `{\n  "author": "${name}",\n  "url": "https://github.com/${username}/repo.git"\n}\n`,
    "docs/PROJECT-SHOWCASE.md": `*By ${name}.*\n`,
  };
}

const PLACEHOLDERS = contents("YOUR_NAME", "YOUR_GITHUB_USERNAME");

let dir;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

function project(files, config) {
  dir = mkdtempSync(path.join(tmpdir(), "personalize-test-"));
  mkdirSync(path.join(dir, "scripts"));
  mkdirSync(path.join(dir, "docs"));
  copyFileSync(script, path.join(dir, "scripts", "personalize.mjs"));
  for (const [file, text] of Object.entries(files)) writeFileSync(path.join(dir, file), text);
  writeConfig(config);
}

function writeConfig(config) {
  writeFileSync(path.join(dir, "author.config.json"), JSON.stringify(config, null, 2));
}

function run() {
  return spawnSync(process.execPath, [path.join(dir, "scripts", "personalize.mjs")], { encoding: "utf8" });
}

function read() {
  return Object.fromEntries(FILES.map((file) => [file, readFileSync(path.join(dir, file), "utf8")]));
}

function readConfig() {
  return JSON.parse(readFileSync(path.join(dir, "author.config.json"), "utf8"));
}

const ADA = { name: "Ada Lovelace", githubUsername: "ada-l" };

test("replaces the placeholders on a first run", () => {
  project(PLACEHOLDERS, ADA);

  const result = run();

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(read(), contents("Ada Lovelace", "ada-l"));
  assert.match(result.stdout, /Done: 8 replacement\(s\)/);
  assert.deepEqual(readConfig(), { ...ADA, _applied: ADA });
});

test("replaces the previously applied values after a change", () => {
  project(contents("Ada Lovelace", "ada-l"), {
    name: "Grace Hopper",
    githubUsername: "ghopper",
    _applied: ADA,
  });

  const result = run();

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(read(), contents("Grace Hopper", "ghopper"));
  assert.deepEqual(readConfig()._applied, { name: "Grace Hopper", githubUsername: "ghopper" });
});

test("still replaces placeholders when _applied already matches the config", () => {
  // The files were never updated, but the config claims they were.
  project(PLACEHOLDERS, { ...ADA, _applied: ADA });

  const result = run();

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(read(), contents("Ada Lovelace", "ada-l"));
});

test("a second run changes nothing", () => {
  project(PLACEHOLDERS, ADA);
  assert.equal(run().status, 0);
  const afterFirst = read();

  const result = run();

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(read(), afterFirst);
  assert.match(result.stdout, /Done: 0 replacement\(s\)/);
});

for (const [label, config] of [
  ["the name is still the placeholder", { name: "YOUR_NAME", githubUsername: "ada-l" }],
  ["the username is still the placeholder", { name: "Ada Lovelace", githubUsername: "YOUR_GITHUB_USERNAME" }],
  ["the name is empty", { name: "  ", githubUsername: "ada-l" }],
  ["the username is not a GitHub username", { name: "Ada Lovelace", githubUsername: "ada l" }],
  ["the username starts with a hyphen", { name: "Ada Lovelace", githubUsername: "-ada" }],
]) {
  test(`refuses to run when ${label}`, () => {
    project(PLACEHOLDERS, config);

    const result = run();

    assert.equal(result.status, 1);
    assert.notEqual(result.stderr, "");
    assert.deepEqual(read(), PLACEHOLDERS);
    assert.deepEqual(readConfig(), config);
  });
}
