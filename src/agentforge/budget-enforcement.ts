import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Budget enforcement for venture capital management
 * Ensures CEO cannot spawn workers or spend beyond available capital
 */

export interface CapitalState {
  available: number;
  earnedLifetime: number;
  spentLifetime: number;
  netPosition: number;
}

/**
 * Read current capital state from CEO's LEDGER.md
 */
export async function getCurrentCapital(): Promise<CapitalState> {
  const ledgerPath = path.join(os.homedir(), ".moltbot", "agents", "ceo", "LEDGER.md");

  try {
    const content = await fs.readFile(ledgerPath, "utf-8");

    // Parse capital status section
    const availableMatch = content.match(/\*\*Current Capital Available:\*\*\s*\$(\d+)/);
    const earnedMatch = content.match(/\*\*Total Earned \(Lifetime\):\*\*\s*\$(\d+)/);
    const spentMatch = content.match(/\*\*Total Spent \(Lifetime\):\*\*\s*\$(\d+)/);
    const netMatch = content.match(/\*\*Net Position:\*\*\s*\$?(-?\d+)/);

    return {
      available: availableMatch ? Number.parseInt(availableMatch[1], 10) : 0,
      earnedLifetime: earnedMatch ? Number.parseInt(earnedMatch[1], 10) : 0,
      spentLifetime: spentMatch ? Number.parseInt(spentMatch[1], 10) : 0,
      netPosition: netMatch ? Number.parseInt(netMatch[1], 10) : 0,
    };
  } catch (err) {
    // If LEDGER.md doesn't exist or can't be read, assume $0
    return {
      available: 0,
      earnedLifetime: 0,
      spentLifetime: 0,
      netPosition: 0,
    };
  }
}

/**
 * Check if a venture budget is within available capital
 */
export async function canAffordVenture(ventureBudget: number): Promise<{
  canAfford: boolean;
  available: number;
  shortfall: number;
  message: string;
}> {
  const capital = await getCurrentCapital();
  const canAfford = ventureBudget <= capital.available;
  const shortfall = canAfford ? 0 : ventureBudget - capital.available;

  let message: string;
  if (canAfford) {
    message = `Budget approved: $${ventureBudget} venture fits within $${capital.available} available capital`;
  } else {
    message = `BLOCKED: Board approved $${ventureBudget} but only $${capital.available} available. Shortfall: $${shortfall}. Options: 1) Request board to approve $0-cost bootstrap version, 2) Request human to add capital, 3) Wait for revenue from existing ventures`;
  }

  return {
    canAfford,
    available: capital.available,
    shortfall,
    message,
  };
}

/**
 * Update available capital after spending or earning
 */
export async function updateCapital(params: {
  spent?: number;
  earned?: number;
  reason: string;
}): Promise<CapitalState> {
  const ledgerPath = path.join(os.homedir(), ".moltbot", "agents", "ceo", "LEDGER.md");
  const current = await getCurrentCapital();

  const newAvailable = current.available + (params.earned || 0) - (params.spent || 0);
  const newSpent = current.spentLifetime + (params.spent || 0);
  const newEarned = current.earnedLifetime + (params.earned || 0);
  const newNet = newEarned - newSpent;

  try {
    let content = await fs.readFile(ledgerPath, "utf-8");

    // Update capital status section
    content = content.replace(
      /\*\*Current Capital Available:\*\*\s*\$\d+/,
      `**Current Capital Available:** $${newAvailable}`,
    );
    content = content.replace(
      /\*\*Total Earned \(Lifetime\):\*\*\s*\$\d+/,
      `**Total Earned (Lifetime):** $${newEarned}`,
    );
    content = content.replace(
      /\*\*Total Spent \(Lifetime\):\*\*\s*\$\d+/,
      `**Total Spent (Lifetime):** $${newSpent}`,
    );
    content = content.replace(/\*\*Net Position:\*\*\s*\$?-?\d+/, `**Net Position:** $${newNet}`);

    await fs.writeFile(ledgerPath, content, "utf-8");

    return {
      available: newAvailable,
      earnedLifetime: newEarned,
      spentLifetime: newSpent,
      netPosition: newNet,
    };
  } catch (err) {
    throw new Error(
      `Failed to update capital: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Create a human request for capital addition
 */
export function createCapitalRequest(shortfall: number, ventureName: string): string {
  return `request_human \\
  --priority high \\
  --category access \\
  --title "Need capital for ${ventureName}" \\
  --description "Board approved ${ventureName} with budget requiring $${shortfall} more than current capital. Need human to add funds via Investment Portal or approve $0-cost bootstrap version." \\
  --suggestedAction "1) Open Investment Portal: node moltbot.mjs portal, then add capital, OR 2) Approve $0-cost version of ${ventureName}" \\
  --timeout "12h"`;
}

/**
 * Validate and enforce budget before spawning workers
 * Throws an error if budget cannot be met
 */
export async function enforceBudget(ventureBudget: number, ventureName: string): Promise<void> {
  const check = await canAffordVenture(ventureBudget);

  if (!check.canAfford) {
    throw new Error(
      `Budget enforcement: ${check.message}\n\n` +
        `To proceed, you must:\n` +
        `1. Request human to add capital: ${createCapitalRequest(check.shortfall, ventureName)}\n` +
        `2. OR request board to approve $0-cost bootstrap version\n` +
        `3. OR wait for revenue from existing ventures to accumulate`,
    );
  }
}
