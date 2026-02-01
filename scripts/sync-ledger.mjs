#!/usr/bin/env node
/**
 * Sync LEDGER.md <-> SQLite bidirectionally
 *
 * Usage:
 *   node scripts/sync-ledger.mjs
 *   node scripts/sync-ledger.mjs --to-sqlite
 *   node scripts/sync-ledger.mjs --to-markdown
 *   node scripts/sync-ledger.mjs --to-sqlite --ledger /path/to/LEDGER.md
 */

import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

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

/** Resolve LEDGER path: --ledger, then config agents.ceo.workspace/LEDGER.md, then ~/.moltbot/agents/ceo/LEDGER.md */
async function resolveLedgerPath(ledgerArg) {
  if (ledgerArg) return path.resolve(ledgerArg);
  try {
    const { loadConfig } = await import(path.join(REPO_ROOT, "dist", "config", "config.js"));
    const cfg = loadConfig();
    const ceo = cfg?.agents?.list?.find((a) => String(a?.id).toLowerCase() === "ceo");
    const workspace = ceo?.workspace;
    if (workspace) return path.join(path.resolve(workspace), "LEDGER.md");
  } catch (_) {
    // ignore
  }
  return path.join(os.homedir(), ".moltbot", "agents", "ceo", "LEDGER.md");
}

// Import via dynamic import since we're in ESM
const { bidirectionalSync, syncLedgerToState, syncStateToLedger } = await import(
  path.join(REPO_ROOT, "dist", "agentforge", "ledger-sync.js")
);

async function main() {
  const { mode, ledgerPath, workspaceDir } = parseArgs(process.argv.slice(2));
  const ledger = await resolveLedgerPath(ledgerPath ?? undefined);
  const workspace = workspaceDir ?? undefined;

  try {
    if (mode === "to-sqlite") {
      await syncLedgerToState(ledger, workspace);
      console.log("[sync-ledger] Synced LEDGER.md -> SQLite");
    } else if (mode === "to-markdown") {
      await syncStateToLedger(ledger, workspace);
      console.log("[sync-ledger] Synced SQLite -> LEDGER.md");
    } else {
      await bidirectionalSync(ledger, workspace);
      console.log("[sync-ledger] Bidirectional sync complete");
    }
  } catch (err) {
    console.error("[sync-ledger] ERROR:", err.message);
    process.exit(1);
  }
}

main();
