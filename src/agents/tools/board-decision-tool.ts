/**
 * Tool for the coordinator to submit the synthesized board decision to a store.
 * CEO implement and parse-coordinator-decision read from this store so the loop
 * does not depend on scraping the coordinator's transcript.
 */

import path from "node:path";

import { Type } from "@sinclair/typebox";

import { resolveStateDir } from "../../config/paths.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const BOARD_DECISION_FILENAME = "board-decision.json";
const BOARD_DECISION_LAST_GOOD_FILENAME = "board-decision-last-good.json";

const SubmitBoardDecisionSchema = Type.Object({
  decision: Type.Object({}, { additionalProperties: true }),
});

const REQUIRED_KEYS = [
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

function validateDecision(obj: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_KEYS.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new Error(`Missing required keys: ${missing.join(", ")}`);
  }
  if (obj.version !== 1) {
    throw new Error(`Invalid version (expected 1, got ${String(obj.version)})`);
  }
  if (typeof obj.ventureName !== "string" || !String(obj.ventureName).trim()) {
    throw new Error("ventureName must be a non-empty string");
  }
  if (typeof obj.oneLiner !== "string" || !String(obj.oneLiner).trim()) {
    throw new Error("oneLiner must be a non-empty string");
  }
  if (!Array.isArray(obj.requiredSystems)) {
    throw new Error("requiredSystems must be an array");
  }
  if (typeof obj.budgetUsd !== "number" || obj.budgetUsd < 0) {
    throw new Error("budgetUsd must be a non-negative number");
  }
  if (!Number.isInteger(obj.timelineDays) || (obj.timelineDays as number) < 0) {
    throw new Error("timelineDays must be an integer >= 0");
  }
  if (!Array.isArray(obj.successMetrics)) {
    throw new Error("successMetrics must be an array");
  }
  if (!Array.isArray(obj.killSwitches)) {
    throw new Error("killSwitches must be an array");
  }
  if (!Array.isArray(obj.provisioningNeeds)) {
    throw new Error("provisioningNeeds must be an array");
  }
  if (!Array.isArray(obj.executionPlan)) {
    throw new Error("executionPlan must be an array");
  }
  return obj;
}

export function createBoardDecisionTool(): AnyAgentTool {
  return {
    name: "submit_board_decision",
    label: "Submit Board Decision",
    description:
      "Submit the synthesized board decision (DECISION_JSON5) to the decision store. Call this after you have written the DECISION_JSON5 block in your reply so the CEO and ceo-implement script can read it from the store. Pass the same object you would put in the DECISION_JSON5 block (version, ventureName, businessType, oneLiner, requiredSystems, budgetUsd, timelineDays, successMetrics, killSwitches, provisioningNeeds, executionPlan).",
    parameters: SubmitBoardDecisionSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const raw = params.decision;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return jsonResult({ ok: false, error: "decision must be an object" });
      }
      const decision = raw as Record<string, unknown>;
      try {
        const validated = validateDecision(decision);
        const stateDir = resolveStateDir();
        const storePath = path.join(stateDir, BOARD_DECISION_FILENAME);
        const lastGoodPath = path.join(stateDir, BOARD_DECISION_LAST_GOOD_FILENAME);
        const output = `${JSON.stringify(validated, null, 2)}\n`;
        const fs = await import("node:fs/promises");
        await fs.writeFile(storePath, output, "utf8");
        await fs.writeFile(lastGoodPath, output, "utf8");
        return jsonResult({
          ok: true,
          message: "Board decision written to store and last-good copy.",
          storePath,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ ok: false, error: message });
      }
    },
  };
}
