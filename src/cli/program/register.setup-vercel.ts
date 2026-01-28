import type { Command } from "commander";
import { setupVercelCommand } from "../../commands/setup-vercel.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerSetupVercelCommand(program: Command) {
  program
    .command("setup:vercel")
    .description("Configure Vercel deployment access for AgentForge agents (interactive)")
    .action(async () => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await setupVercelCommand(defaultRuntime);
      });
    });
}
