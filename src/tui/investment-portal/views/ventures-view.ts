import chalk from "chalk";
import { Container } from "@mariozechner/pi-tui";
import { theme } from "../../theme/theme.js";
import type { VentureInvestment, VentureStateStore } from "../../../agentforge/venture-state.js";

export class VenturesView extends Container {
  constructor(private store: VentureStateStore) {
    super();
  }

  render(width: number): string[] {
    const lines: string[] = [];

    lines.push("");
    lines.push(theme.bold("  📊 Ventures"));
    lines.push("");

    const investments = this.store.listInvestments();

    if (investments.length === 0) {
      lines.push(chalk.gray("    No ventures yet"));
      lines.push("");
      lines.push(chalk.gray("    Waiting for first board decision"));
      return lines;
    }

    lines.push(
      chalk.gray("  ID       Name                 Status      Budget    Spent     Revenue   ROI"),
    );
    lines.push(
      chalk.gray(
        "  ──────── ──────────────────── ─────────── ───────── ───────── ───────── ─────────",
      ),
    );

    for (const inv of investments) {
      const id = inv.id.padEnd(8);
      const name = inv.ventureName.slice(0, 20).padEnd(20);
      const status = this.formatStatus(inv.status).padEnd(11);
      const budget = ("$" + inv.budgetUsd).padEnd(9);
      const spent = ("$" + inv.spentUsd).padEnd(9);
      const revenue = ("$" + inv.revenueUsd).padEnd(9);
      const roi = this.formatROI(inv).padEnd(9);

      lines.push(`  ${id} ${name} ${status} ${budget} ${spent} ${revenue} ${roi}`);
    }

    lines.push("");
    lines.push(chalk.gray("  Active: " + this.store.listInvestments("active").length));
    lines.push(chalk.gray("  Completed: " + this.store.listInvestments("completed").length));
    lines.push(chalk.gray("  Killed: " + this.store.listInvestments("killed").length));

    return lines;
  }

  private formatStatus(status: string): string {
    if (status === "active") return chalk.green("Active");
    if (status === "completed") return chalk.blue("Completed");
    if (status === "killed") return chalk.red("Killed");
    return chalk.gray(status);
  }

  private formatROI(inv: VentureInvestment): string {
    if (inv.spentUsd === 0) return chalk.gray("N/A");
    const roi = ((inv.revenueUsd - inv.spentUsd) / inv.spentUsd) * 100;
    const formatted = Math.round(roi) + "%";

    if (roi >= 100) return chalk.green(formatted);
    if (roi >= 0) return chalk.yellow(formatted);
    return chalk.red(formatted);
  }
}
