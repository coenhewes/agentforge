#!/usr/bin/env node
/**
 * Parse worker session messages for status keywords (COMPLETE, BLOCKED, PROGRESS)
 * 
 * Usage:
 *   node scripts/parse-worker-status.mjs --worker developer-001
 *   node scripts/parse-worker-status.mjs --worker marketer-001 --limit 10
 * 
 * Output: JSON with worker status
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { worker: null, limit: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--worker" && argv[i + 1]) out.worker = argv[i + 1];
    if (a === "--limit" && argv[i + 1]) out.limit = Number.parseInt(argv[i + 1], 10);
  }
  return out;
}

function getWorkerMessages(workerId, limit) {
  try {
    const sessionKey = `agent:${workerId}:main`;
    const cmd = `node moltbot.mjs sessions history --key "${sessionKey}" --limit ${limit}`;
    const output = execSync(cmd, { 
      cwd: REPO_ROOT, 
      encoding: "utf-8",
      maxBuffer: 2 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return output || "";
  } catch (err) {
    return "";
  }
}

function parseStatus(messages) {
  const result = {
    workerId: null,
    status: "unknown", // unknown | working | completed | blocked | failed
    lastMessage: null,
    timestamp: null,
    blockerRequestId: null,
    progress: null
  };

  // Look for status keywords in messages
  const lines = messages.split('\n');
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    
    // COMPLETE pattern
    if (line.match(/COMPLETE\s+\[([^\]]+)\]:\s*(.+)/i)) {
      const match = line.match(/COMPLETE\s+\[([^\]]+)\]:\s*(.+)/i);
      result.workerId = match[1];
      result.status = "completed";
      result.lastMessage = match[2].trim();
      result.timestamp = new Date().toISOString();
      return result;
    }
    
    // BLOCKED pattern
    if (line.match(/BLOCKED\s+\[([^\]]+)\]:\s*(.+)/i)) {
      const match = line.match(/BLOCKED\s+\[([^\]]+)\]:\s*(.+)/i);
      result.workerId = match[1];
      result.status = "blocked";
      result.lastMessage = match[2].trim();
      result.timestamp = new Date().toISOString();
      
      // Extract request ID if present
      const reqMatch = match[2].match(/REQ-([A-Z0-9]+)/);
      if (reqMatch) {
        result.blockerRequestId = `REQ-${reqMatch[1]}`;
      }
      return result;
    }
    
    // PROGRESS pattern
    if (line.match(/PROGRESS\s+\[([^\]]+)\]:\s*(.+)/i)) {
      const match = line.match(/PROGRESS\s+\[([^\]]+)\]:\s*(.+)/i);
      result.workerId = match[1];
      result.status = "working";
      result.progress = match[2].trim();
      result.lastMessage = match[2].trim();
      result.timestamp = new Date().toISOString();
      return result;
    }
    
    // FAILED pattern (if worker explicitly reports failure)
    if (line.match(/FAILED\s+\[([^\]]+)\]:\s*(.+)/i)) {
      const match = line.match(/FAILED\s+\[([^\]]+)\]:\s*(.+)/i);
      result.workerId = match[1];
      result.status = "failed";
      result.lastMessage = match[2].trim();
      result.timestamp = new Date().toISOString();
      return result;
    }
  }
  
  // If no status keyword found, assume working if there are recent messages
  if (messages.trim().length > 0) {
    result.status = "working";
    // Extract last assistant message as preview
    const lastAssistantMatch = messages.match(/Assistant:\s*([^\n]+)/);
    if (lastAssistantMatch) {
      result.lastMessage = lastAssistantMatch[1].slice(0, 200);
    }
  }
  
  return result;
}

async function main() {
  const { worker, limit } = parseArgs(process.argv.slice(2));
  
  if (!worker) {
    process.stderr.write("Error: --worker required\n");
    process.stderr.write("Usage: node scripts/parse-worker-status.mjs --worker <worker-id>\n");
    process.exit(1);
  }
  
  const messages = getWorkerMessages(worker, limit);
  const status = parseStatus(messages);
  
  // Set workerId if not parsed from message
  if (!status.workerId) {
    status.workerId = worker;
  }
  
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
}

main();
