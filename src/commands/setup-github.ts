import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { text, password, isCancel } from "@clack/prompts";

import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { stylePromptMessage } from "../terminal/prompt-style.js";

const execAsync = promisify(exec);

/**
 * Interactive GitHub setup for AgentForge agents
 * Configures git credentials and tests GitHub access
 */
export async function setupGithubCommand(runtime: RuntimeEnv = defaultRuntime): Promise<void> {
  runtime.log("🔑 GitHub Setup for AgentForge\n");

  // Check if already configured
  const homeDir = os.homedir();
  const credentialsFile = path.join(homeDir, ".git-credentials");
  const bashrcPath = path.join(homeDir, ".bashrc");

  try {
    await fs.access(credentialsFile);
    runtime.log("⚠️  GitHub credentials already configured at ~/.git-credentials");
    runtime.log("   To reconfigure, delete ~/.git-credentials and run this command again.\n");

    // Still test the connection
    await testGithubConnection(runtime);
    return;
  } catch {
    // File doesn't exist, proceed with setup
  }

  runtime.log("Why GitHub access is needed:");
  runtime.log("  - Agents need to store code for products they build");
  runtime.log("  - Required for deploying to Vercel, Netlify, etc.");
  runtime.log("  - Enables version control and collaboration\n");

  runtime.log("📋 Setup Steps:\n");
  runtime.log("1. Create a dedicated GitHub account (recommended):");
  runtime.log("   - Go to https://github.com/signup");
  runtime.log("   - Username: agentforge-bot (or your choice)");
  runtime.log("   - Use a dedicated email for this account\n");

  runtime.log("2. Generate Personal Access Token:");
  runtime.log("   - Settings → Developer settings → Personal access tokens → Tokens (classic)");
  runtime.log("   - Click 'Generate new token (classic)'");
  runtime.log("   - Scopes needed: repo, workflow, user:email, delete_repo");
  runtime.log("   - Copy the token (starts with ghp_)\n");

  runtime.log("3. Enter your GitHub details below:\n");

  // Prompt for details
  const usernameResult = await text({
    message: stylePromptMessage("GitHub username (e.g., agentforge-bot)"),
    placeholder: "agentforge-bot",
    validate: (value) => {
      if (!value) return "Username is required";
      return undefined;
    },
  });

  if (isCancel(usernameResult)) {
    runtime.log("\n❌ Setup cancelled");
    runtime.exit(1);
    return;
  }

  const username = String(usernameResult);

  const emailResult = await text({
    message: stylePromptMessage("GitHub email"),
    placeholder: "agentforge-bot@example.com",
    validate: (value) => {
      if (!value) return "Email is required";
      if (!String(value).includes("@")) return "Invalid email format";
      return undefined;
    },
  });

  if (isCancel(emailResult)) {
    runtime.log("\n❌ Setup cancelled");
    runtime.exit(1);
    return;
  }

  const email = String(emailResult);

  const tokenResult = await password({
    message: stylePromptMessage("Personal Access Token (starts with ghp_)"),
    validate: (value) => {
      if (!value) return "Token is required";
      if (!String(value).startsWith("ghp_")) {
        return "Token should start with 'ghp_' - are you sure this is correct?";
      }
      return undefined;
    },
  });

  if (isCancel(tokenResult)) {
    runtime.log("\n❌ Setup cancelled");
    runtime.exit(1);
    return;
  }

  const token = String(tokenResult);

  // Configure git
  runtime.log("\n⚙️  Configuring git...");

  try {
    await execAsync(`git config --global user.name "${username}"`);
    await execAsync(`git config --global user.email "${email}"`);
    await execAsync("git config --global credential.helper store");
    runtime.log("  ✓ Git configured globally");
  } catch (error) {
    throw new Error(`Failed to configure git: ${String(error)}`);
  }

  // Store credentials
  runtime.log("🔒 Storing credentials securely...");

  const credentialsContent = `https://${username}:${token}@github.com\n`;
  await fs.writeFile(credentialsFile, credentialsContent, { mode: 0o600 });
  runtime.log(`  ✓ Credentials stored at ${credentialsFile} (permissions: 600)`);

  // Add to .bashrc for environment variable access
  const bashrcAddition = `\n# GitHub token for AgentForge\nexport GITHUB_TOKEN="${token}"\n`;

  try {
    const bashrcExists = await fs
      .access(bashrcPath)
      .then(() => true)
      .catch(() => false);

    if (bashrcExists) {
      const bashrcContent = await fs.readFile(bashrcPath, "utf-8");
      if (!bashrcContent.includes("GITHUB_TOKEN")) {
        await fs.appendFile(bashrcPath, bashrcAddition);
        runtime.log("  ✓ GITHUB_TOKEN added to ~/.bashrc");
      } else {
        runtime.log("  ✓ GITHUB_TOKEN already in ~/.bashrc");
      }
    } else {
      await fs.writeFile(bashrcPath, bashrcAddition);
      runtime.log("  ✓ Created ~/.bashrc with GITHUB_TOKEN");
    }
  } catch (error) {
    runtime.log(`  ⚠️  Could not update ~/.bashrc: ${String(error)}`);
    runtime.log(`     Add manually: export GITHUB_TOKEN="${token}"`);
  }

  // Test connection
  runtime.log("\n🧪 Testing GitHub connection...");
  process.env.GITHUB_TOKEN = token; // Set for immediate test
  await testGithubConnection(runtime);

  runtime.log("\n✅ GitHub setup complete!\n");
  runtime.log("📋 Next steps:");
  runtime.log("  - Agents can now create repositories via bash tool");
  runtime.log("  - Connect this GitHub account to Vercel/Netlify for deployments");
  runtime.log("  - Monitor agent activity: curl -H 'Authorization: token $GITHUB_TOKEN' \\");
  runtime.log("      https://api.github.com/user/repos\n");

  runtime.log("🔐 Security notes:");
  runtime.log("  - Credentials stored with 600 permissions (only you can read)");
  runtime.log("  - Use a dedicated GitHub account for isolation");
  runtime.log("  - Rotate token every 6-12 months");
  runtime.log("  - Never commit .git-credentials to any repository\n");

  runtime.log("📚 Full guide: GITHUB_SETUP_FOR_AGENTS.md\n");
}

/**
 * Test GitHub API connection
 */
async function testGithubConnection(runtime: RuntimeEnv): Promise<void> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    runtime.log("⚠️  GITHUB_TOKEN not set in environment");
    runtime.log("   Run: export GITHUB_TOKEN='your-token' or restart your shell\n");
    return;
  }

  try {
    // Test user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub API returned ${userResponse.status}: ${userResponse.statusText}`);
    }

    const userData = (await userResponse.json()) as { login: string; email: string | null };
    runtime.log(`  ✓ Authenticated as: ${userData.login}`);

    // Check token scopes
    const scopes = userResponse.headers.get("X-OAuth-Scopes");
    if (scopes) {
      const scopeList = scopes.split(", ");
      const requiredScopes = ["repo", "workflow", "user:email"];
      const missingScopes = requiredScopes.filter((s) => !scopeList.includes(s));

      if (missingScopes.length > 0) {
        runtime.log(`  ⚠️  Missing scopes: ${missingScopes.join(", ")}`);
        runtime.log("     Regenerate token with all required scopes");
      } else {
        runtime.log("  ✓ Token has all required scopes");
      }
    }

    // Test repo listing
    const reposResponse = await fetch("https://api.github.com/user/repos?per_page=5", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (reposResponse.ok) {
      const repos = (await reposResponse.json()) as Array<{ name: string }>;
      runtime.log(`  ✓ Can access repositories (${repos.length} found)`);
    }

    runtime.log("✅ GitHub connection verified!");
  } catch (error) {
    runtime.log("❌ GitHub connection failed!");
    runtime.log(`   Error: ${String(error)}`);
    runtime.log("\n   Troubleshooting:");
    runtime.log("   - Verify token is correct (starts with ghp_)");
    runtime.log("   - Check token hasn't expired");
    runtime.log("   - Ensure token has required scopes (repo, workflow, user:email)");
    throw error;
  }
}
