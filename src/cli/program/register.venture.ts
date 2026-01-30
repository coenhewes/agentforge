import type { Command } from "commander";
import { ventureNewCommand } from "../../commands/venture-new.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerVentureCommands(program: Command) {
  const venture = program.command("venture").description("Venture management");

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
