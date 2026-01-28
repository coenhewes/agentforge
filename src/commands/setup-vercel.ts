import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { password, isCancel } from "@clack/prompts";

import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { stylePromptMessage } from "../terminal/prompt-style.js";

const execAsync = promisify(exec);

/**
 * Interactive Vercel setup for AgentForge agents
 * Installs Vercel CLI and configures authentication
 */
export async function setupVercelCommand(runtime: RuntimeEnv = defaultRuntime): Promise<void> {
  runtime.log("🚀 Vercel Setup for AgentForge\n");

  runtime.log("Why Vercel access is needed:");
  runtime.log("  - Agents need to deploy products they build");
  runtime.log("  - Automatic deployments from GitHub");
  runtime.log("  - Production-ready hosting for SaaS apps");
  runtime.log("  - Free tier includes 100GB bandwidth/month\n");

  // Check if Vercel CLI is installed
  runtime.log("📦 Checking Vercel CLI...");
  const hasVercel = await checkVercelInstalled();

  if (!hasVercel) {
    runtime.log("  ⚠️  Vercel CLI not found");
    runtime.log("\n📥 Installing Vercel CLI globally...");
    try {
      await execAsync("npm install -g vercel");
      runtime.log("  ✓ Vercel CLI installed");
    } catch (error) {
      const message = String(error);

      // Common case on VPS: global npm installs require sudo/root
      if (message.includes("EACCES") || message.toLowerCase().includes("permission denied")) {
        runtime.log("  ⚠️  Failed to install Vercel CLI due to permissions (EACCES).");
        runtime.log("     Global npm installs usually require sudo on this system.");
        runtime.log("     To install manually, run on your VPS shell:");
        runtime.log("       sudo npm install -g vercel");
        runtime.log("");
        runtime.log(
          "     Continuing setup without a globally installed Vercel CLI; API checks will still work,",
        );
        runtime.log(
          "     and you can run the command above later to enable `vercel` from the CLI.\n",
        );
      } else {
        throw new Error(`Failed to install Vercel CLI: ${message}`);
      }
    }
  } else {
    runtime.log("  ✓ Vercel CLI already installed");
  }

  // Check if already authenticated
  const homeDir = os.homedir();
  const vercelConfigDir = path.join(homeDir, ".vercel");
  const authJsonPath = path.join(vercelConfigDir, "auth.json");

  try {
    await fs.access(authJsonPath);
    runtime.log("\n⚠️  Vercel already configured at ~/.vercel/auth.json");
    runtime.log("   Testing existing authentication...\n");

    await testVercelConnection(runtime);
    return;
  } catch {
    // Not configured, proceed with setup
  }

  runtime.log("\n📋 Setup Steps:\n");
  runtime.log("1. Create or use existing Vercel account:");
  runtime.log("   - Go to https://vercel.com/signup");
  runtime.log("   - Sign up with the same email as your GitHub account");
  runtime.log("   - This enables automatic GitHub → Vercel deployments\n");

  runtime.log("2. Generate Vercel Token:");
  runtime.log("   - Go to https://vercel.com/account/tokens");
  runtime.log("   - Click 'Create Token'");
  runtime.log("   - Name: 'AgentForge'");
  runtime.log("   - Scope: Full Account");
  runtime.log("   - Expiration: No Expiration (or custom)");
  runtime.log("   - Copy the token\n");

  runtime.log("3. Enter your Vercel token below:\n");

  // Prompt for token
  const tokenResult = await password({
    message: stylePromptMessage("Vercel Token"),
    validate: (value) => {
      if (!value) return "Token is required";
      if (String(value).length < 20) return "Token seems too short - verify it's correct";
      return undefined;
    },
  });

  if (isCancel(tokenResult)) {
    runtime.log("\n❌ Setup cancelled");
    runtime.exit(1);
    return;
  }

  const token = String(tokenResult);

  // Create Vercel config directory
  runtime.log("\n⚙️  Configuring Vercel...");

  try {
    await fs.mkdir(vercelConfigDir, { recursive: true });

    // Create auth.json
    const authConfig = {
      token,
    };

    await fs.writeFile(authJsonPath, JSON.stringify(authConfig, null, 2), { mode: 0o600 });
    runtime.log(`  ✓ Authentication stored at ${authJsonPath} (permissions: 600)`);
  } catch (error) {
    throw new Error(`Failed to configure Vercel: ${String(error)}`);
  }

  // Add token to .bashrc for CLI usage
  const bashrcPath = path.join(homeDir, ".bashrc");
  const bashrcAddition = `\n# Vercel token for AgentForge\nexport VERCEL_TOKEN="${token}"\n`;

  try {
    const bashrcExists = await fs
      .access(bashrcPath)
      .then(() => true)
      .catch(() => false);

    if (bashrcExists) {
      const bashrcContent = await fs.readFile(bashrcPath, "utf-8");
      if (!bashrcContent.includes("VERCEL_TOKEN")) {
        await fs.appendFile(bashrcPath, bashrcAddition);
        runtime.log("  ✓ VERCEL_TOKEN added to ~/.bashrc");
      } else {
        runtime.log("  ✓ VERCEL_TOKEN already in ~/.bashrc");
      }
    } else {
      await fs.appendFile(bashrcPath, bashrcAddition);
      runtime.log("  ✓ Created ~/.bashrc with VERCEL_TOKEN");
    }
  } catch (error) {
    runtime.log(`  ⚠️  Could not update ~/.bashrc: ${String(error)}`);
    runtime.log(`     Add manually: export VERCEL_TOKEN="${token}"`);
  }

  // Test connection
  runtime.log("\n🧪 Testing Vercel connection...");
  process.env.VERCEL_TOKEN = token; // Set for immediate test
  await testVercelConnection(runtime);

  runtime.log("\n✅ Vercel setup complete!\n");
  runtime.log("📋 Next steps:");
  runtime.log("  - Agents can now deploy via: vercel --prod");
  runtime.log("  - Connect GitHub repos to Vercel for automatic deployments");
  runtime.log("  - Visit https://vercel.com/dashboard to manage deployments\n");

  runtime.log("🔐 Security notes:");
  runtime.log("  - Token stored with 600 permissions (only you can read)");
  runtime.log("  - Use same email as GitHub for seamless integration");
  runtime.log("  - Rotate token every 6-12 months");
  runtime.log("  - Monitor deployments at https://vercel.com/dashboard\n");

  runtime.log("🚀 Automatic deployments:");
  runtime.log("  - Link GitHub repos to Vercel projects");
  runtime.log("  - Every git push = automatic deployment");
  runtime.log("  - Production URLs generated instantly\n");

  runtime.log("📚 Full guide: VERCEL_SETUP_FOR_AGENTS.md\n");
}

/**
 * Check if Vercel CLI is installed
 */
async function checkVercelInstalled(): Promise<boolean> {
  try {
    await execAsync("vercel --version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Test Vercel API connection
 */
async function testVercelConnection(runtime: RuntimeEnv): Promise<void> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    // Try reading from auth.json
    try {
      const homeDir = os.homedir();
      const authJsonPath = path.join(homeDir, ".vercel", "auth.json");
      const authContent = await fs.readFile(authJsonPath, "utf-8");
      const authJson = JSON.parse(authContent) as { token: string };
      process.env.VERCEL_TOKEN = authJson.token;
    } catch {
      runtime.log("⚠️  VERCEL_TOKEN not set in environment");
      runtime.log("   Run: export VERCEL_TOKEN='your-token' or restart your shell\n");
      return;
    }
  }

  try {
    // Test user info
    const userResponse = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Vercel API returned ${userResponse.status}: ${userResponse.statusText}`);
    }

    const userData = (await userResponse.json()) as {
      user: { username: string; email: string; name: string };
    };
    runtime.log(`  ✓ Authenticated as: ${userData.user.username}`);
    runtime.log(`  ✓ Email: ${userData.user.email}`);

    // Test projects listing
    const projectsResponse = await fetch("https://api.vercel.com/v9/projects", {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    });

    if (projectsResponse.ok) {
      const projectsData = (await projectsResponse.json()) as {
        projects: Array<{ name: string }>;
      };
      runtime.log(`  ✓ Can access projects (${projectsData.projects.length} found)`);
    }

    // Test CLI authentication
    try {
      const { stdout } = await execAsync("vercel whoami");
      const username = stdout.trim();
      if (username) {
        runtime.log(`  ✓ Vercel CLI authenticated (${username})`);
      }
    } catch {
      runtime.log("  ⚠️  Vercel CLI not authenticated");
      runtime.log("     Run: vercel login");
    }

    runtime.log("✅ Vercel connection verified!");
  } catch (error) {
    runtime.log("❌ Vercel connection failed!");
    runtime.log(`   Error: ${String(error)}`);
    runtime.log("\n   Troubleshooting:");
    runtime.log("   - Verify token is correct");
    runtime.log("   - Check token hasn't expired");
    runtime.log("   - Ensure token has Full Account scope");
    runtime.log("   - Get token from: https://vercel.com/account/tokens");
    throw error;
  }
}
