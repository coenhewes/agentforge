import chalk from "chalk";
import { Container } from "@mariozechner/pi-tui";
import { theme } from "../../theme/theme.js";

export class WorkersView extends Container {
  constructor() {
    super();
  }

  render(_width: number): string[] {
    const lines: string[] = [];

    lines.push("");
    lines.push(theme.bold("  👷 Workers"));
    lines.push("");
    lines.push(chalk.gray("    No workers spawned yet"));
    lines.push("");
    lines.push(chalk.gray("    Workers will appear here when CEO spawns them"));
    lines.push(chalk.gray("    Check back after board meeting and CEO execution"));

    return lines;
  }
}
