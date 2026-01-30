import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadConfig, type MoltbotConfig, writeConfigFile } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";

const MOLTBOT_DIR = path.join(os.homedir(), ".moltbot");
const VENTURES_DIR = path.join(MOLTBOT_DIR, "ventures");

function normalizeVentureId(raw: string): string {
  const trimmed = raw.trim();
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 48);
  if (!normalized) throw new Error("ventureId required (letters/numbers/-/_).");
  return normalized;
}

function renderTemplate(value: string, vars: Record<string, string>): string {
  let out = value;
  for (const [key, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, v);
  }
  return out;
}

async function copyTemplateDir(params: {
  srcDir: string;
  destDir: string;
  vars: Record<string, string>;
}) {
  await fs.mkdir(params.destDir, { recursive: true });
  const entries = await fs.readdir(params.srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(params.srcDir, entry.name);
    const destPath = path.join(params.destDir, entry.name);
    if (entry.isDirectory()) {
      await copyTemplateDir({ srcDir: srcPath, destDir: destPath, vars: params.vars });
    } else {
      const content = await fs.readFile(srcPath, "utf8");
      await fs.writeFile(destPath, renderTemplate(content, params.vars), "utf8");
    }
  }
}

export async function ventureNewCommand(params: {
  ventureId: string;
  ventureName?: string;
  runtime?: RuntimeEnv;
}): Promise<{ ventureId: string; agentId: string; workspaceDir: string }> {
  const runtime = params.runtime ?? defaultRuntime;
  const ventureId = normalizeVentureId(params.ventureId);
  const ventureName = (params.ventureName ?? ventureId).trim();
  const createdAt = new Date().toISOString();
  const workspaceDir = path.join(VENTURES_DIR, ventureId);

  await fs.mkdir(workspaceDir, { recursive: true });
  await fs.mkdir(path.join(workspaceDir, "assets"), { recursive: true });
  await fs.mkdir(path.join(workspaceDir, "ops"), { recursive: true });
  await fs.mkdir(path.join(workspaceDir, "artifacts"), { recursive: true });

  const repoRoot = process.cwd();
  const templateDir = path.join(repoRoot, "templates", "venture-workspace");
  await copyTemplateDir({
    srcDir: templateDir,
    destDir: workspaceDir,
    vars: { ventureId, ventureName, createdAt },
  });

  const cfg = loadConfig();
  const agentId = `venture-${ventureId}`;
  const existing = cfg.agents?.list ?? [];
  const already = existing.some((a) => a.id === agentId);
  const agentEntry = {
    id: agentId,
    workspace: workspaceDir,
    tools: { exec: { security: "full" as const, ask: "off" as const } },
    sandbox: { mode: "off" as const },
    subagents: { allowAgents: ["*"] as string[] },
  };
  const next: MoltbotConfig = {
    ...cfg,
    agents: {
      ...cfg.agents,
      list: already ? existing : [...existing, agentEntry],
    },
  };
  await writeConfigFile(next);

  runtime.log(`✓ Created venture workspace: ${workspaceDir}`);
  runtime.log(`✓ Registered venture agent: ${agentId}`);

  return { ventureId, agentId, workspaceDir };
}
