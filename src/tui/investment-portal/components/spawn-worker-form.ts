import chalk from "chalk";
import { Container } from "@mariozechner/pi-tui";
import { theme } from "../../theme/theme.js";

/**
 * Simple spawn worker form component (stub for now)
 */
export class SpawnWorkerForm extends Container {
  constructor() {
    super();
  }

  render(_width: number): string[] {
    const lines: string[] = [];

    lines.push("");
    lines.push(theme.bold("  🚀 Spawn Worker"));
    lines.push("");
    lines.push(chalk.gray("    (Form implementation coming soon)"));
    lines.push("");
    lines.push(chalk.gray("    Use CEO agent to spawn workers for now"));

    return lines;
  }
}
