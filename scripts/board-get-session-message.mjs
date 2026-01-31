#!/usr/bin/env node
/**
 * Print the last assistant message from an agent's main session transcript.
 * Used by board-meeting.sh to inject analyst (and optionally other) output
 * into the next board member prompts. Respects MOLTBOT_STATE_DIR / CLAWDBOT_STATE_DIR.
 *
 * Usage: node board-get-session-message.mjs --agent <agentId>
 * Example: node board-get-session-message.mjs --agent analyst
 *
 * Output: Last assistant message text to stdout (nothing if missing/empty).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function resolveStateDir() {
  const env = process.env;
  const override =
    (env.MOLTBOT_STATE_DIR && env.MOLTBOT_STATE_DIR.trim()) ||
    (env.CLAWDBOT_STATE_DIR && env.CLAWDBOT_STATE_DIR.trim());
  if (override) {
    const trimmed = override.trim();
    if (trimmed.startsWith("~")) {
      return path.resolve(path.join(os.homedir(), trimmed.slice(1)));
    }
    return path.resolve(trimmed);
  }
  // AgentForge init uses ~/.moltbot for agent workspaces and LEDGER; default there when present
  const moltbotDir = path.join(os.homedir(), ".moltbot");
  const ledgerInMoltbot = path.join(moltbotDir, "agents", "ceo", "LEDGER.md");
  if (fs.existsSync(ledgerInMoltbot)) {
    return moltbotDir;
  }
  return path.join(os.homedir(), ".clawdbot");
}

function normalizeAgentId(id) {
  if (!id || typeof id !== "string") return "main";
  return id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64) || "main";
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

function main() {
  let agentId = "";
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "--agent" && process.argv[i + 1]) {
      agentId = process.argv[i + 1];
      break;
    }
  }
  if (!agentId) {
    process.stderr.write("board-get-session-message.mjs: --agent <id> required\n");
    process.exit(1);
  }

  const stateDir = resolveStateDir();
  const normalizedAgent = normalizeAgentId(agentId);
  const sessionKey = `agent:${normalizedAgent}:main`;
  const sessionsDir = path.join(stateDir, "agents", normalizedAgent, "sessions");
  const storePath = path.join(sessionsDir, "sessions.json");

  if (!fs.existsSync(storePath)) {
    process.exit(0);
  }

  let store;
  try {
    store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
  } catch {
    process.exit(0);
  }

  const entry = store[sessionKey] || store["main"];
  if (!entry || !entry.sessionId) {
    process.exit(0);
  }

  const sessionFile = entry.sessionFile && entry.sessionFile.trim();
  const transcriptPath = sessionFile
    ? (path.isAbsolute(sessionFile) ? sessionFile : path.join(sessionsDir, path.basename(sessionFile)))
    : path.join(sessionsDir, `${entry.sessionId}.jsonl`);

  const text = getLastAssistantMessage(transcriptPath);
  if (text) process.stdout.write(text);
}

main();
