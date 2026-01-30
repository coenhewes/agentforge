#!/usr/bin/env node
/**
 * Board Meeting with live TUI: runs the same two-way consensus flow as
 * board-meeting.sh but shows a real-time view of phase, current agent, and
 * each agent's last message as they complete.
 *
 * Usage: node scripts/board-meeting-tui.mjs
 * Run from repo root (same as board-meeting.sh). Uses board-get-session-message.mjs.
 */

import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const BOARD_MEMBERS_AFTER_ANALYST = [
  "cfo",
  "cto",
  "cmo",
  "coo",
  "risk",
  "innovation",
];

const ROLE_NAMES = {
  cfo: "CFO",
  cto: "CTO",
  cmo: "CMO",
  coo: "COO",
  risk: "Risk Manager",
  innovation: "Innovation Lead",
};

const ROLE_INSTRUCTIONS = {
  cfo: `Your job:
1. Evaluate financial viability of each opportunity above
2. Recommend budget allocation (how much to invest?)
3. Calculate expected ROI and timeline
4. Set kill thresholds based on risk/reward
5. Assess runway impact

For each opportunity, state:
- Recommended budget: $X
- Expected ROI: Xx in Y days
- Kill if: [specific threshold]
- Risk level: Low/Medium/High

Be conservative but opportunistic. Present your analysis clearly.`,

  cto: `Your job:
1. Assess technical feasibility of each opportunity above
2. Estimate build timeline (be realistic + 50% buffer)
3. Recommend tech stack
4. Calculate infrastructure costs
5. Identify technical risks

For each opportunity, state:
- Build complexity: Simple/Medium/Complex
- Timeline: X days to MVP
- Tech stack: [specific choices]
- Infrastructure: $X/month
- Risks: [list]

Prefer boring, proven tech. Present your analysis clearly.`,

  cmo: `Your job:
1. Identify target customers for each opportunity above
2. Recommend acquisition channels (organic preferred)
3. Estimate Customer Acquisition Cost (CAC)
4. Design go-to-market strategy
5. Assess marketing feasibility

For each opportunity, state:
- Target customer: [who]
- Channels: [where to find them]
- CAC estimate: $X
- Launch plan: [specific steps]
- Timeline: X days

Focus on low-cost, high-impact channels. Present your analysis clearly.`,

  coo: `Your job:
1. Assess resource requirements (people, tools, freelancers) for each opportunity above
2. Evaluate operational complexity
3. Identify bottlenecks and dependencies
4. Validate timeline feasibility
5. Plan execution

For each opportunity, state:
- Resources needed: [list]
- Operational complexity: Low/Medium/High
- Bottlenecks: [list]
- Timeline assessment: Realistic/Aggressive/Conservative
- Execution plan: [key milestones]

Be pragmatic. Present your analysis clearly.`,

  risk: `Your job:
1. Identify risks (market, execution, financial, opportunity cost) for each opportunity above
2. Set appropriate kill thresholds
3. Assess downside scenarios
4. Recommend risk mitigation
5. Evaluate portfolio balance

For each opportunity, state:
- Key risks: [list]
- Kill thresholds: [specific, measurable criteria]
- Max downside: $X (acceptable?)
- Mitigation: [actions]
- Recommendation: Approve/Reject/Conditional

Protect the downside. Present your analysis clearly.`,

  innovation: `Your job:
1. Add 1-2 unconventional or experimental ideas given the opportunities above
2. Identify emerging trends (AI, no-code, creator economy, etc.)
3. Propose high-risk/high-reward alternatives
4. Challenge conservative thinking
5. Advocate for experimental budget

For your ideas, provide:
- Opportunity: [what]
- Why now: [timing/trend]
- Potential: [upside]
- Risk: [downside]
- Budget: $X

Think 10x, not 2x. But ground ideas in reality. Present clearly.`,
};

const PREVIEW_LEN = 48;
const REDRAW_MS = 1000;
const TABLE_WIDTH = 78;
const CONVERSATION_WIDTH = TABLE_WIDTH - 2;
const CONVERSATION_LINES = 18;
const CURRENT_OUTPUT_LINES = 14;

const ESC = "\x1b";
const s = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  cyan: `${ESC}[36m`,
  cyanBold: `${ESC}[1;36m`,
  green: `${ESC}[32m`,
  greenBold: `${ESC}[1;32m`,
  yellow: `${ESC}[33m`,
  yellowBold: `${ESC}[1;33m`,
  gray: `${ESC}[90m`,
  grayDim: `${ESC}[2;90m`,
  white: `${ESC}[97m`,
};

function clearAndHome() {
  process.stdout.write(`${ESC}[2J${ESC}[H`);
}

function getLastMessage(agentId) {
  try {
    const out = execSync(
      `node "${path.join(REPO_ROOT, "scripts", "board-get-session-message.mjs")}" --agent ${agentId}`,
      { cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 2 * 1024 * 1024 },
    );
    return (out && out.trim()) || "";
  } catch {
    return "";
  }
}

function runAgent(agentId, message) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["moltbot.mjs", "agent", "--agent", agentId, "--message", message],
      { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    child.stderr?.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("exit", (code) => {
      resolve({ code, err });
    });
  });
}

function wrapText(text, width) {
  if (!text || width < 1) return [];
  const lines = [];
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const paragraph of raw.split(/\n\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      if (line.length + (line ? 1 : 0) + w.length <= width) {
        line += (line ? " " : "") + w;
      } else {
        if (line) lines.push(line);
        line = w.slice(0, width);
        while (line.length >= width) {
          lines.push(line.slice(0, width));
          line = line.slice(width);
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function preview(text) {
  if (!text) return "";
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= PREVIEW_LEN) return one;
  return one.slice(0, PREVIEW_LEN - 1) + "…";
}

const STATUS_WIDTH = 10;

function stripAnsi(str) {
  return str.replace(/\x1b\[[\d;]*m/g, "");
}

function statusStyled(status) {
  const raw =
    status === "running"
      ? "▶ running"
      : status === "done"
        ? "✓ done"
        : "— waiting";
  const padded = raw.padEnd(STATUS_WIDTH);
  if (status === "running") return `${s.cyanBold}${padded}${s.reset}`;
  if (status === "done") return `${s.greenBold}${padded}${s.reset}`;
  return `${s.grayDim}${padded}${s.reset}`;
}

function redraw(state) {
  // Live preview: refresh last message for the agent currently running
  if (state.currentAgent) {
    const msg = getLastMessage(state.currentAgent);
    if (msg) state.agents[state.currentAgent].lastMessage = msg;
  }

  // Append completed agents' full messages to conversation log (once each)
  const allAgents = ["analyst", ...BOARD_MEMBERS_AFTER_ANALYST, "coordinator"];
  for (const id of allAgents) {
    if (state.loggedAgents.has(id)) continue;
    const entry = state.agents[id];
    if (!entry || entry.status !== "done" || !entry.lastMessage) continue;
    const name = ROLE_NAMES[id] ?? id;
    state.conversationLog.push(`--- ${name} ---`);
    state.conversationLog.push(...wrapText(entry.lastMessage, CONVERSATION_WIDTH));
    state.loggedAgents.add(id);
  }

  clearAndHome();

  const date = state.date;
  const phaseLabels = {
    1: "1. Analyst",
    2: "2. Board members (shared report)",
    3: "3. Coordinator",
  };
  const phase = phaseLabels[state.phase] ?? state.phase;
  const currentAgentName = state.currentAgent
    ? ROLE_NAMES[state.currentAgent] ?? state.currentAgent
    : null;

  // ─── Header ─────────────────────────────────────────────────────────────
  const top = "╭" + "─".repeat(TABLE_WIDTH - 2) + "╮";
  const bottom = "╰" + "─".repeat(TABLE_WIDTH - 2) + "╯";
  const side = "│";

  process.stdout.write("\n");
  process.stdout.write(`${s.gray}${top}${s.reset}\n`);
  const title = "  Board Meeting";
  const dateRight = `  ${date}  `;
  const liveBadge = `${s.cyanBold} ● LIVE ${s.reset}`;
  const rightVisible = dateRight.length + 7; // " ● LIVE "
  const mid = TABLE_WIDTH - 2 - title.length - rightVisible;
  process.stdout.write(`${side}${s.bold}${s.cyan}${title}${s.reset}${" ".repeat(Math.max(0, mid))}${s.gray}${dateRight}${s.reset}${liveBadge}${side}\n`);
  process.stdout.write(`${s.gray}${side}${" ".repeat(TABLE_WIDTH - 2)}${side}${s.reset}\n`);

  const phaseStr = `  Phase: ${s.yellowBold}${phase}${s.reset}`;
  const currentStr = currentAgentName
    ? `  Now: ${s.cyanBold}${currentAgentName}${s.reset}`
    : "";
  const phaseMid = TABLE_WIDTH - 2 - stripAnsi(phaseStr).length - stripAnsi(currentStr).length;
  process.stdout.write(`${side}${phaseStr}${" ".repeat(Math.max(0, phaseMid))}${currentStr}${side}\n`);
  process.stdout.write(`${s.gray}${side}${" ".repeat(TABLE_WIDTH - 2)}${side}${s.reset}\n`);
  process.stdout.write(`${s.gray}${bottom}${s.reset}\n\n`);

  // ─── Discussion table ───────────────────────────────────────────────────
  const colAgent = 16; // "Innovation Lead" fits
  const colStatus = STATUS_WIDTH + 2;
  const colPreview = TABLE_WIDTH - colAgent - colStatus - 2 - 4; // sides + spaces

  process.stdout.write(`${s.gray}  ╭${"─".repeat(colAgent)}┬${"─".repeat(colStatus)}┬${"─".repeat(colPreview)}╮${s.reset}\n`);
  process.stdout.write(`${s.gray}  │${s.reset} ${s.dim}Agent${s.reset}${" ".repeat(colAgent - 5)}${s.gray}│${s.reset} ${s.dim}Status${s.reset}${" ".repeat(colStatus - 6)}${s.gray}│${s.reset} ${s.dim}Preview${s.reset}${" ".repeat(Math.max(0, colPreview - 7))}${s.gray}│${s.reset}\n`);
  process.stdout.write(`${s.gray}  ├${"─".repeat(colAgent)}┼${"─".repeat(colStatus)}┼${"─".repeat(colPreview)}┤${s.reset}\n`);

  for (const id of allAgents) {
    const name = ROLE_NAMES[id] ?? id;
    const entry = state.agents[id] ?? { status: "waiting", lastMessage: "" };
    const isCurrent = state.currentAgent === id;
    const nameCell = (isCurrent ? `${s.cyanBold}${name}${s.reset}` : name).padEnd(colAgent - 2);
    const statusCell = statusStyled(entry.status);
    const prev = preview(entry.lastMessage).slice(0, colPreview - 2);
    const prevPadded = prev.padEnd(colPreview - 2);
    process.stdout.write(`${s.gray}  │${s.reset} ${nameCell}${s.gray}│${s.reset} ${statusCell}${s.gray}│${s.reset} ${s.grayDim}${prevPadded}${s.reset}${s.gray}│${s.reset}\n`);
  }

  process.stdout.write(`${s.gray}  ╰${"─".repeat(colAgent)}┴${"─".repeat(colStatus)}┴${"─".repeat(colPreview)}╯${s.reset}\n`);

  // --- Conversation stream (full discussion as each agent completes) ---
  const logLines = state.conversationLog;
  const tailLog = logLines.slice(-CONVERSATION_LINES);
  if (tailLog.length > 0) {
    process.stdout.write(`\n${s.gray}  ╭${"─".repeat(CONVERSATION_WIDTH)}╮${s.reset}\n`);
    process.stdout.write(`${s.gray}  │${s.reset} ${s.bold}Conversation${s.reset}${" ".repeat(Math.max(0, CONVERSATION_WIDTH - 12))}${s.gray}│${s.reset}\n`);
    process.stdout.write(`${s.gray}  ├${"─".repeat(CONVERSATION_WIDTH)}┤${s.reset}\n`);
    for (const line of tailLog) {
      const safe = line.slice(0, CONVERSATION_WIDTH).padEnd(CONVERSATION_WIDTH);
      process.stdout.write(`${s.gray}  │${s.reset} ${s.grayDim}${safe}${s.reset}${s.gray}│${s.reset}\n`);
    }
    process.stdout.write(`${s.gray}  ╰${"─".repeat(CONVERSATION_WIDTH)}╯${s.reset}\n`);
  }

  // --- Current agent output (live text for the agent currently running) ---
  if (state.currentAgent) {
    const msg = (state.agents[state.currentAgent]?.lastMessage ?? "").trim();
    const name = ROLE_NAMES[state.currentAgent] ?? state.currentAgent;
    const wrapped = wrapText(msg || "Waiting for response…", CONVERSATION_WIDTH);
    const tail = wrapped.slice(-CURRENT_OUTPUT_LINES);
    process.stdout.write(`\n${s.gray}  ╭${"─".repeat(CONVERSATION_WIDTH)}╮${s.reset}\n`);
    process.stdout.write(`${s.gray}  │${s.reset} ${s.cyanBold}Current: ${name}${s.reset}${" ".repeat(Math.max(0, CONVERSATION_WIDTH - 10 - name.length))}${s.gray}│${s.reset}\n`);
    process.stdout.write(`${s.gray}  ├${"─".repeat(CONVERSATION_WIDTH)}┤${s.reset}\n`);
    for (const line of tail) {
      const safe = line.slice(0, CONVERSATION_WIDTH).padEnd(CONVERSATION_WIDTH);
      process.stdout.write(`${s.gray}  │${s.reset} ${safe}${s.gray}│${s.reset}\n`);
    }
    process.stdout.write(`${s.gray}  ╰${"─".repeat(CONVERSATION_WIDTH)}╯${s.reset}\n`);
  }

  process.stdout.write(`\n${s.grayDim}  Updates every 1s · Run in foreground for live view${s.reset}\n`);
}

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const state = {
    date,
    phase: 1,
    currentAgent: null,
    conversationLog: [],
    loggedAgents: new Set(),
    agents: {
      analyst: { status: "waiting", lastMessage: "" },
      cfo: { status: "waiting", lastMessage: "" },
      cto: { status: "waiting", lastMessage: "" },
      cmo: { status: "waiting", lastMessage: "" },
      coo: { status: "waiting", lastMessage: "" },
      risk: { status: "waiting", lastMessage: "" },
      innovation: { status: "waiting", lastMessage: "" },
      coordinator: { status: "waiting", lastMessage: "" },
    },
  };

  const redrawInterval = setInterval(() => redraw(state), REDRAW_MS);
  redraw(state);

  const analystMessage = `Board Meeting ${date} - YOUR ROLE: Market Analyst

CRITICAL: Use the browser tool RIGHT NOW to research opportunities. Do not make up hypothetical ideas.

YOUR TASK:
1. Browse Reddit (r/SaaS, r/Entrepreneur, r/startups) for customer pain points
2. Check Product Hunt for trending products and competitor pricing
3. Search Twitter/X for complaints about existing tools
4. Identify 3 REAL market opportunities with DATA

For each opportunity, provide:
- Problem: What pain point? (with real quotes/evidence)
- Market size: Estimated TAM
- Competitors: Who exists? What do they charge? What do reviews say?
- Gap: What's missing?
- Est. ROI: Based on competitor pricing

Present your findings clearly. The coordinator will read your response.`;

  // --- Phase 1: Analyst ---
  state.phase = 1;
  state.currentAgent = "analyst";
  state.agents.analyst.status = "running";
  await runAgent("analyst", analystMessage);
  state.agents.analyst.status = "done";

  let analystBrief = "";
  for (let i = 0; i < 5; i++) {
    analystBrief = getLastMessage("analyst");
    if (analystBrief) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  state.agents.analyst.lastMessage = analystBrief;
  state.currentAgent = null;

  // --- Phase 2: Six members with shared analyst report ---
  state.phase = 2;

  for (const member of BOARD_MEMBERS_AFTER_ANALYST) {
    state.currentAgent = member;
    state.agents[member].status = "running";
    const roleName = ROLE_NAMES[member] ?? member;
    const fullMessage = `Board Meeting ${date} - YOUR ROLE: ${roleName}\n\nHere is the Market Analyst's report:\n\n${analystBrief}\n\n---\n\nUsing the report above, ${ROLE_INSTRUCTIONS[member]}`;
    await runAgent(member, fullMessage);
    state.agents[member].status = "done";
    state.agents[member].lastMessage = getLastMessage(member);
  }
  state.currentAgent = null;

  await new Promise((r) => setTimeout(r, 3000));

  // --- Phase 3: Coordinator ---
  state.phase = 3;
  state.currentAgent = "coordinator";
  state.agents.coordinator.status = "running";

  const coordinatorMessage = `Board Meeting ${date} - SYNTHESIZE DECISION

Read the latest responses from all 7 board members:
- agent:analyst:main (Market Analyst's opportunities)
- agent:cfo:main (Financial analysis)
- agent:cto:main (Technical feasibility)
- agent:cmo:main (Marketing strategy)
- agent:coo:main (Operations plan)
- agent:risk:main (Risk assessment)
- agent:innovation:main (Alternative ideas)

Board members have all seen the same analyst report and responded to it. Your task:
1. Read each member's latest response using sessions_history
2. Extract key points from each
3. Identify which opportunity has the most support
4. Synthesize into a clear BOARD DECISION using the exact format from your SOUL.md
5. Include all necessary details: budget, timeline, build plan, marketing plan, kill thresholds

The CEO will read YOUR decision to execute. Be clear and actionable.`;

  await runAgent("coordinator", coordinatorMessage);
  state.agents.coordinator.status = "done";
  state.agents.coordinator.lastMessage = getLastMessage("coordinator");
  state.currentAgent = null;

  clearInterval(redrawInterval);
  redraw(state);
  process.stdout.write(`\n${s.greenBold}  ✓ Board meeting complete.${s.reset}\n`);
  process.stdout.write(`${s.grayDim}  CEO can read agent:coordinator:main for the decision.${s.reset}\n\n`);
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
