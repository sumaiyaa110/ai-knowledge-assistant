// Put your name and GitHub username into every file that mentions them.
//
//   1. Edit "name" and "githubUsername" in author.config.json
//   2. npm run personalize
//
// It can be run again after changing the values: the script remembers what it
// wrote last time (under "_applied") and replaces that.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "author.config.json");

/** Every file that contains the author's name or GitHub username. */
const FILES = ["README.md", "LICENSE", "package.json", "docs/PROJECT-SHOWCASE.md"];

const config = JSON.parse(readFileSync(configPath, "utf8"));
const next = { name: String(config.name ?? "").trim(), githubUsername: String(config.githubUsername ?? "").trim() };
const previous = config._applied ?? { name: "YOUR_NAME", githubUsername: "YOUR_GITHUB_USERNAME" };

if (!next.name || !next.githubUsername || next.name === "YOUR_NAME" || next.githubUsername === "YOUR_GITHUB_USERNAME") {
  console.error('Edit "name" and "githubUsername" in author.config.json first, then run this again.');
  process.exit(1);
}
if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(next.githubUsername)) {
  console.error(`"${next.githubUsername}" does not look like a GitHub username (letters, digits and hyphens only).`);
  process.exit(1);
}

let total = 0;
for (const file of FILES) {
  const filePath = path.join(root, file);
  const before = readFileSync(filePath, "utf8");
  // Username first: a name can never contain it by accident the other way round.
  const after = before
    .split(previous.githubUsername).join(next.githubUsername)
    .split(previous.name).join(next.name);
  const changes =
    before.split(previous.githubUsername).length - 1 + (before.split(previous.name).length - 1);
  if (after !== before) writeFileSync(filePath, after);
  console.log(`  ${String(changes).padStart(2)} replacement(s)  ${file}`);
  total += changes;
}

writeFileSync(configPath, `${JSON.stringify({ ...next, _applied: next }, null, 2)}\n`);
console.log(`\nDone: ${total} replacement(s). Review the changes with "git diff", then commit them.`);
