import type { GatewayBrowserClient } from "../gateway";

export type CostUsageDailyEntry = {
  date: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  missingCostEntries: number;
};

export type CostUsageSummary = {
  updatedAt: number;
  days: number;
  daily: CostUsageDailyEntry[];
  totals: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    totalCost: number;
    missingCostEntries: number;
  };
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

export type BudgetStatusResponse = {
  agents: BudgetStatus[];
};

export type UsageState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  usageLoading: boolean;
  usageError: string | null;
  costSummary: CostUsageSummary | null;
  budgetStatus: BudgetStatusResponse | null;
  budgetSaving: boolean;
  budgetSaveError: string | null;
};

export function initialUsageState(): Omit<UsageState, "client" | "connected"> {
  return {
    usageLoading: false,
    usageError: null,
    costSummary: null,
    budgetStatus: null,
    budgetSaving: false,
    budgetSaveError: null,
  };
}

export async function loadUsageData(state: UsageState): Promise<void> {
  if (!state.client || !state.connected) return;
  if (state.usageLoading) return;
  state.usageLoading = true;
  state.usageError = null;
  try {
    // Load cost summary and budget status in parallel
    const [costRes, budgetRes] = await Promise.all([
      state.client.request("usage.cost", { days: 30 }) as Promise<CostUsageSummary | undefined>,
      state.client.request("budget.status", {}) as Promise<BudgetStatusResponse | undefined>,
    ]);
    if (costRes) state.costSummary = costRes;
    if (budgetRes) state.budgetStatus = budgetRes;
  } catch (err) {
    state.usageError = String(err);
  } finally {
    state.usageLoading = false;
  }
}

export type BudgetSetParams = {
  agentId?: string;
  daily?: number;
  monthly?: number;
  alertAt?: number;
  action?: "warn" | "block";
  scope?: "agent" | "defaults";
};

export async function saveBudgetSettings(
  state: UsageState,
  params: BudgetSetParams,
): Promise<boolean> {
  if (!state.client || !state.connected) return false;
  state.budgetSaving = true;
  state.budgetSaveError = null;
  try {
    await state.client.request("budget.set", params);
    // Reload budget status after save
    const budgetRes = (await state.client.request(
      "budget.status",
      {},
    )) as BudgetStatusResponse | undefined;
    if (budgetRes) state.budgetStatus = budgetRes;
    return true;
  } catch (err) {
    state.budgetSaveError = String(err);
    return false;
  } finally {
    state.budgetSaving = false;
  }
}
