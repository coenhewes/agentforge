import { describe, expect, it } from "vitest";
import { resolveImplicitProviders } from "./models-config.providers.js";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Ollama provider", () => {
  it("should not include ollama when no API key and no config reference", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "moltbot-ollama-test-"));
    const providers = await resolveImplicitProviders({ agentDir });

    expect(providers?.ollama).toBeUndefined();
  });

  it("should include ollama when config default model is ollama/* (no API key needed)", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "clawd-test-"));
    const config = {
      agents: {
        defaults: {
          model: { primary: "ollama/qwen2.5:14b", fallbacks: [] as string[] },
        },
      },
    } as import("../config/config.js").MoltbotConfig;
    const providers = await resolveImplicitProviders({ agentDir, config });

    expect(providers?.ollama).toBeDefined();
    expect(providers?.ollama?.baseUrl).toBe("http://127.0.0.1:11434/v1");
    // apiKey is filled by normalizeProviders; not set here in implicit
    expect(providers?.ollama?.models).toBeDefined();
  });
});
