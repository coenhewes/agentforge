import { html, nothing } from "lit";

import type {
  BudgetSetParams,
  BudgetStatus,
  BudgetStatusResponse,
  CostUsageSummary,
} from "../controllers/usage";

export type UsageViewProps = {
  costSummary: CostUsageSummary | null;
  budgetStatus: BudgetStatusResponse | null;
  usageLoading: boolean;
  usageError: string | null;
  budgetSaving: boolean;
  budgetSaveError: string | null;
  onRefresh: () => void;
  onSaveBudget: (params: BudgetSetParams) => void;
};

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderCostChart(summary: CostUsageSummary) {
  const daily = summary.daily.slice(-14); // Last 14 days
  if (daily.length === 0) {
    return html`<div class="muted">No cost data available.</div>`;
  }

  const maxCost = Math.max(...daily.map((d) => d.totalCost), 0.01);

  return html`
    <div class="cost-chart">
      ${daily.map((day) => {
        const heightPct = (day.totalCost / maxCost) * 100;
        return html`
          <div class="cost-bar-container" title="${formatDate(day.date)}: ${formatCurrency(day.totalCost)}">
            <div class="cost-bar" style="height: ${Math.max(heightPct, 2)}%"></div>
            <div class="cost-bar-label">${formatDate(day.date).split(" ")[1]}</div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderBudgetProgress(status: BudgetStatus, period: "daily" | "monthly") {
  const data = status[period];
  const isUnlimited = data.limit === 0;
  const pctUsed = isUnlimited ? 0 : Math.min(100, data.percentUsed);
  const isOverBudget = !isUnlimited && data.spent >= data.limit;
  const isNearLimit = !isUnlimited && data.percentUsed >= (status.alertAt * 100);

  const barClass = isOverBudget ? "budget-bar--danger" : isNearLimit ? "budget-bar--warning" : "";

  return html`
    <div class="budget-progress">
      <div class="budget-progress-header">
        <span class="budget-progress-label">${period === "daily" ? "Today" : "This Month"}</span>
        <span class="budget-progress-value">
          ${formatCurrency(data.spent)}
          ${isUnlimited
            ? html`<span class="muted">/ unlimited</span>`
            : html`<span class="muted">/ ${formatCurrency(data.limit)}</span>`}
        </span>
      </div>
      <div class="budget-bar-track">
        <div class="budget-bar ${barClass}" style="width: ${pctUsed}%"></div>
      </div>
      ${!isUnlimited
        ? html`<div class="budget-progress-remaining">
            ${data.remaining > 0
              ? html`${formatCurrency(data.remaining)} remaining`
              : html`<span class="text-danger">Budget exceeded</span>`}
          </div>`
        : nothing}
    </div>
  `;
}

function renderBudgetCard(status: BudgetStatus) {
  return html`
    <div class="card budget-card">
      <div class="card-title">${status.agentId}</div>
      <div class="card-sub">
        Action: ${status.action === "block" ? "Block when exceeded" : "Warn only"}
        ${status.isOverBudget ? html` · <span class="text-danger">Over budget</span>` : nothing}
      </div>
      <div class="budget-progress-grid">
        ${renderBudgetProgress(status, "daily")}
        ${renderBudgetProgress(status, "monthly")}
      </div>
    </div>
  `;
}

function renderBudgetSettingsForm(
  budgetStatus: BudgetStatusResponse | null,
  budgetSaving: boolean,
  onSaveBudget: (params: BudgetSetParams) => void,
) {
  const defaultAgent = budgetStatus?.agents?.[0];
  const currentDaily = defaultAgent?.daily.limit ?? 0;
  const currentMonthly = defaultAgent?.monthly.limit ?? 0;
  const currentAlertAt = defaultAgent?.alertAt ?? 0.8;
  const currentAction = defaultAgent?.action ?? "warn";

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const daily = parseFloat(formData.get("daily") as string);
    const monthly = parseFloat(formData.get("monthly") as string);
    const alertAt = parseFloat(formData.get("alertAt") as string) / 100;
    const action = formData.get("action") as "warn" | "block";

    onSaveBudget({
      scope: "defaults",
      daily: isNaN(daily) ? 0 : daily,
      monthly: isNaN(monthly) ? 0 : monthly,
      alertAt: isNaN(alertAt) ? 0.8 : alertAt,
      action,
    });
  };

  return html`
    <form class="budget-settings-form" @submit=${handleSubmit}>
      <div class="form-grid">
        <label class="field">
          <span>Daily Limit (USD)</span>
          <input
            type="number"
            name="daily"
            step="0.01"
            min="0"
            .value=${currentDaily === 0 ? "" : String(currentDaily)}
            placeholder="0 = unlimited"
          />
        </label>
        <label class="field">
          <span>Monthly Limit (USD)</span>
          <input
            type="number"
            name="monthly"
            step="0.01"
            min="0"
            .value=${currentMonthly === 0 ? "" : String(currentMonthly)}
            placeholder="0 = unlimited"
          />
        </label>
        <label class="field">
          <span>Alert Threshold (%)</span>
          <input
            type="number"
            name="alertAt"
            step="1"
            min="0"
            max="100"
            .value=${String(Math.round(currentAlertAt * 100))}
            placeholder="80"
          />
        </label>
        <label class="field">
          <span>Action</span>
          <select name="action">
            <option value="warn" ?selected=${currentAction === "warn"}>Warn only</option>
            <option value="block" ?selected=${currentAction === "block"}>Block runs</option>
          </select>
        </label>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn" ?disabled=${budgetSaving}>
          ${budgetSaving ? "Saving..." : "Save Budget Settings"}
        </button>
      </div>
    </form>
  `;
}

export function renderUsage(props: UsageViewProps) {
  const { costSummary, budgetStatus, usageLoading, usageError, budgetSaving, budgetSaveError, onRefresh, onSaveBudget } = props;

  const todayCost = costSummary?.daily?.slice(-1)[0]?.totalCost ?? 0;
  const totalCost = costSummary?.totals?.totalCost ?? 0;
  const totalTokens = costSummary?.totals?.totalTokens ?? 0;

  return html`
    <section class="usage-view">
      <div class="usage-header">
        <button class="btn" @click=${() => onRefresh()} ?disabled=${usageLoading}>
          ${usageLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      ${usageError
        ? html`<div class="callout danger">${usageError}</div>`
        : nothing}

      ${budgetSaveError
        ? html`<div class="callout danger">${budgetSaveError}</div>`
        : nothing}

      <section class="grid grid-cols-3" style="margin-top: 18px;">
        <div class="card stat-card">
          <div class="stat-label">Today</div>
          <div class="stat-value">${formatCurrency(todayCost)}</div>
          <div class="muted">Cost for today's usage</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Last 30 Days</div>
          <div class="stat-value">${formatCurrency(totalCost)}</div>
          <div class="muted">Total spending</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Tokens</div>
          <div class="stat-value">${totalTokens.toLocaleString()}</div>
          <div class="muted">Total tokens (30 days)</div>
        </div>
      </section>

      <section class="grid grid-cols-2" style="margin-top: 18px;">
        <div class="card">
          <div class="card-title">Daily Costs</div>
          <div class="card-sub">Cost per day over the last 14 days.</div>
          <div style="margin-top: 16px; height: 180px;">
            ${costSummary ? renderCostChart(costSummary) : html`<div class="muted">Loading...</div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-title">Budget Settings</div>
          <div class="card-sub">Configure spending limits for all agents.</div>
          <div style="margin-top: 16px;">
            ${renderBudgetSettingsForm(budgetStatus, budgetSaving, onSaveBudget)}
          </div>
        </div>
      </section>

      ${budgetStatus && budgetStatus.agents.length > 0
        ? html`
            <section style="margin-top: 18px;">
              <h3 style="margin-bottom: 12px;">Budget Status by Agent</h3>
              <div class="grid grid-cols-2">
                ${budgetStatus.agents.map((status) => renderBudgetCard(status))}
              </div>
            </section>
          `
        : nothing}
    </section>
  `;
}
