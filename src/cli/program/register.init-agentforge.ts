import type { Command } from "commander";
import { initAgentforgeCommand } from "../../commands/init-agentforge.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerInitAgentforgeCommand(program: Command) {
  program
    .command("init:agentforge")
    .description("Initialize AgentForge Board + CEO system (turnkey setup)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/agentforge", "docs.molt.bot/agentforge")}\n`,
    )
    .action(async () => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await initAgentforgeCommand(defaultRuntime);
      });
    });
}
