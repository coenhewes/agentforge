/**
 * Budget enforcement logic for agent spending limits.
 *
 * Checks daily/monthly spending against configured limits and returns
 * whether the agent is allowed to run.
 */

import type { MoltbotConfig } from "../config/config.js";
import type { BudgetConfig } from "../config/types.budget.js";
import { resolveAgentConfig } from "../agents/agent-scope.js";
import { loadCostUsageSummary, type CostUsageSummary } from "./session-cost-usage.js";

export type BudgetCheckResult = {
  /** Whether the agent is allowed to run. */
  allowed: boolean;
  /** Remaining budget in USD (for the most restrictive limit). */
  remaining: number;
  /** Reason for rejection (if not allowed). */
  reason?: string;
  /** Current daily spending in USD. */
  dailySpent: number;
  /** Current monthly spending in USD. */
  monthlySpent: number;
  /** Configured daily limit (0 = unlimited). */
  dailyLimit: number;
  /** Configured monthly limit (0 = unlimited). */
  monthlyLimit: number;
  /** Whether a budget alert should be triggered. */
  shouldAlert: boolean;
  /** Alert message if shouldAlert is true. */
  alertMessage?: string;
};

export type BudgetStatus = {
  agentId: string;
  daily: {
    spent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  monthly: {
    spent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  action: "warn" | "block";
  alertAt: number;
  isOverBudget: boolean;
  shouldAlert: boolean;
};

const DEFAULT_ALERT_AT = 0.8;
const DEFAULT_ACTION: "warn" | "block" = "warn";

/**
 * Resolves the effective budget configuration for an agent.
 * Per-agent config overrides defaults; fields merge individually.
 */
export function resolveBudgetConfig(
  config: MoltbotConfig,
  agentId: string,
): BudgetConfig | undefined {
  const defaults = config.agents?.defaults?.budget;
  const agentConfig = resolveAgentConfig(config, agentId)?.budget;

  // If neither exists, no budget is configured
  if (!defaults && !agentConfig) return undefined;

  // Merge per-agent over defaults
  return {
    daily: agentConfig?.daily ?? defaults?.daily,
    monthly: agentConfig?.monthly ?? defaults?.monthly,
    alertAt: agentConfig?.alertAt ?? defaults?.alertAt,
    action: agentConfig?.action ?? defaults?.action,
  };
}

/**
 * Calculates spending for today and the current month from cost summary data.
 */
function calculateSpending(summary: CostUsageSummary): {
  dailySpent: number;
  monthlySpent: number;
} {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const currentMonth = today.substring(0, 7); // YYYY-MM

  let dailySpent = 0;
  let monthlySpent = 0;

  for (const entry of summary.daily) {
    // Sum up current month spending
    if (entry.date.startsWith(currentMonth)) {
      monthlySpent += entry.totalCost;
    }
    // Today's spending
    if (entry.date === today) {
      dailySpent = entry.totalCost;
    }
  }

  return { dailySpent, monthlySpent };
}

/**
 * Checks whether an agent is within budget and allowed to run.
 */
export async function checkBudget(params: {
  agentId: string;
  config: MoltbotConfig;
  /** Optionally provide pre-loaded summary to avoid re-fetching. */
  costSummary?: CostUsageSummary;
}): Promise<BudgetCheckResult> {
  const { agentId, config } = params;
  const budget = resolveBudgetConfig(config, agentId);

  // No budget configured = unlimited
  if (!budget) {
    return {
      allowed: true,
      remaining: Infinity,
      dailySpent: 0,
      monthlySpent: 0,
      dailyLimit: 0,
      monthlyLimit: 0,
      shouldAlert: false,
    };
  }

  const dailyLimit = budget.daily ?? 0;
  const monthlyLimit = budget.monthly ?? 0;
  const alertAt = budget.alertAt ?? DEFAULT_ALERT_AT;
  const action = budget.action ?? DEFAULT_ACTION;

  // If both limits are 0/unlimited, allow
  if (dailyLimit === 0 && monthlyLimit === 0) {
    return {
      allowed: true,
      remaining: Infinity,
      dailySpent: 0,
      monthlySpent: 0,
      dailyLimit: 0,
      monthlyLimit: 0,
      shouldAlert: false,
    };
  }

  // Load cost summary (30 days covers current month)
  const summary = params.costSummary ?? (await loadCostUsageSummary({ days: 30, config, agentId }));
  const { dailySpent, monthlySpent } = calculateSpending(summary);

  // Calculate remaining for each limit
  const dailyRemaining = dailyLimit > 0 ? Math.max(0, dailyLimit - dailySpent) : Infinity;
  const monthlyRemaining = monthlyLimit > 0 ? Math.max(0, monthlyLimit - monthlySpent) : Infinity;
  const remaining = Math.min(dailyRemaining, monthlyRemaining);

  // Check if over budget
  const overDailyBudget = dailyLimit > 0 && dailySpent >= dailyLimit;
  const overMonthlyBudget = monthlyLimit > 0 && monthlySpent >= monthlyLimit;
  const isOverBudget = overDailyBudget || overMonthlyBudget;

  // Check if should alert
  const dailyAlertThreshold = dailyLimit > 0 ? dailyLimit * alertAt : Infinity;
  const monthlyAlertThreshold = monthlyLimit > 0 ? monthlyLimit * alertAt : Infinity;
  const shouldAlert =
    (dailyLimit > 0 && dailySpent >= dailyAlertThreshold) ||
    (monthlyLimit > 0 && monthlySpent >= monthlyAlertThreshold);

  // Build alert message if needed
  let alertMessage: string | undefined;
  if (shouldAlert) {
    const parts: string[] = [];
    if (dailyLimit > 0 && dailySpent >= dailyAlertThreshold) {
      const pct = Math.round((dailySpent / dailyLimit) * 100);
      parts.push(`daily budget ${pct}% used ($${dailySpent.toFixed(2)}/$${dailyLimit.toFixed(2)})`);
    }
    if (monthlyLimit > 0 && monthlySpent >= monthlyAlertThreshold) {
      const pct = Math.round((monthlySpent / monthlyLimit) * 100);
      parts.push(
        `monthly budget ${pct}% used ($${monthlySpent.toFixed(2)}/$${monthlyLimit.toFixed(2)})`,
      );
    }
    alertMessage = `Budget alert for agent "${agentId}": ${parts.join("; ")}`;
  }

  // Determine if allowed based on action
  const allowed = action === "warn" || !isOverBudget;

  // Build reason if not allowed
  let reason: string | undefined;
  if (!allowed) {
    if (overDailyBudget) {
      reason = `Daily budget exceeded: $${dailySpent.toFixed(2)} spent of $${dailyLimit.toFixed(2)} limit`;
    } else if (overMonthlyBudget) {
      reason = `Monthly budget exceeded: $${monthlySpent.toFixed(2)} spent of $${monthlyLimit.toFixed(2)} limit`;
    }
  }

  return {
    allowed,
    remaining,
    reason,
    dailySpent,
    monthlySpent,
    dailyLimit,
    monthlyLimit,
    shouldAlert,
    alertMessage,
  };
}

/**
 * Gets the current budget status for an agent (for UI/API).
 */
export async function getBudgetStatus(params: {
  agentId: string;
  config: MoltbotConfig;
}): Promise<BudgetStatus> {
  const { agentId, config } = params;
  const budget = resolveBudgetConfig(config, agentId);

  const dailyLimit = budget?.daily ?? 0;
  const monthlyLimit = budget?.monthly ?? 0;
  const alertAt = budget?.alertAt ?? DEFAULT_ALERT_AT;
  const action = budget?.action ?? DEFAULT_ACTION;

  // If no budget configured, return empty status
  if (dailyLimit === 0 && monthlyLimit === 0) {
    return {
      agentId,
      daily: { spent: 0, limit: 0, remaining: Infinity, percentUsed: 0 },
      monthly: { spent: 0, limit: 0, remaining: Infinity, percentUsed: 0 },
      action,
      alertAt,
      isOverBudget: false,
      shouldAlert: false,
    };
  }

  const summary = await loadCostUsageSummary({ days: 30, config, agentId });
  const { dailySpent, monthlySpent } = calculateSpending(summary);

  const dailyRemaining = dailyLimit > 0 ? Math.max(0, dailyLimit - dailySpent) : Infinity;
  const monthlyRemaining = monthlyLimit > 0 ? Math.max(0, monthlyLimit - monthlySpent) : Infinity;

  const dailyPercentUsed = dailyLimit > 0 ? Math.min(100, (dailySpent / dailyLimit) * 100) : 0;
  const monthlyPercentUsed =
    monthlyLimit > 0 ? Math.min(100, (monthlySpent / monthlyLimit) * 100) : 0;

  const isOverBudget =
    (dailyLimit > 0 && dailySpent >= dailyLimit) ||
    (monthlyLimit > 0 && monthlySpent >= monthlyLimit);

  const shouldAlert =
    (dailyLimit > 0 && dailySpent >= dailyLimit * alertAt) ||
    (monthlyLimit > 0 && monthlySpent >= monthlyLimit * alertAt);

  return {
    agentId,
    daily: {
      spent: dailySpent,
      limit: dailyLimit,
      remaining: dailyRemaining,
      percentUsed: dailyPercentUsed,
    },
    monthly: {
      spent: monthlySpent,
      limit: monthlyLimit,
      remaining: monthlyRemaining,
      percentUsed: monthlyPercentUsed,
    },
    action,
    alertAt,
    isOverBudget,
    shouldAlert,
  };
}
