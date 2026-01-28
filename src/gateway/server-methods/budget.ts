import { loadConfig, writeConfigFile } from "../../config/config.js";
import type { MoltbotConfig } from "../../config/config.js";
import { listAgentIds } from "../../agents/agent-scope.js";
import { getBudgetStatus, type BudgetStatus } from "../../infra/budget-enforcement.js";
import type { BudgetConfig } from "../../config/types.budget.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

type BudgetStatusResponse = {
  agents: BudgetStatus[];
};

const parseAgentId = (raw: unknown): string | undefined => {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return undefined;
};

const parseNumber = (raw: unknown): number | undefined => {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
};

const parseAction = (raw: unknown): "warn" | "block" | undefined => {
  if (raw === "warn" || raw === "block") return raw;
  return undefined;
};

const parseScope = (raw: unknown): "agent" | "defaults" | undefined => {
  if (raw === "agent" || raw === "defaults") return raw;
  return undefined;
};

export const budgetHandlers: GatewayRequestHandlers = {
  /**
   * Get budget status for all agents or a specific agent.
   * Returns spending info, limits, and alert status.
   */
  "budget.status": async ({ respond, params }) => {
    const config = loadConfig();
    const targetAgentId = parseAgentId(params?.agentId);

    const agentIds = targetAgentId ? [targetAgentId] : listAgentIds(config);
    const statuses: BudgetStatus[] = [];

    for (const agentId of agentIds) {
      const status = await getBudgetStatus({ agentId, config });
      statuses.push(status);
    }

    const response: BudgetStatusResponse = { agents: statuses };
    respond(true, response, undefined);
  },

  /**
   * Set budget limits for an agent or defaults.
   * Pass scope="defaults" to update global defaults.
   * Pass agentId with scope="agent" (or omit scope) to update per-agent budget.
   */
  "budget.set": async ({ respond, params }) => {
    const agentId = parseAgentId(params?.agentId);
    const daily = parseNumber(params?.daily);
    const monthly = parseNumber(params?.monthly);
    const alertAt = parseNumber(params?.alertAt);
    const action = parseAction(params?.action);
    const scope = parseScope(params?.scope) ?? (agentId ? "agent" : "defaults");

    // Build the budget config update
    const budgetUpdate: Partial<BudgetConfig> = {};
    if (daily !== undefined) budgetUpdate.daily = daily;
    if (monthly !== undefined) budgetUpdate.monthly = monthly;
    if (alertAt !== undefined) budgetUpdate.alertAt = alertAt;
    if (action !== undefined) budgetUpdate.action = action;

    // Nothing to update
    if (Object.keys(budgetUpdate).length === 0) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "No budget parameters provided. Specify daily, monthly, alertAt, or action.",
        ),
      );
      return;
    }

    const cfg = loadConfig();

    if (scope === "defaults") {
      // Update global defaults
      const nextConfig: MoltbotConfig = {
        ...cfg,
        agents: {
          ...cfg.agents,
          defaults: {
            ...cfg.agents?.defaults,
            budget: {
              ...cfg.agents?.defaults?.budget,
              ...budgetUpdate,
            },
          },
        },
      };
      await writeConfigFile(nextConfig);
    } else {
      // Update per-agent budget
      if (!agentId) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "agentId is required when scope is 'agent'"),
        );
        return;
      }

      const agentList = cfg.agents?.list ?? [];
      const existingIndex = agentList.findIndex((a) => a.id === agentId);

      let nextList;
      if (existingIndex >= 0) {
        // Update existing agent
        nextList = [...agentList];
        nextList[existingIndex] = {
          ...agentList[existingIndex],
          budget: {
            ...agentList[existingIndex].budget,
            ...budgetUpdate,
          },
        };
      } else {
        // Add new agent entry
        nextList = [...agentList, { id: agentId, budget: budgetUpdate }];
      }

      const nextConfig: MoltbotConfig = {
        ...cfg,
        agents: {
          ...cfg.agents,
          list: nextList,
        },
      };
      await writeConfigFile(nextConfig);
    }

    // Return the updated status
    const config = loadConfig();
    const status = await getBudgetStatus({
      agentId: agentId ?? listAgentIds(config)[0],
      config,
    });
    respond(true, { status }, undefined);
  },
};
