#!/usr/bin/env node
// Gate for docs/pflichtschritte.md — blocks workflow steps while mandatory (PFLICHT) items are open.
//
// Usage (Claude Code hooks, JSON on stdin):
//   node scripts/pflichtschritte.mjs prompt   → UserPromptSubmit: /build, /deploy, PROJ-17
//   node scripts/pflichtschritte.mjs bash     → PreToolUse(Bash): merge/push to main, vercel --prod
// Manual:
//   node scripts/pflichtschritte.mjs status [build|test|live|dritte]
//
// Exit 2 + stderr blocks the step (Claude Code hook contract); exit 0 + stdout adds a reminder.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.CLAUDE_PROJECT_DIR || join(dirname(fileURLToPath(import.meta.url)), "..");
const LIST = join(ROOT, "docs", "pflichtschritte.md");
const ORDER = ["build", "test", "live", "dritte"];
const LABEL = {
  build: "Stufe 1 – vor /build",
  test: "Stufe 2 – vor der Testumgebung (erstes /deploy)",
  live: "Stufe 3 – vor dem Go-live (Merge nach main)",
  dritte: "Stufe 4 – bevor andere Vermieter WohnWerk nutzen",
};

export function parse(text) {
  const items = [];
  let gate = null;
  for (const line of text.split(/\r?\n/)) {
    const g = line.match(/<!--\s*gate:(\w+)\s*-->/);
    if (line.startsWith("## ")) gate = g ? g[1] : null;
    const m = line.match(/^- \[( |x|X)\] (.*)$/);
    if (gate && m) {
      items.push({ gate, done: m[1] !== " ", pflicht: m[2].includes("**PFLICHT**"), text: m[2] });
    }
  }
  return items;
}

function short(text) {
  return text.replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").slice(0, 220);
}

export function evaluate(items, gate) {
  const upTo = ORDER.slice(0, ORDER.indexOf(gate) + 1);
  const blocking = items.filter((i) => upTo.includes(i.gate) && i.pflicht && !i.done);
  const hints = items.filter((i) => i.gate === gate && !i.pflicht && !i.done);
  return { blocking, hints };
}

function report(gate, { blocking, hints }) {
  if (blocking.length) {
    const lines = blocking.map((i) => `  • [${LABEL[i.gate]}] ${short(i.text)}`);
    process.stderr.write(
      `⛔ Pflichtschritte offen – „${LABEL[gate]}“ ist noch nicht freigegeben.\n` +
        `${lines.join("\n")}\n` +
        `Erledigen, dann in docs/pflichtschritte.md abhaken ([x] + Datum) und erneut versuchen.\n`,
    );
    process.exit(2);
  }
  if (hints.length) {
    const lines = hints.map((i) => `  • ${short(i.text)}`);
    process.stdout.write(
      `Erinnerung (Pflichtschritte, ${LABEL[gate]}) – nicht blockierend, bitte dem Nutzer nennen:\n${lines.join("\n")}\n`,
    );
  }
  process.exit(0);
}

export function gateForPrompt(prompt) {
  const p = prompt.trim();
  if (/PROJ-17\b/i.test(p) && /^\/(build|deploy)\b/.test(p)) return "dritte";
  if (/^\/deploy\b/.test(p)) return "test";
  if (/^\/build\b/.test(p)) return "build";
  return null;
}

function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

// Only the first line of each command segment counts, so text inside heredocs or
// commit messages (e.g. "push to main") never triggers the gate.
export function segments(cmd) {
  const firstLines = cmd.split(/<<-?\s*['"]?\w+['"]?/)[0];
  return firstLines
    .split(/\n|&&|\|\||;|\|/)
    .map((s) => s.trim().replace(/^(npx|sudo|env\s+\S+=\S+)\s+/, ""))
    .filter(Boolean);
}

export function gateForCommand(cmd, branch) {
  for (const s of segments(cmd)) {
    if (/^vercel\b.*(\s--prod\b|\spromote\b)/.test(s)) return "live";
    if (/^git\s+push\b.*(\s|:)main(\s|$)/.test(s)) return "live";
    if (/^git\s+merge\b/.test(s) && branch === "main") return "live";
    if (/^git\s+push\b/.test(s) && branch === "main") return "live";
  }
  return null;
}

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function load() {
  try {
    return parse(readFileSync(LIST, "utf8"));
  } catch {
    process.stderr.write(`⛔ ${LIST} fehlt oder ist nicht lesbar – Pflichtschritte können nicht geprüft werden.\n`);
    process.exit(2);
  }
}

const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  const mode = process.argv[2];
  if (mode === "prompt") {
    const gate = gateForPrompt(readStdin().prompt || "");
    if (!gate) process.exit(0);
    report(gate, evaluate(load(), gate));
  } else if (mode === "bash") {
    const gate = gateForCommand(readStdin().tool_input?.command || "", currentBranch());
    if (!gate) process.exit(0);
    report(gate, evaluate(load(), gate));
  } else if (mode === "status") {
    const items = load();
    for (const g of ORDER) {
      const open = items.filter((i) => i.gate === g && !i.done);
      console.log(`${LABEL[g]}: ${open.filter((i) => i.pflicht).length} Pflicht offen, ${open.filter((i) => !i.pflicht).length} empfohlen offen`);
    }
  } else {
    console.error("Usage: node scripts/pflichtschritte.mjs prompt|bash|status");
    process.exit(1);
  }
}
