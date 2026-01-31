import chalk from "chalk";
import { Container, Text } from "@mariozechner/pi-tui";
import { theme } from "../../theme/theme.js";
import type { VentureStateStore } from "../../../agentforge/venture-state.js";

export class CapitalView extends Container {
  constructor(private store: VentureStateStore) {
    super();
  }

  render(_width: number): string[] {
    const lines: string[] = [];

    lines.push(theme.bold("\n  💰 Capital Status"));
    lines.push("");
    lines.push(
      `    ${chalk.gray("Available:")}     ${chalk.green("$" + this.store.getCapital("available"))}`,
    );
    lines.push(
      `    ${chalk.gray("Earned:")}        ${chalk.green("$" + this.store.getCapital("earned_lifetime"))}`,
    );
    lines.push(
      `    ${chalk.gray("Spent:")}         ${chalk.yellow("$" + this.store.getCapital("spent_lifetime"))}`,
    );
    const net = this.store.getCapital("earned_lifetime") - this.store.getCapital("spent_lifetime");
    lines.push(
      `    ${chalk.gray("Net Position:")}  ${net >= 0 ? chalk.green("$" + net) : chalk.red("$" + net)}`,
    );

    lines.push("");
    lines.push(theme.bold("  💳 Payment Cards"));
    lines.push("");

    const cards = this.store.listPaymentCards();

    if (cards.length === 0) {
      lines.push(chalk.gray("    No payment cards configured"));
      lines.push(chalk.gray("    Press 'c' in settings to add a card"));
    } else {
      for (const card of cards) {
        const masked = `**** **** **** ${card.cardLast4}`;
        const status = card.isActive ? chalk.green("[Active]") : chalk.gray("[Inactive]");
        lines.push(`    ${masked} ${status} - Limit: $${card.cardLimitUsd}`);
        lines.push(`    ${chalk.gray(card.cardName)}`);
      }
    }

    lines.push("");
    lines.push(theme.bold("  ⚡ Actions"));
    lines.push("");
    lines.push(chalk.gray("    Navigate to Settings (Tab or press 5) to manage cards and capital"));

    return lines;
  }
}
