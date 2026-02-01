import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadDotEnv } from "./dotenv.js";

async function writeEnvFile(filePath: string, contents: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

describe("loadDotEnv", () => {
  it("loads ~/.openclaw/.env as fallback without overriding CWD .env", async () => {
    const prevEnv = { ...process.env };
    const prevCwd = process.cwd();

    const base = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-dotenv-test-"));
    const cwdDir = path.join(base, "cwd");
    const stateDir = path.join(base, "state");

    process.env.OPENCLAW_STATE_DIR = stateDir;

    await writeEnvFile(path.join(stateDir, ".env"), "FOO=from-global\nBAR=1\n");
    await writeEnvFile(path.join(cwdDir, ".env"), "FOO=from-cwd\n");

    process.chdir(cwdDir);
    delete process.env.FOO;
    delete process.env.BAR;

    loadDotEnv({ quiet: true });

    expect(process.env.FOO).toBe("from-cwd");
    expect(process.env.BAR).toBe("1");

    process.chdir(prevCwd);
    for (const key of Object.keys(process.env)) {
      if (!(key in prevEnv)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("does not override an already-set env var from the shell", async () => {
    const prevEnv = { ...process.env };
    const prevCwd = process.cwd();

    const base = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-dotenv-test-"));
    const cwdDir = path.join(base, "cwd");
    const stateDir = path.join(base, "state");

    process.env.OPENCLAW_STATE_DIR = stateDir;
    process.env.FOO = "from-shell";

    await writeEnvFile(path.join(stateDir, ".env"), "FOO=from-global\n");
    await writeEnvFile(path.join(cwdDir, ".env"), "FOO=from-cwd\n");

    process.chdir(cwdDir);

    loadDotEnv({ quiet: true });

    expect(process.env.FOO).toBe("from-shell");

    process.chdir(prevCwd);
    for (const key of Object.keys(process.env)) {
      if (!(key in prevEnv)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("loads ~/.agentforge-env (or AGENTFORGE_ENV) without overriding existing vars", async () => {
    const prevEnv = { ...process.env };
    const prevCwd = process.cwd();
    const prevAgentforgeEnv = process.env.AGENTFORGE_ENV;

    const base = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-dotenv-test-"));
    const homeDir = path.join(base, "home");
    const agentforgeEnvFile = path.join(homeDir, ".agentforge-env");

    process.env.HOME = homeDir;
    process.env.OPENCLAW_STATE_DIR = path.join(base, "state");
    await fs.mkdir(path.join(base, "state"), { recursive: true });
    await writeEnvFile(agentforgeEnvFile, "GITHUB_TOKEN=from-agentforge-env\nBAZ=2\n");

    delete process.env.GITHUB_TOKEN;
    delete process.env.BAZ;
    process.env.BAZ = "from-shell";

    loadDotEnv({ quiet: true });

    expect(process.env.GITHUB_TOKEN).toBe("from-agentforge-env");
    expect(process.env.BAZ).toBe("from-shell"); // already set, not overridden

    process.env.HOME = prevEnv.HOME;
    process.env.OPENCLAW_STATE_DIR = prevEnv.OPENCLAW_STATE_DIR;
    if (prevAgentforgeEnv !== undefined) process.env.AGENTFORGE_ENV = prevAgentforgeEnv;
    else delete process.env.AGENTFORGE_ENV;
    for (const key of Object.keys(process.env)) {
      if (!(key in prevEnv)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    process.chdir(prevCwd);
  });
});
