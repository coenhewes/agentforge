import chalk from "chalk";
import { Container } from "@mariozechner/pi-tui";
import { loadConfig } from "../../../config/config.js";
import type { VentureStateStore } from "../../../agentforge/venture-state.js";
import { theme } from "../../theme/theme.js";

export class SettingsView extends Container {
  constructor(private store?: VentureStateStore) {
    super();
  }

  render(_width: number): string[] {
    const lines: string[] = [];
    const config = loadConfig();

    lines.push("");
    lines.push(theme.bold("  ⚙️  Settings"));
    lines.push("");

    lines.push(chalk.gray("  System:"));
    const heartbeatEnabled = config.humanInterface?.agentforge?.heartbeat?.enabled ?? true;
    lines.push(
      `    CEO Heartbeat:      ${heartbeatEnabled ? chalk.green("Enabled") : chalk.red("Disabled")}`,
    );

    const runloopEnabled = config.humanInterface?.agentforge?.ventureRunloop?.enabled ?? true;
    lines.push(
      `    Venture Runloop:    ${runloopEnabled ? chalk.green("Enabled") : chalk.red("Disabled")}`,
    );

    lines.push("");
    lines.push(chalk.gray("  Capital:"));
    const capEnabled = config.humanInterface?.agentforge?.capitalManagement?.enabled ?? true;
    lines.push(
      `    Budget Enforcement: ${capEnabled ? chalk.green("Enabled") : chalk.red("Disabled")}`,
    );

    // Show spending limit from active card when stored; otherwise from config.
    const configLimit = config.humanInterface?.agentforge?.capitalManagement?.allowedSpendUsd;
    const activeCard = this.store?.getActivePaymentCard?.() ?? null;
    const spendLimit =
      activeCard != null
        ? activeCard.cardLimitUsd
        : configLimit !== undefined && configLimit !== null
          ? configLimit
          : 500;
    lines.push(`    Spending Limit:     ${chalk.yellow("$" + spendLimit)}`);
    if (this.store) {
      const cards = this.store.listPaymentCards();
      if (cards.length > 0) {
        lines.push(
          chalk.gray(
            `    Payment cards:      ${cards.length} stored (•••• ${cards.map((c) => c.cardLast4).join(", ")})`,
          ),
        );
        lines.push(chalk.gray("    Press 'c' to add, 'r' to remove the active card"));
      } else {
        lines.push(chalk.gray("    Press 'c' to add a payment card"));
      }
    } else {
      lines.push(chalk.gray("    Press 'c' to add a payment card"));
    }

    lines.push("");
    lines.push(chalk.gray("  Stripe:"));
    const stripeEnabled = config.humanInterface?.agentforge?.stripe?.enabled ?? false;
    lines.push(
      `    Integration:        ${stripeEnabled ? chalk.green("Enabled") : chalk.gray("Disabled")}`,
    );

    lines.push("");
    lines.push(chalk.gray("  (Edit settings via: node moltbot.mjs config set ...)"));

    return lines;
  }
}
