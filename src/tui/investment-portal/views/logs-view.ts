import chalk from "chalk";
import { Container } from "@mariozechner/pi-tui";
import { theme } from "../../theme/theme.js";
import type { VentureStateStore } from "../../../agentforge/venture-state.js";

export class LogsView extends Container {
  constructor(private store: VentureStateStore) {
    super();
  }

  render(width: number): string[] {
    const lines: string[] = [];

    lines.push("");
    lines.push(theme.bold("  📜 Event Stream"));
    lines.push("");

    const events = this.store.listEvents(20);

    if (events.length === 0) {
      lines.push(chalk.gray("    No events yet"));
      return lines;
    }

    for (const event of events) {
      const timestamp = new Date(event.createdAt).toISOString().slice(11, 19);
      const type = event.type.padEnd(30);
      lines.push(`  ${chalk.gray(timestamp)} ${chalk.cyan(type)}`);
    }

    lines.push("");
    lines.push(chalk.gray("  Showing last 20 events"));

    return lines;
  }
}
