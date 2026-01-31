#!/usr/bin/env node
/**
 * Output current venture state (LEDGER.md + optional CEO last message) for board meeting.
 * Used by board-meeting.sh to inject CURRENT STATE into analyst and coordinator prompts.
 * Respects MOLTBOT_STATE_DIR / CLAWDBOT_STATE_DIR. Node + fs only; stdout only.
 *
 * Usage: node board-get-current-state.mjs
 * Output: "## Current ventures and capital\n\n" + LEDGER (truncated ~2500 chars) +
 *         optional "Latest CEO status: …" (first 500 chars). If no LEDGER: "No current ventures on file."
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LEDGER_TRUNCATE = 2500;
const CEO_STATUS_TRUNCATE = 500;

// Must match gateway/resolveStateDir (paths.ts) so we read sessions from the same place
function resolveStateDir() {
  const env = process.env;
  const override =
    (env.OPENCLAW_STATE_DIR && env.OPENCLAW_STATE_DIR.trim()) ||
    (env.CLAWDBOT_STATE_DIR && env.CLAWDBOT_STATE_DIR.trim()) ||
    (env.MOLTBOT_STATE_DIR && env.MOLTBOT_STATE_DIR.trim());
  if (override) {
    const trimmed = override.trim();
    if (trimmed.startsWith("~")) {
      return path.resolve(path.join(os.homedir(), trimmed.slice(1)));
    }
    return path.resolve(trimmed);
  }
  const homedir = os.homedir();
  const newDir = path.join(homedir, ".openclaw");
  const legacyDirs = [
    path.join(homedir, ".clawdbot"),
    path.join(homedir, ".moltbot"),
    path.join(homedir, ".moldbot"),
  ];
  if (fs.existsSync(newDir)) return newDir;
  const existing = legacyDirs.find((dir) => {
    try {
      return fs.existsSync(dir);
    } catch {
      return false;
    }
  });
  if (existing) return existing;
  return newDir;
}

function extractTextFromContent(content) {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part && typeof part === "object" && part.type === "text" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function getLastAssistantMessage(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) return "";
  const raw = fs.readFileSync(transcriptPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  let lastText = "";
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj && obj.type === "message" && obj.message && obj.message.role === "assistant") {
        const text = extractTextFromContent(obj.message.content);
        if (text) lastText = text;
      }
    } catch {
      // skip invalid lines
    }
  }
  return lastText;
}

function getCeoStatus(stateDir) {
  const sessionsDir = path.join(stateDir, "agents", "ceo", "sessions");
  const storePath = path.join(sessionsDir, "sessions.json");
  if (!fs.existsSync(storePath)) return "";
  let store;
  try {
    store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
  } catch {
    return "";
  }
  const entry = store["agent:ceo:main"] || store["main"];
  if (!entry || !entry.sessionId) return "";
  const sessionFile = entry.sessionFile && entry.sessionFile.trim();
  const transcriptPath = sessionFile
    ? (path.isAbsolute(sessionFile) ? sessionFile : path.join(sessionsDir, path.basename(sessionFile)))
    : path.join(sessionsDir, `${entry.sessionId}.jsonl`);
  return getLastAssistantMessage(transcriptPath);
}

function main() {
  const stateDir = resolveStateDir();
  let ledgerPath = path.join(stateDir, "agents", "ceo", "LEDGER.md");
  // AgentForge init puts workspaces in ~/.moltbot; gateway may use ~/.clawdbot for sessions
  if (!fs.existsSync(ledgerPath)) {
    const moltbotLedger = path.join(os.homedir(), ".moltbot", "agents", "ceo", "LEDGER.md");
    if (fs.existsSync(moltbotLedger)) ledgerPath = moltbotLedger;
  }

  let out = "";
  if (fs.existsSync(ledgerPath)) {
    const raw = fs.readFileSync(ledgerPath, "utf-8");
    const trimmed = raw.trim();
    if (trimmed) {
      const section = "## Current ventures and capital\n\n";
      if (trimmed.length <= LEDGER_TRUNCATE) {
        out = section + trimmed;
      } else {
        out = section + trimmed.slice(0, LEDGER_TRUNCATE) + "\n\n[... truncated for length ...]";
      }
    }
  }
  if (!out) {
    out = "No current ventures on file.";
  }

  const ceoStatus = getCeoStatus(stateDir);
  if (ceoStatus) {
    const snippet =
      ceoStatus.length <= CEO_STATUS_TRUNCATE
        ? ceoStatus
        : ceoStatus.slice(0, CEO_STATUS_TRUNCATE) + "...";
    out += "\n\nLatest CEO status: " + snippet.replace(/\n/g, " ").trim();
  }

  process.stdout.write(out);
}

main();
