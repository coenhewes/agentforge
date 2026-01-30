#!/usr/bin/env node
/**
 * Parse and validate the Coordinator's DECISION_JSON5 block.
 *
 * Usage:
 *  node scripts/parse-coordinator-decision.mjs --agent coordinator
 *  node scripts/parse-coordinator-decision.mjs --agent coordinator --out /tmp/decision.json
 *
 * Output:
 *  - Writes the validated decision as JSON to stdout (or to --out).
 *  - Exits non-zero with a helpful error message if missing/invalid.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import JSON5 from "json5";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = { agent: "coordinator", outPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent" && argv[i + 1]) out.agent = argv[i + 1];
    if (a === "--out" && argv[i + 1]) out.outPath = argv[i + 1];
  }
  return out;
}

function extractDecisionJson5Block(text) {
  const markerIdx = text.indexOf("DECISION_JSON5:");
  if (markerIdx === -1) return null;
  const after = text.slice(markerIdx);
  const fenceMatch = after.match(/```(?:json5|json)\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();
  const braceIdx = after.indexOf("{");
  if (braceIdx === -1) return null;
  return after.slice(braceIdx).trim();
}

function validateDecision(obj) {
  const required = [
    "version",
    "ventureName",
    "businessType",
    "oneLiner",
    "requiredSystems",
    "budgetUsd",
    "timelineDays",
    "successMetrics",
    "killSwitches",
    "provisioningNeeds",
    "executionPlan",
  ];
  const missing = required.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new Error(`Missing required keys: ${missing.join(", ")}`);
  }
  if (obj.version !== 1) throw new Error(`Invalid version (expected 1, got ${String(obj.version)})`);
  if (typeof obj.ventureName !== "string" || !obj.ventureName.trim()) {
    throw new Error("ventureName must be a non-empty string");
  }
  if (typeof obj.oneLiner !== "string" || !obj.oneLiner.trim()) {
    throw new Error("oneLiner must be a non-empty string");
  }
  if (!Array.isArray(obj.requiredSystems)) throw new Error("requiredSystems must be an array");
  if (typeof obj.budgetUsd !== "number" || obj.budgetUsd < 0) {
    throw new Error("budgetUsd must be a non-negative number");
  }
  if (!Number.isInteger(obj.timelineDays) || obj.timelineDays < 0) {
    throw new Error("timelineDays must be an integer >= 0");
  }
  if (!Array.isArray(obj.successMetrics)) throw new Error("successMetrics must be an array");
  if (!Array.isArray(obj.killSwitches)) throw new Error("killSwitches must be an array");
  if (!Array.isArray(obj.provisioningNeeds)) throw new Error("provisioningNeeds must be an array");
  if (!Array.isArray(obj.executionPlan)) throw new Error("executionPlan must be an array");
  return obj;
}

async function main() {
  const { agent, outPath } = parseArgs(process.argv.slice(2));
  const getter = path.join(__dirname, "board-get-session-message.mjs");
  const { spawnSync } = await import("node:child_process");

  const res = spawnSync(process.execPath, [getter, "--agent", agent], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (res.status !== 0) {
    process.stderr.write(res.stderr || `Failed to read agent transcript for ${agent}\n`);
    process.exit(1);
  }

  const raw = String(res.stdout || "");
  if (!raw.trim()) {
    process.stderr.write(`No assistant message found for agent ${agent}\n`);
    process.exit(1);
  }

  const block = extractDecisionJson5Block(raw);
  if (!block) {
    process.stderr.write(
      'Missing DECISION_JSON5 block. Coordinator output must include a \"DECISION_JSON5:\" section with a ```json5 fenced block.\n',
    );
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON5.parse(block);
  } catch (err) {
    process.stderr.write(
      `Failed to parse DECISION_JSON5 as JSON5: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  let validated;
  try {
    validated = validateDecision(parsed);
  } catch (err) {
    process.stderr.write(
      `DECISION_JSON5 validation failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  const output = `${JSON.stringify(validated, null, 2)}\n`;
  if (outPath) {
    fs.writeFileSync(outPath, output, "utf8");
  } else {
    process.stdout.write(output);
  }
}

main();

