import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { type MoltbotConfig, loadConfig, writeConfigFile } from "../config/config.js";
import { formatConfigPath, logConfigUpdated } from "../config/logging.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { shortenHomePath } from "../utils.js";

const MOLTBOT_DIR = path.join(os.homedir(), ".moltbot");
const AGENTS_DIR = path.join(MOLTBOT_DIR, "agents");

/**
 * Initialize AgentForge: Copy board + coordinator + CEO workspaces, register agents, set up config
 */
export async function initAgentforgeCommand(runtime: RuntimeEnv = defaultRuntime): Promise<void> {
  runtime.log("🏢 Initializing AgentForge Board + Coordinator + CEO System...\n");

  // 1. Copy agent workspaces
  runtime.log("📁 Copying agent workspaces...");
  await copyAgentWorkspaces(runtime);

  // 2. Update config
  runtime.log("\n⚙️  Updating configuration...");
  await updateConfig(runtime);

  // 3. Create cron jobs
  runtime.log("\n⏰ Setting up cron jobs...");
  await setupCronJobs(runtime);

  runtime.log("\n✅ AgentForge initialized successfully!\n");
  runtime.log("📋 Next steps:");
  runtime.log(
    "  1. Set AI provider: add your Gemini API key to config (see deployment guide Step 5a), or run: node dist/entry.js onboard",
  );
  runtime.log("  2. 🔑 Configure GitHub access: node moltbot.mjs setup:github (CRITICAL!)");
  runtime.log("  3. 🚀 Configure Vercel deployment: node moltbot.mjs setup:vercel (CRITICAL!)");
  runtime.log("  4. Start gateway: node moltbot.mjs gateway run --port 18789");
  runtime.log("  5. Trigger first board meeting: ./scripts/board-meeting.sh");
  runtime.log("  6. Monitor coordinator: node moltbot.mjs tui --session agent:coordinator:main");
  runtime.log("  7. Trigger CEO execution: ./scripts/ceo-implement.sh");
  runtime.log("  8. Install cron for automation (see ~/.moltbot/agentforge-cron.txt)");
  runtime.log("\n📚 All agents have MEMORY.md files and will learn/improve over time");
  runtime.log("🤝 Agents can request human help via request_human tool");
  runtime.log("👁️  Monitor requests: node moltbot.mjs tui --session agent:human:main");
  runtime.log("🔑 GitHub + Vercel required for agents to build & deploy real products!");
  runtime.log("\n💡 Full guide: README_AGENTFORGE.md or docs/start/ceo-quickstart.md\n");
}

/**
 * Copy agent workspaces from repo to ~/.moltbot/agents/
 */
async function copyAgentWorkspaces(runtime: RuntimeEnv): Promise<void> {
  const repoRoot = process.cwd();
  const sourceAgentsDir = path.join(repoRoot, "agents");

  // Check if source exists
  try {
    await fs.access(sourceAgentsDir);
  } catch {
    throw new Error(
      `Source agents directory not found: ${sourceAgentsDir}\n` +
        "Make sure you're running this from the agentforge repository root.",
    );
  }

  // Create target directory
  await fs.mkdir(AGENTS_DIR, { recursive: true });

  // Copy board members
  const boardMembers = ["cfo", "cto", "cmo", "coo", "analyst", "risk", "innovation", "pr"];

  // Do not overwrite LEDGER.md or MEMORY.md if they already exist (preserve project data and agent memory)
  const preserveIfExists = ["LEDGER.md", "MEMORY.md"];

  for (const member of boardMembers) {
    const sourcePath = path.join(sourceAgentsDir, "board", member);
    const targetPath = path.join(AGENTS_DIR, "board", member);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await copyDirectory(sourcePath, targetPath, preserveIfExists);

    runtime.log(`  ✓ Copied board/${member}`);
  }

  // Copy CEO
  const ceoSource = path.join(sourceAgentsDir, "ceo");
  const ceoTarget = path.join(AGENTS_DIR, "ceo");

  await copyDirectory(ceoSource, ceoTarget, preserveIfExists);
  runtime.log(`  ✓ Copied ceo`);

  // Copy Coordinator
  const coordinatorSource = path.join(sourceAgentsDir, "coordinator");
  const coordinatorTarget = path.join(AGENTS_DIR, "coordinator");

  await copyDirectory(coordinatorSource, coordinatorTarget, preserveIfExists);
  runtime.log(`  ✓ Copied coordinator`);
}

/**
 * Recursively copy directory. If preserveIfExists is set, skip copying a file when the destination
 * already exists and the filename is in the list (used to keep LEDGER.md and MEMORY.md on re-init).
 */
async function copyDirectory(
  src: string,
  dest: string,
  preserveIfExists: string[] = [],
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, preserveIfExists);
    } else {
      const shouldPreserve =
        preserveIfExists.length > 0 &&
        preserveIfExists.includes(entry.name) &&
        (await fs
          .access(destPath)
          .then(() => true)
          .catch(() => false));
      if (!shouldPreserve) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Update moltbot.json with agent config
 */
async function updateConfig(runtime: RuntimeEnv): Promise<void> {
  const cfg = loadConfig();

  const agentforgeTools = {
    exec: {
      // Belt-and-suspenders: also set per-agent defaults so AgentForge continues
      // to work even if global tools.exec is tightened later.
      security: "full" as const,
      ask: "off" as const,
    },
  };
  const agentforgeSandbox = { mode: "off" as const };

  // All agents and subagents use gpt-5-mini.
  const gpt5Mini = "openai/gpt-5-mini";
  const nanoBananaPro = "google/gemini-3-pro-image-preview";

  const next: MoltbotConfig = {
    ...cfg,
    gateway: {
      ...cfg.gateway,
      mode: "local",
    },
    tools: {
      ...cfg.tools,
      exec: {
        ...cfg.tools?.exec,
        // AgentForge is designed to run headless (cron) without human approvals.
        security: "full",
        ask: "off",
      },
      agentToAgent: {
        ...cfg.tools?.agentToAgent,
        enabled: true,
      },
    },
    agents: {
      ...cfg.agents,
      list: [
        // Board members (all gpt-5-mini)
        {
          id: "cfo",
          workspace: path.join(AGENTS_DIR, "board", "cfo"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "cto",
          workspace: path.join(AGENTS_DIR, "board", "cto"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "cmo",
          workspace: path.join(AGENTS_DIR, "board", "cmo"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "coo",
          workspace: path.join(AGENTS_DIR, "board", "coo"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "analyst",
          workspace: path.join(AGENTS_DIR, "board", "analyst"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "risk",
          workspace: path.join(AGENTS_DIR, "board", "risk"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "innovation",
          workspace: path.join(AGENTS_DIR, "board", "innovation"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "pr",
          workspace: path.join(AGENTS_DIR, "board", "pr"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "coordinator",
          workspace: path.join(AGENTS_DIR, "coordinator"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
        },
        {
          id: "ceo",
          workspace: path.join(AGENTS_DIR, "ceo"),
          model: { primary: gpt5Mini, fallbacks: [] },
          tools: agentforgeTools,
          sandbox: agentforgeSandbox,
          subagents: { allowAgents: ["*"] },
        },
      ],
      defaults: {
        ...cfg.agents?.defaults,
        model: {
          primary: gpt5Mini,
          fallbacks: [],
        },
        imageModel: {
          primary: nanoBananaPro,
          fallbacks: [],
        },
        subagents: {
          ...cfg.agents?.defaults?.subagents,
          model: gpt5Mini,
        },
        budget: {
          daily: 50,
          monthly: 500,
          alertAt: 0.8,
          action: "warn",
          ...cfg.agents?.defaults?.budget,
        },
      },
    },
  };

  await writeConfigFile(next);
  logConfigUpdated(runtime, {
    suffix: "(registered 10 agents)",
  });

  runtime.log(`  ✓ Config: ${formatConfigPath()}`);
  runtime.log(`  ✓ Registered: 8 board members + coordinator + CEO`);
  runtime.log(
    `  ✓ All agents: openai/gpt-5-mini (default + board + coordinator + CEO + subagents)`,
  );
  runtime.log(`  ✓ Gateway mode: local`);
  runtime.log(`  ✓ Agent-to-agent messaging: enabled`);
  runtime.log(`  ✓ Budget: $50/day, $500/month`);
}

/**
 * Set up cron jobs for board meetings and CEO execution
 */
async function setupCronJobs(runtime: RuntimeEnv): Promise<void> {
  const repoRoot = process.cwd();
  const cronScript = `
# AgentForge - Daily Board Meeting (9am)
0 9 * * * cd ${repoRoot} && ${repoRoot}/scripts/board-meeting.sh >> /tmp/agentforge-board.log 2>&1

# AgentForge - CEO Implementation (10am, after board meeting)
0 10 * * * cd ${repoRoot} && ${repoRoot}/scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1

# AgentForge - CEO Heartbeat (every 30 min) - continuous oversight, workers, venture tick, LEDGER sync
*/30 * * * * cd ${repoRoot} && ${repoRoot}/scripts/ceo-heartbeat.sh >> /tmp/agentforge-heartbeat.log 2>&1

# AgentForge - Weekly Reflection (Sundays at 10pm)
0 22 * * 0 cd ${repoRoot} && ${repoRoot}/scripts/weekly-reflection.sh >> /tmp/agentforge-reflection.log 2>&1

# AgentForge - Monthly Meta-Learning (1st of month at 11pm)
0 23 1 * * cd ${repoRoot} && ${repoRoot}/scripts/monthly-learning.sh >> /tmp/agentforge-learning.log 2>&1
`.trim();

  const cronFile = path.join(MOLTBOT_DIR, "agentforge-cron.txt");
  await fs.writeFile(cronFile, cronScript + "\n");

  runtime.log(`  ✓ Cron template: ${shortenHomePath(cronFile)}`);
  runtime.log("\n  To activate, add to your crontab:");
  runtime.log(`    crontab -e`);
  runtime.log(`    # Then paste these lines:`);
  runtime.log(`    ${cronScript.split("\n").join("\n    ")}`);
  runtime.log("\n  Or install directly:");
  runtime.log(`    (crontab -l 2>/dev/null; cat ${shortenHomePath(cronFile)}) | crontab -`);
}
