/**
 * Tools for CEO (and portal) to read/write the venture store.
 * Venture state lives in SQLite; LEDGER.md is generated from the store.
 */

import os from "node:os";
import path from "node:path";

import { Type } from "@sinclair/typebox";

import type { OpenClawConfig } from "../../config/config.js";
import { loadConfig } from "../../config/config.js";
import { resolveStateDir } from "../../config/paths.js";
import { resolveUserPath } from "../../utils.js";
import { syncStateToLedger } from "../../agentforge/ledger-sync.js";
import {
  openVentureStateStore,
  resolveVentureDbPath,
  type VentureInvestment,
} from "../../agentforge/venture-state.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agent-scope.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

function resolveWorkspaceDir(config: OpenClawConfig | undefined): string {
  const cfg = config ?? loadConfig();
  return resolveUserPath(
    resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg)) ??
      path.join(os.homedir(), ".openclaw", "workspace"),
  );
}

function getStore(config: OpenClawConfig | undefined) {
  const workspaceDir = resolveWorkspaceDir(config);
  const dbPath = resolveVentureDbPath({ workspaceDir });
  return openVentureStateStore({ dbPath });
}

async function regenerateLedgerFromStore(config: OpenClawConfig | undefined): Promise<void> {
  const workspaceDir = resolveWorkspaceDir(config);
  const ledgerPath = path.join(resolveStateDir(), "agents", "ceo", "LEDGER.md");
  await syncStateToLedger(ledgerPath, workspaceDir).catch(() => {
    // Best-effort; avoid throwing from tool
  });
}

function investmentToJson(inv: VentureInvestment): Record<string, unknown> {
  return {
    id: inv.id,
    ventureName: inv.ventureName,
    category: inv.category,
    boardDecisionDate: inv.boardDecisionDate,
    budgetUsd: inv.budgetUsd,
    spentUsd: inv.spentUsd,
    revenueUsd: inv.revenueUsd,
    status: inv.status,
    killThreshold: inv.killThreshold,
    daysRemaining: inv.daysRemaining,
    createdAt: inv.createdAt,
    completedAt: inv.completedAt,
  };
}

const VenturesListSchema = Type.Object({
  status: Type.Optional(
    Type.Union([Type.Literal("active"), Type.Literal("completed"), Type.Literal("killed")]),
  ),
});

export function createVenturesListTool(opts?: { config?: OpenClawConfig }): AnyAgentTool {
  return {
    label: "List ventures",
    name: "ventures_list",
    description:
      "List ventures (investments) from the venture store. Optional status filter: active, completed, or killed. Prefer this over reading LEDGER.md for current state.",
    parameters: VenturesListSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const statusRaw = readStringParam(params, "status");
      const status =
        statusRaw === "active" || statusRaw === "completed" || statusRaw === "killed"
          ? statusRaw
          : undefined;
      const store = getStore(opts?.config);
      const list = store.listInvestments(status);
      return jsonResult({
        ventures: list.map(investmentToJson),
        count: list.length,
      });
    },
  };
}

const VentureGetSchema = Type.Object({
  ventureId: Type.String({ description: "Venture/investment ID (e.g. INV-001)" }),
});

export function createVentureGetTool(opts?: { config?: OpenClawConfig }): AnyAgentTool {
  return {
    label: "Get venture",
    name: "venture_get",
    description: "Get one venture (investment) by ID from the venture store.",
    parameters: VentureGetSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const ventureId = readStringParam(params, "ventureId", { required: true });
      if (!ventureId) {
        return jsonResult({ status: "error", error: "ventureId required" });
      }
      const store = getStore(opts?.config);
      const inv = store.getInvestment(ventureId);
      if (!inv) {
        return jsonResult({ status: "error", error: `Venture ${ventureId} not found` });
      }
      return jsonResult({ venture: investmentToJson(inv) });
    },
  };
}

const VentureUpdateSchema = Type.Object({
  ventureId: Type.String({ description: "Venture/investment ID" }),
  ventureName: Type.Optional(Type.String()),
  category: Type.Optional(Type.String()),
  budgetUsd: Type.Optional(Type.Number()),
  spentUsd: Type.Optional(Type.Number()),
  revenueUsd: Type.Optional(Type.Number()),
  status: Type.Optional(
    Type.Union([Type.Literal("active"), Type.Literal("completed"), Type.Literal("killed")]),
  ),
  killThreshold: Type.Optional(Type.String()),
  daysRemaining: Type.Optional(Type.Number()),
});

export function createVentureUpdateTool(opts?: { config?: OpenClawConfig }): AnyAgentTool {
  return {
    label: "Update venture",
    name: "venture_update",
    description:
      "Update a venture (investment) in the venture store. Only provided fields are updated. After update, LEDGER.md is regenerated from the store.",
    parameters: VentureUpdateSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const ventureId = readStringParam(params, "ventureId", { required: true });
      if (!ventureId) {
        return jsonResult({ status: "error", error: "ventureId required" });
      }
      const store = getStore(opts?.config);
      const existing = store.getInvestment(ventureId);
      if (!existing) {
        return jsonResult({ status: "error", error: `Venture ${ventureId} not found` });
      }
      const updates: Partial<VentureInvestment> = {};
      const ventureName = readStringParam(params, "ventureName");
      if (ventureName !== undefined) updates.ventureName = ventureName;
      const category = readStringParam(params, "category");
      if (category !== undefined) updates.category = category;
      const budgetUsd = readNumberParam(params, "budgetUsd");
      if (budgetUsd !== undefined && Number.isFinite(budgetUsd)) updates.budgetUsd = budgetUsd;
      const spentUsd = readNumberParam(params, "spentUsd");
      if (spentUsd !== undefined && Number.isFinite(spentUsd)) updates.spentUsd = spentUsd;
      const revenueUsd = readNumberParam(params, "revenueUsd");
      if (revenueUsd !== undefined && Number.isFinite(revenueUsd)) updates.revenueUsd = revenueUsd;
      const status = readStringParam(params, "status");
      if (status === "active" || status === "completed" || status === "killed") {
        updates.status = status;
        if (status !== "active") {
          updates.completedAt = Date.now();
        }
      }
      const killThreshold = readStringParam(params, "killThreshold");
      if (killThreshold !== undefined) updates.killThreshold = killThreshold;
      const daysRemaining = readNumberParam(params, "daysRemaining", { integer: true });
      if (daysRemaining !== undefined && Number.isFinite(daysRemaining)) {
        updates.daysRemaining = daysRemaining;
      }
      if (Object.keys(updates).length === 0) {
        return jsonResult({
          status: "ok",
          message: "No updates provided",
          venture: investmentToJson(existing),
        });
      }
      store.updateInvestment(ventureId, updates);
      await regenerateLedgerFromStore(opts?.config);
      const updated = store.getInvestment(ventureId);
      return jsonResult({
        status: "ok",
        message: "Venture updated; LEDGER.md regenerated",
        venture: updated ? investmentToJson(updated) : undefined,
      });
    },
  };
}

const VentureCreateSchema = Type.Object({
  ventureId: Type.String({ description: "Venture/investment ID (e.g. INV-001)" }),
  ventureName: Type.String(),
  category: Type.String(),
  budgetUsd: Type.Number(),
  killThreshold: Type.String(),
  daysRemaining: Type.Number(),
});

export function createVentureCreateTool(opts?: { config?: OpenClawConfig }): AnyAgentTool {
  return {
    label: "Create venture",
    name: "venture_create",
    description:
      "Create a new venture (investment) in the venture store. Use after board decision. LEDGER.md is regenerated after create.",
    parameters: VentureCreateSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const ventureId = readStringParam(params, "ventureId", { required: true });
      const ventureName = readStringParam(params, "ventureName", { required: true });
      const category = readStringParam(params, "category", { required: true });
      const budgetUsdRaw = readNumberParam(params, "budgetUsd", { required: true });
      const killThreshold = readStringParam(params, "killThreshold", { required: true });
      const daysRemainingRaw = readNumberParam(params, "daysRemaining", {
        required: true,
        integer: true,
      });
      if (
        !ventureId ||
        !ventureName ||
        !category ||
        budgetUsdRaw === undefined ||
        !Number.isFinite(budgetUsdRaw) ||
        !killThreshold ||
        daysRemainingRaw === undefined ||
        !Number.isFinite(daysRemainingRaw)
      ) {
        return jsonResult({
          status: "error",
          error:
            "ventureId, ventureName, category, budgetUsd, killThreshold, daysRemaining required",
        });
      }
      const store = getStore(opts?.config);
      if (store.getInvestment(ventureId)) {
        return jsonResult({ status: "error", error: `Venture ${ventureId} already exists` });
      }
      store.createInvestment({
        id: ventureId,
        ventureName,
        category,
        boardDecisionDate: Date.now(),
        budgetUsd: budgetUsdRaw,
        spentUsd: 0,
        revenueUsd: 0,
        status: "active",
        killThreshold,
        daysRemaining: Math.max(0, Math.trunc(daysRemainingRaw)),
        completedAt: null,
      });
      await regenerateLedgerFromStore(opts?.config);
      const created = store.getInvestment(ventureId);
      return jsonResult({
        status: "ok",
        message: "Venture created; LEDGER.md regenerated",
        venture: created ? investmentToJson(created) : undefined,
      });
    },
  };
}

const VentureMarkKilledSchema = Type.Object({
  ventureId: Type.String({ description: "Venture/investment ID to mark killed" }),
  reason: Type.Optional(Type.String()),
});

export function createVentureMarkKilledTool(opts?: { config?: OpenClawConfig }): AnyAgentTool {
  return {
    label: "Mark venture killed",
    name: "venture_mark_killed",
    description:
      "Mark a venture (investment) as killed in the venture store. Use when kill threshold is met or decision is to stop. LEDGER.md is regenerated.",
    parameters: VentureMarkKilledSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const ventureId = readStringParam(params, "ventureId", { required: true });
      if (!ventureId) {
        return jsonResult({ status: "error", error: "ventureId required" });
      }
      const store = getStore(opts?.config);
      const existing = store.getInvestment(ventureId);
      if (!existing) {
        return jsonResult({ status: "error", error: `Venture ${ventureId} not found` });
      }
      if (existing.status === "killed") {
        return jsonResult({
          status: "ok",
          message: "Already killed",
          venture: investmentToJson(existing),
        });
      }
      store.updateInvestment(ventureId, {
        status: "killed",
        completedAt: Date.now(),
      });
      await regenerateLedgerFromStore(opts?.config);
      const updated = store.getInvestment(ventureId);
      return jsonResult({
        status: "ok",
        message: "Venture marked killed; LEDGER.md regenerated",
        venture: updated ? investmentToJson(updated) : undefined,
      });
    },
  };
}
