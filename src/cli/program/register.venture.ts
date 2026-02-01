import type { Command } from "commander";
import { ventureListCommand } from "../../commands/venture-list.js";
import { ventureNewCommand } from "../../commands/venture-new.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerVentureCommands(program: Command) {
  const venture = program.command("venture").description("Venture management");

  venture
    .command("list")
    .description("List ventures (investments) from the venture store")
    .option("--status <status>", "Filter: active, completed, or killed")
    .option("--ids-only", "Print only venture IDs, one per line (for scripts)")
    .action(async (opts: { status?: string; idsOnly?: boolean }) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const status =
          opts.status === "active" || opts.status === "completed" || opts.status === "killed"
            ? opts.status
            : undefined;
        await ventureListCommand({
          status,
          idsOnly: opts.idsOnly,
        });
      });
    });

  venture
    .command("new")
    .description("Create a venture workspace and register a venture agent")
    .requiredOption("--id <ventureId>", "Venture id (letters/numbers/-/_)")
    .option("--name <ventureName>", "Display name (optional)")
    .action(async (opts: { id: string; name?: string }) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await ventureNewCommand({
          ventureId: opts.id,
          ventureName: opts.name,
          runtime: defaultRuntime,
        });
      });
    });
}
