import os from "node:os";
import path from "node:path";

import { loadConfig } from "../config/config.js";
import { callGateway } from "../gateway/call.js";
import { INTERNAL_MESSAGE_CHANNEL } from "../utils/message-channel.js";
import { AGENT_LANE_NESTED } from "../agents/lanes.js";
import { openVentureStateStore, resolveVentureDbPath } from "../agentforge/venture-state.js";
import { loadSubagentRegistryFromDisk } from "../agents/subagent-registry.store.js";

function resolveVentureWorkspaceDir(ventureId: string): string {
  return path.join(os.homedir(), ".moltbot", "ventures", ventureId);
}

function resolveVentureAgentId(ventureId: string): string {
  return `venture-${ventureId}`;
}

function resolveVentureMainSessionKey(ventureId: string): string {
  return `agent:${resolveVentureAgentId(ventureId)}:main`;
}

async function sendInternalMessage(params: { sessionKey: string; message: string }) {
  await callGateway({
    method: "agent",
    params: {
      sessionKey: params.sessionKey,
      message: params.message,
      deliver: false,
      channel: INTERNAL_MESSAGE_CHANNEL,
      lane: AGENT_LANE_NESTED,
    },
    timeoutMs: 10_000,
  });
}

export async function ventureTickCommand(params: {
  ventureId: string;
  coordinatorSessionKey?: string;
  subagentTimeoutMinutes?: number;
}): Promise<void> {
  const ventureId = params.ventureId.trim().toLowerCase();
  if (!ventureId) throw new Error("ventureId required");

  const workspaceDir = resolveVentureWorkspaceDir(ventureId);
  const dbPath = resolveVentureDbPath({ workspaceDir });
  const store = openVentureStateStore({ dbPath });

  const coordinatorSessionKey = params.coordinatorSessionKey?.trim() || "agent:coordinator:main";

  // 1) Enforce kill switch if the venture has been marked killed.
  const status = store.getKv("status");
  if (status === "killed") {
    const ventureSessionKey = resolveVentureMainSessionKey(ventureId);
    await callGateway({
      method: "sessions.delete",
      params: { key: ventureSessionKey, deleteTranscript: false },
      timeoutMs: 15_000,
    });
    await sendInternalMessage({
      sessionKey: coordinatorSessionKey,
      message: `Venture ${ventureId} is marked killed; stopping venture session ${ventureSessionKey}.`,
    });
    return;
  }

  // 2) Timeout stale subagents spawned by this venture agent.
  const timeoutMinutes = params.subagentTimeoutMinutes ?? 120;
  const cutoffMs = Date.now() - Math.max(1, timeoutMinutes) * 60_000;
  const requesterKey = resolveVentureMainSessionKey(ventureId);
  const runs = loadSubagentRegistryFromDisk();
  const timedOut: Array<{ runId: string; childSessionKey: string }> = [];
  for (const entry of runs.values()) {
    if (entry.requesterSessionKey !== requesterKey) continue;
    if (entry.endedAt) continue;
    const startedAt = entry.startedAt ?? entry.createdAt;
    if (startedAt && startedAt < cutoffMs) {
      timedOut.push({ runId: entry.runId, childSessionKey: entry.childSessionKey });
    }
  }

  for (const t of timedOut) {
    await callGateway({
      method: "sessions.delete",
      params: { key: t.childSessionKey, deleteTranscript: false },
      timeoutMs: 15_000,
    });
    store.appendEvent("subagent.timeout", { runId: t.runId, childSessionKey: t.childSessionKey });
  }

  // 3) Get KPIs before checking kill switches
  const kpis = store.listKpis();

  // 4) Check kill switches and enforce thresholds
  const killSwitches = store.listKillSwitches();
  const killReasons: string[] = [];

  for (const killSwitch of killSwitches) {
    if (!killSwitch.enabled) continue;

    // Check if kill condition is met
    // Kill switches have: condition, action, windowDays
    // Examples:
    // - "no revenue by day 30" -> check if days_running >= 30 && revenue == 0
    // - "CAC > $100" -> check CAC KPI
    // - "churn > 50%" -> check churn KPI

    const shouldKill = await checkKillSwitchCondition(killSwitch, store, kpis);
    if (shouldKill) {
      killReasons.push(`Kill switch triggered: ${killSwitch.condition}`);
    }
  }

  // 5) Execute kill if any threshold hit
  if (killReasons.length > 0) {
    store.setKv("status", "killed");
    store.setKv("killed_at", Date.now());
    store.setKv("kill_reason", killReasons.join("; "));
    store.appendEvent("venture.killed", {
      reasons: killReasons,
      timestamp: Date.now(),
    });

    // Notify CEO
    await sendInternalMessage({
      sessionKey: "agent:ceo:main",
      message: `KILL SWITCH TRIGGERED: Venture ${ventureId}\nReasons:\n${killReasons.map((r) => `- ${r}`).join("\n")}\n\nUpdate LEDGER.md to move this investment to "Killed Investments" section.`,
    });

    // Terminate venture session
    const ventureSessionKey = resolveVentureMainSessionKey(ventureId);
    await callGateway({
      method: "sessions.delete",
      params: { key: ventureSessionKey, deleteTranscript: false },
      timeoutMs: 15_000,
    });

    return;
  }

  // 6) Status report (best-effort): KPIs + timeouts + kill switches
  const lines: string[] = [];
  lines.push(`Venture tick: ${ventureId}`);
  if (timedOut.length > 0) {
    lines.push(`- Timed out subagents: ${timedOut.length} (killed via sessions.delete)`);
  } else {
    lines.push("- Timed out subagents: 0");
  }
  if (kpis.length > 0) {
    lines.push("- KPIs:");
    for (const kpi of kpis) {
      lines.push(`  - ${kpi.name}: ${JSON.stringify(kpi.value)}`);
    }
  } else {
    lines.push("- KPIs: (none set)");
  }

  // Report kill switch status
  if (killSwitches.length > 0) {
    const activeKillSwitches = killSwitches.filter((ks) => ks.enabled);
    lines.push(`- Active kill switches: ${activeKillSwitches.length}`);
    for (const ks of activeKillSwitches) {
      lines.push(`  - ${ks.condition} (window: ${ks.windowDays} days)`);
    }
  }

  await sendInternalMessage({ sessionKey: coordinatorSessionKey, message: lines.join("\n") });
  // Also ping the venture agent to continue execution.
  await sendInternalMessage({
    sessionKey: requesterKey,
    message:
      "Runloop tick: review KPIs, update ops/venture.sqlite KPIs, check kill switches, and continue executing the latest board decision.",
  });
}

/**
 * Check if a kill switch condition is met based on current venture state
 */
async function checkKillSwitchCondition(
  killSwitch: {
    id: string;
    condition: string;
    action: string;
    windowDays: number;
    enabled: boolean;
  },
  store: ReturnType<typeof openVentureStateStore>,
  kpis: Array<{ name: string; value: unknown }>,
): Promise<boolean> {
  const condition = killSwitch.condition.toLowerCase();

  // Parse common kill switch patterns

  // Pattern: "no revenue by day X" or "zero revenue after X days"
  if (condition.match(/no revenue|zero revenue|revenue.*0/i)) {
    const daysMatch = condition.match(/(\d+)\s*days?/);
    const dayThreshold = daysMatch ? Number.parseInt(daysMatch[1], 10) : killSwitch.windowDays;

    const createdAt = store.getKv("created_at") as number | null;
    if (!createdAt) return false;

    const daysRunning = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    const revenueKpi = kpis.find((k) => k.name.toLowerCase().includes("revenue"));
    const revenue = revenueKpi ? Number(revenueKpi.value) || 0 : 0;

    return daysRunning >= dayThreshold && revenue === 0;
  }

  // Pattern: "CAC > $X" or "customer acquisition cost exceeds $X"
  if (condition.match(/cac|customer acquisition cost/i)) {
    const amountMatch = condition.match(/\$?\s*(\d+)/);
    if (!amountMatch) return false;

    const threshold = Number.parseInt(amountMatch[1], 10);
    const cacKpi = kpis.find(
      (k) =>
        k.name.toLowerCase().includes("cac") ||
        k.name.toLowerCase().includes("customer_acquisition_cost"),
    );
    const cac = cacKpi ? Number(cacKpi.value) || 0 : 0;

    return cac > threshold;
  }

  // Pattern: "churn > X%" or "churn rate exceeds X%"
  if (condition.match(/churn/i)) {
    const percentMatch = condition.match(/(\d+)\s*%/);
    if (!percentMatch) return false;

    const threshold = Number.parseInt(percentMatch[1], 10) / 100;
    const churnKpi = kpis.find((k) => k.name.toLowerCase().includes("churn"));
    const churn = churnKpi ? Number(churnKpi.value) || 0 : 0;

    return churn > threshold;
  }

  // Pattern: "build time > X days" or "timeline exceeds X days"
  if (condition.match(/build time|timeline|takes.*(\d+)\s*days/i)) {
    const daysMatch = condition.match(/(\d+)\s*days?/);
    if (!daysMatch) return false;

    const threshold = Number.parseInt(daysMatch[1], 10);
    const createdAt = store.getKv("created_at") as number | null;
    if (!createdAt) return false;

    const daysRunning = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    const status = store.getKv("status") as string;

    // Kill if still building after threshold days
    return daysRunning > threshold && status === "building";
  }

  // Default: check if window has passed
  const createdAt = store.getKv("created_at") as number | null;
  if (!createdAt) return false;

  const daysRunning = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  return daysRunning > killSwitch.windowDays;
}
