import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { loadConfig, type MoltbotConfig, writeConfigFile } from "../config/config.js";

const execFileAsync = promisify(execFile);

export type SecretSource = "process.env" | "config.env.vars" | "1password";

export type ResolveSecretResult = {
  key: string;
  value: string;
  source: SecretSource;
};

function looksLikeOpRef(value: string): boolean {
  return value.trim().startsWith("op://");
}

function redactSecretKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 6) return "***";
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

async function opRead(ref: string): Promise<string> {
  // Do not log the ref; treat it as sensitive.
  try {
    const { stdout } = await execFileAsync("op", ["read", ref], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    return String(stdout ?? "").trimEnd();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`1Password read failed. Ensure op is installed and signed in. Details: ${msg}`);
  }
}

export async function resolveSecret(params: {
  key: string;
  cfg?: MoltbotConfig;
}): Promise<ResolveSecretResult> {
  const key = params.key.trim();
  if (!key) throw new Error("Secret key is required.");

  const fromEnv = process.env[key];
  if (fromEnv && fromEnv.trim()) {
    return { key, value: fromEnv, source: "process.env" };
  }

  const cfg = params.cfg ?? loadConfig();
  const raw = cfg.env?.vars?.[key];
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    throw new Error(`Missing secret "${redactSecretKey(key)}". Set env.vars.${key} in config.`);
  }

  if (looksLikeOpRef(raw)) {
    const value = await opRead(raw.trim());
    if (!value.trim()) {
      throw new Error(`1Password secret resolved empty for "${redactSecretKey(key)}".`);
    }
    return { key, value, source: "1password" };
  }

  return { key, value: raw, source: "config.env.vars" };
}

export async function setConfigEnvVarSecret(params: { key: string; value: string }): Promise<void> {
  const key = params.key.trim();
  if (!key) throw new Error("Secret key is required.");
  const value = params.value;
  if (!value || !String(value).trim()) {
    throw new Error(`Secret value is required for "${redactSecretKey(key)}".`);
  }

  const cfg = loadConfig();
  const next: MoltbotConfig = {
    ...cfg,
    env: {
      ...cfg.env,
      vars: {
        ...cfg.env?.vars,
        [key]: String(value),
      },
    },
  };
  await writeConfigFile(next);
}
