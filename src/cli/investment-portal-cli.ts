import { Command } from "commander";
import os from "node:os";
import path from "node:path";

import { runInvestmentPortal } from "../tui/investment-portal/portal-tui.js";

/**
 * Register the `moltbot portal` command for Investment Portal TUI
 */
export function registerInvestmentPortalCli(program: Command): void {
  program
    .command("portal")
    .alias("invest")
    .description("Launch the AgentForge Investment Portal TUI")
    .option("--venture <id>", "Jump to specific venture")
    .option("--workspace <dir>", "Venture workspace directory")
    .action(async (options) => {
      const workspaceDir =
        options.workspace || path.join(os.homedir(), ".moltbot", "ventures", "default");

      await runInvestmentPortal({
        workspaceDir,
        ventureId: options.venture,
      });
    });
}
