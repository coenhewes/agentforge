#!/usr/bin/env node
/**
 * Sync LEDGER.md <-> SQLite bidirectionally
 * 
 * Usage:
 *   node scripts/sync-ledger.mjs
 *   node scripts/sync-ledger.mjs --to-sqlite
 *   node scripts/sync-ledger.mjs --to-markdown
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// Import via dynamic import since we're in ESM
const { bidirectionalSync, syncLedgerToState, syncStateToLedger } = await import(
  path.join(REPO_ROOT, "dist", "agentforge", "ledger-sync.js")
);

function parseArgs(argv) {
  const out = { mode: "bidirectional", ledgerPath: null, workspaceDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--to-sqlite") out.mode = "to-sqlite";
    if (a === "--to-markdown") out.mode = "to-markdown";
    if (a === "--ledger" && argv[i + 1]) out.ledgerPath = argv[i + 1];
    if (a === "--workspace" && argv[i + 1]) out.workspaceDir = argv[i + 1];
  }
  return out;
}

async function main() {
  const { mode, ledgerPath, workspaceDir } = parseArgs(process.argv.slice(2));
  
  try {
    if (mode === "to-sqlite") {
      await syncLedgerToState(ledgerPath, workspaceDir);
      console.log("[sync-ledger] Synced LEDGER.md -> SQLite");
    } else if (mode === "to-markdown") {
      await syncStateToLedger(ledgerPath, workspaceDir);
      console.log("[sync-ledger] Synced SQLite -> LEDGER.md");
    } else {
      await bidirectionalSync(ledgerPath, workspaceDir);
      console.log("[sync-ledger] Bidirectional sync complete");
    }
  } catch (err) {
    console.error("[sync-ledger] ERROR:", err.message);
    process.exit(1);
  }
}

main();
