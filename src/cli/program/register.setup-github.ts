import type { Command } from "commander";
import { setupGithubCommand } from "../../commands/setup-github.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerSetupGithubCommand(program: Command) {
  program
    .command("setup:github")
    .description("Configure GitHub access for AgentForge agents (interactive)")
    .action(async () => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await setupGithubCommand(defaultRuntime);
      });
    });
}
