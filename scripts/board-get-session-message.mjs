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

// Must match gateway/resolveStateDir (paths.ts): same dir so we read sessions the gateway wrote
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

function getLastAssistantMessage(transcriptPath, mustContain = null) {
  if (!fs.existsSync(transcriptPath)) return "";
  const raw = fs.readFileSync(transcriptPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  let lastText = "";
  let lastWithMatch = "";
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj && obj.type === "message" && obj.message && obj.message.role === "assistant") {
        const text = extractTextFromContent(obj.message.content);
        if (text) {
          lastText = text;
          if (mustContain && text.includes(mustContain)) lastWithMatch = text;
        }
      }
    } catch {
      // skip invalid lines
    }
  }
  // When mustContain is set (e.g. coordinator), prefer the last message that contains it
  if (mustContain && lastWithMatch) return lastWithMatch;
  return lastText;
}

function parseArgs(argv) {
  let agentId = "";
  let mustContain = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--agent" && argv[i + 1]) {
      agentId = argv[i + 1];
    }
    if (argv[i] === "--must-contain" && argv[i + 1]) {
      mustContain = argv[i + 1];
    }
  }
  return { agentId, mustContain };
}

function main() {
  const { agentId, mustContain } = parseArgs(process.argv);
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

  // For coordinator, use the last assistant message that contains DECISION_JSON5 (so we get the full synthesis even if the coordinator sent a follow-up after)
  const contentFilter =
    mustContain !== null ? mustContain : normalizedAgent === "coordinator" ? "DECISION_JSON5:" : null;
  const text = getLastAssistantMessage(transcriptPath, contentFilter);
  if (text) process.stdout.write(text);
}

main();
