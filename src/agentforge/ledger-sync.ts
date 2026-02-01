import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { openVentureStateStore, resolveVentureDbPath } from "./venture-state.js";

/**
 * Bidirectional sync between LEDGER.md (markdown) and venture.sqlite (structured data)
 *
 * Strategy:
 * - SQLite is source of truth for structured financial data
 * - LEDGER.md is generated from SQLite for human readability
 * - Can parse LEDGER.md to populate SQLite (initial migration)
 */

const CEO_LEDGER_PATH = path.join(os.homedir(), ".moltbot", "agents", "ceo", "LEDGER.md");

interface ParsedLedger {
  capital: {
    available: number;
    earnedLifetime: number;
    spentLifetime: number;
    netPosition: number;
  };
  activeInvestments: ParsedInvestment[];
  completedInvestments: ParsedInvestment[];
  killedInvestments: ParsedInvestment[];
}

interface ParsedInvestment {
  id: string;
  productName: string;
  category: string;
  budget: number;
  spent: number;
  revenue: number;
  roi: string;
  killThreshold: string;
  daysRemaining: number;
  status: string;
}

/**
 * Parse LEDGER.md and extract financial data
 */
export async function parseLedgerMarkdown(
  ledgerPath: string = CEO_LEDGER_PATH,
): Promise<ParsedLedger> {
  const content = await fs.readFile(ledgerPath, "utf-8");

  const result: ParsedLedger = {
    capital: {
      available: 0,
      earnedLifetime: 0,
      spentLifetime: 0,
      netPosition: 0,
    },
    activeInvestments: [],
    completedInvestments: [],
    killedInvestments: [],
  };

  // Parse capital status (allow integers or decimals e.g. $1 or $1.09)
  const availableMatch = content.match(/\*\*Current Capital Available:\*\*\s*\$(\d+(?:\.\d+)?)/);
  const earnedMatch = content.match(/\*\*Total Earned \(Lifetime\):\*\*\s*\$(\d+(?:\.\d+)?)/);
  const spentMatch = content.match(/\*\*Total Spent \(Lifetime\):\*\*\s*\$(\d+(?:\.\d+)?)/);
  const netMatch = content.match(/\*\*Net Position:\*\*\s*\$?(-?\d+(?:\.\d+)?)/);

  if (availableMatch) result.capital.available = Number.parseFloat(availableMatch[1]);
  if (earnedMatch) result.capital.earnedLifetime = Number.parseFloat(earnedMatch[1]);
  if (spentMatch) result.capital.spentLifetime = Number.parseFloat(spentMatch[1]);
  if (netMatch) result.capital.netPosition = Number.parseFloat(netMatch[1]);

  // Parse active investments table
  const activeSection = content.match(/## Active Investments\s+([\s\S]*?)(?=##|$)/);
  if (activeSection) {
    result.activeInvestments = parseInvestmentTable(activeSection[1]);
  }

  // Parse completed investments
  const completedSection = content.match(
    /## Completed Investments \(Successful\)\s+([\s\S]*?)(?=##|$)/,
  );
  if (completedSection) {
    result.completedInvestments = parseInvestmentTable(completedSection[1]);
  }

  // Parse killed investments
  const killedSection = content.match(/## Killed Investments \(Failures\)\s+([\s\S]*?)(?=##|$)/);
  if (killedSection) {
    result.killedInvestments = parseInvestmentTable(killedSection[1]);
  }

  return result;
}

function parseInvestmentTable(section: string): ParsedInvestment[] {
  const investments: ParsedInvestment[] = [];
  const lines = section.split("\n");

  for (const line of lines) {
    // Match table rows: | ID | Product | Category | ...
    const match = line.match(/^\|\s*([A-Z0-9-]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
    if (!match || match[1] === "-") continue;

    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 8) continue;

    const [id, productName, category, ...rest] = parts;

    investments.push({
      id,
      productName,
      category,
      budget: parseMoneyValue(rest[1] || "$0"),
      spent: parseMoneyValue(rest[2] || "$0"),
      revenue: parseMoneyValue(rest[3] || "$0"),
      roi: rest[4] || "N/A",
      killThreshold: rest[5] || "",
      daysRemaining: Number.parseInt(rest[6] || "0", 10) || 0,
      status: rest[7] || "unknown",
    });
  }

  return investments;
}

function parseMoneyValue(str: string): number {
  const cleaned = str.replace(/[^0-9.-]/g, "");
  return Number.parseFloat(cleaned) || 0;
}

/**
 * Generate LEDGER.md content from SQLite data
 */
export async function generateLedgerMarkdown(workspaceDir?: string): Promise<string> {
  const dbPath = workspaceDir
    ? resolveVentureDbPath({ workspaceDir })
    : path.join(os.homedir(), ".moltbot", "ventures", "default", "ops", "venture.sqlite");

  const store = openVentureStateStore({ dbPath });

  const available = store.getCapital("available");
  const earned = store.getCapital("earned_lifetime");
  const spent = store.getCapital("spent_lifetime");
  const net = earned - spent;

  const activeInvestments = store.listInvestments("active");
  const completedInvestments = store.listInvestments("completed");
  const killedInvestments = store.listInvestments("killed");

  let md = `# Investment Ledger

This ledger tracks all investments, their performance, and outcomes.

---

## 🚨 CAPITAL STATUS

**Starting Capital:** $0  
**Current Capital Available:** $${available}  
**Total Earned (Lifetime):** $${earned}  
**Total Spent (Lifetime):** $${spent}  
**Net Position:** $${net}  

**⚠️ YOU CANNOT SPEND MONEY YOU DON'T HAVE!**

**Bootstrap Rules:**
- First ventures MUST cost $0 (free tools only)
- Earn revenue BEFORE spending
- Reinvest earnings gradually
- Scale budgets as capital grows

---

## Active Investments

| ID | Product Name | Category | Board Decision | Budget | Spent | Revenue | ROI | Kill Threshold | Days Remaining | Status |
|----|--------------|----------|----------------|--------|-------|---------|-----|----------------|----------------|--------|
`;

  if (activeInvestments.length === 0) {
    md +=
      "| - | - | - | - | - | - | - | - | - | - | - |\n\n*No active investments yet. Waiting for first board decision.*\n";
  } else {
    for (const inv of activeInvestments) {
      const roi =
        inv.revenueUsd > 0
          ? `${Math.round(((inv.revenueUsd - inv.spentUsd) / inv.spentUsd) * 100)}%`
          : "N/A";
      const decisionDate = new Date(inv.boardDecisionDate).toISOString().split("T")[0];
      md += `| ${inv.id} | ${inv.ventureName} | ${inv.category} | ${decisionDate} | $${inv.budgetUsd} | $${inv.spentUsd} | $${inv.revenueUsd} | ${roi} | ${inv.killThreshold} | ${inv.daysRemaining} | ${inv.status} |\n`;
    }
  }

  md += `
---

## Completed Investments (Successful)

| ID | Product | Category | Budget | Total Spent | Total Revenue | ROI | Duration | Outcome | Key Success Factors |
|----|---------|----------|--------|-------------|---------------|-----|----------|---------|---------------------|
`;

  if (completedInvestments.length === 0) {
    md += "| - | - | - | - | - | - | - | - | - | - |\n\n*No completed investments yet.*\n";
  } else {
    for (const inv of completedInvestments) {
      const roi = `${Math.round(((inv.revenueUsd - inv.spentUsd) / inv.spentUsd) * 100)}%`;
      const duration = inv.completedAt
        ? Math.round((inv.completedAt - inv.createdAt) / (1000 * 60 * 60 * 24))
        : 0;
      md += `| ${inv.id} | ${inv.ventureName} | ${inv.category} | $${inv.budgetUsd} | $${inv.spentUsd} | $${inv.revenueUsd} | ${roi} | ${duration} days | Success | TBD |\n`;
    }
  }

  md += `
---

## Killed Investments (Failures)

| ID | Product | Category | Budget | Spent | Revenue | ROI | Kill Reason | Days Survived | Key Failure Factors |
|----|---------|----------|--------|-------|---------|-----|-------------|---------------|---------------------|
`;

  if (killedInvestments.length === 0) {
    md += "| - | - | - | - | - | - | - | - | - | - |\n\n*No killed investments yet.*\n";
  } else {
    for (const inv of killedInvestments) {
      const roi = `${Math.round(((inv.revenueUsd - inv.spentUsd) / inv.spentUsd) * 100)}%`;
      const duration = inv.completedAt
        ? Math.round((inv.completedAt - inv.createdAt) / (1000 * 60 * 60 * 24))
        : 0;
      md += `| ${inv.id} | ${inv.ventureName} | ${inv.category} | $${inv.budgetUsd} | $${inv.spentUsd} | $${inv.revenueUsd} | ${roi} | ${inv.killThreshold} | ${duration} days | TBD |\n`;
    }
  }

  md += `
---

## Portfolio Summary

### Overall Performance

**Total Invested:** $${spent}  
**Total Revenue:** $${earned}  
**Portfolio ROI:** ${earned > 0 ? Math.round(((earned - spent) / spent) * 100) : 0}%  
**Win Rate:** ${completedInvestments.length}/${activeInvestments.length + completedInvestments.length + killedInvestments.length}  

---

## Notes

- Update this ledger DAILY with actual spend and revenue
- Use this data to inform future board discussions
- Track everything - even small expenses matter
- Review monthly for patterns and insights
`;

  return md;
}

/**
 * Sync LEDGER.md data TO SQLite (parse markdown → update database)
 */
export async function syncLedgerToState(
  ledgerPath: string = CEO_LEDGER_PATH,
  workspaceDir?: string,
): Promise<void> {
  const parsed = await parseLedgerMarkdown(ledgerPath);

  const dbPath = workspaceDir
    ? resolveVentureDbPath({ workspaceDir })
    : path.join(os.homedir(), ".moltbot", "ventures", "default", "ops", "venture.sqlite");

  const store = openVentureStateStore({ dbPath });

  // Update capital
  store.setCapital("available", parsed.capital.available);
  store.setCapital("earned_lifetime", parsed.capital.earnedLifetime);
  store.setCapital("spent_lifetime", parsed.capital.spentLifetime);

  // Sync investments (create or update)
  for (const inv of [
    ...parsed.activeInvestments,
    ...parsed.completedInvestments,
    ...parsed.killedInvestments,
  ]) {
    const existing = store.getInvestment(inv.id);

    const status = inv.status.toLowerCase().includes("killed")
      ? "killed"
      : inv.status.toLowerCase().includes("complete")
        ? "completed"
        : "active";

    if (!existing) {
      store.createInvestment({
        id: inv.id,
        ventureName: inv.productName,
        category: inv.category,
        boardDecisionDate: Date.now(),
        budgetUsd: inv.budget,
        spentUsd: inv.spent,
        revenueUsd: inv.revenue,
        status,
        killThreshold: inv.killThreshold,
        daysRemaining: inv.daysRemaining,
        completedAt: status !== "active" ? Date.now() : null,
      });
    } else {
      store.updateInvestment(inv.id, {
        spentUsd: inv.spent,
        revenueUsd: inv.revenue,
        status,
        daysRemaining: inv.daysRemaining,
      });
    }
  }
}

/**
 * Sync SQLite data TO LEDGER.md (generate markdown from database)
 */
export async function syncStateToLedger(
  ledgerPath: string = CEO_LEDGER_PATH,
  workspaceDir?: string,
): Promise<void> {
  const markdown = await generateLedgerMarkdown(workspaceDir);
  await fs.writeFile(ledgerPath, markdown, "utf-8");
}

/**
 * Bidirectional sync - prefer SQLite as source of truth
 */
export async function bidirectionalSync(
  ledgerPath: string = CEO_LEDGER_PATH,
  workspaceDir?: string,
): Promise<void> {
  const dbPath = workspaceDir
    ? resolveVentureDbPath({ workspaceDir })
    : path.join(os.homedir(), ".moltbot", "ventures", "default", "ops", "venture.sqlite");

  const store = openVentureStateStore({ dbPath });

  // Check if SQLite has any data
  const investments = store.listInvestments();
  const hasData = investments.length > 0;

  if (!hasData) {
    // SQLite is empty, import from LEDGER.md if it exists
    try {
      await syncLedgerToState(ledgerPath, workspaceDir);
    } catch (_err) {
      // LEDGER.md doesn't exist or is empty, that's fine
    }
  } else {
    // SQLite has data, regenerate LEDGER.md from it
    await syncStateToLedger(ledgerPath, workspaceDir);
  }
}
