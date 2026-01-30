import type { Command } from "commander";
import { ventureTickCommand } from "../../commands/venture-runloop.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerVentureRunloopCommands(program: Command) {
  program
    .command("venture:tick")
    .description("Run one venture runloop tick (timeouts + KPI report + ping)")
    .requiredOption("--venture <ventureId>", "Venture id (without venture- prefix)")
    .option(
      "--coordinator <sessionKey>",
      "Coordinator session key (default: agent:coordinator:main)",
    )
    .option("--timeout-minutes <n>", "Subagent timeout minutes (default: 120)")
    .action(async (opts: { venture: string; coordinator?: string; timeoutMinutes?: string }) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const timeout =
          typeof opts.timeoutMinutes === "string" && opts.timeoutMinutes.trim()
            ? Number.parseInt(opts.timeoutMinutes, 10)
            : undefined;
        await ventureTickCommand({
          ventureId: opts.venture,
          coordinatorSessionKey: opts.coordinator,
          subagentTimeoutMinutes: timeout,
        });
      });
    });
}
