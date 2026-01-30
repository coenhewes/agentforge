import chalk from "chalk";
import { Container } from "@mariozechner/pi-tui";
import { loadConfig } from "../../../config/config.js";
import { theme } from "../../theme/theme.js";

export class SettingsView extends Container {
  constructor() {
    super();
  }

  render(width: number): string[] {
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

    const spendLimit = config.humanInterface?.agentforge?.capitalManagement?.allowedSpendUsd ?? 500;
    lines.push(`    Spending Limit:     ${chalk.yellow("$" + spendLimit)}`);

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
