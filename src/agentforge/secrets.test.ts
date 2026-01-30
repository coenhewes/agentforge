import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { withEnvOverride, withTempHome } from "../config/test-helpers.js";
import { resolveSecret } from "./secrets.js";

describe("agentforge secrets", () => {
  it("resolves from env.vars when env is missing", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify({ env: { vars: { DEMO_KEY: "config-value" } } }, null, 2),
        "utf-8",
      );

      await withEnvOverride({ DEMO_KEY: undefined }, async () => {
        const res = await resolveSecret({ key: "DEMO_KEY" });
        expect(res.value).toBe("config-value");
        expect(res.source).toBe("config.env.vars");
      });
    });
  });

  it("prefers process.env over config", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify({ env: { vars: { DEMO_KEY: "config-value" } } }, null, 2),
        "utf-8",
      );

      await withEnvOverride({ DEMO_KEY: "env-value" }, async () => {
        const res = await resolveSecret({ key: "DEMO_KEY" });
        expect(res.value).toBe("env-value");
        expect(res.source).toBe("process.env");
      });
    });
  });
});
