# AgentForge - Ubuntu 22.04 LTS VPS Deployment Guide

**Complete guide for deploying AgentForge on a remote Ubuntu VPS**

---

## Prerequisites

### What You Need

**VPS Specifications (Minimum):**
- Ubuntu 22.04 LTS
- 2 CPU cores
- 4GB RAM (8GB recommended)
- 20GB disk space
- Public IP or domain (optional, for remote access)

**Local Machine:**
- SSH client
- Terminal access

**API Keys:**
- Anthropic API key (Claude) - recommended, OR
- OpenAI API key (GPT-4), OR
- Google AI API key (Gemini)

---

## Step 1: Initial VPS Setup (10 minutes)

### 1a. Connect to Your VPS

```bash
# From your local machine
ssh root@YOUR_VPS_IP
```

**Replace `YOUR_VPS_IP` with your actual VPS IP address**

### 1b. Create Non-Root User (Security Best Practice)

```bash
# Create user
adduser agentforge

# Add to sudo group
usermod -aG sudo agentforge

# Switch to new user
su - agentforge
```

**All subsequent commands run as `agentforge` user**

### 1c. Update System

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Step 2: Install Dependencies (15 minutes)

### 2a. Install Node.js 22.x

```bash
# Install Node.js 22.x via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
# Should show: v22.x.x
```

### 2b. Install pnpm

```bash
# Install pnpm globally
sudo npm install -g pnpm

# Verify
pnpm --version
# Should show: 9.x.x or similar
```

### 2c. Install Git

```bash
sudo apt install -y git

# Verify
git --version
```

### 2d. Install Build Tools

```bash
# Required for native modules
sudo apt install -y build-essential python3
```

### 2e. Install Playwright Dependencies (for browser automation)

```bash
# Install system dependencies for Playwright
sudo apt install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxkbcommon0 \
  libatspi2.0-0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2
```

---

## Step 3: Clone and Build AgentForge (10 minutes)

### 3a. Clone Repository

```bash
cd ~
git clone https://github.com/moltbot/moltbot.git agentforge
cd agentforge
```

**Note:** Replace with your actual repository URL if you forked it

### 3b. Install Dependencies

```bash
pnpm install
```

**This will take 2-5 minutes**

### 3c. Build Project

```bash
pnpm build
```

**Expected output:**
```
> moltbot@2026.1.26 build
> ...
```

**Verify build:**
```bash
ls -la dist/
# Should see: cli.js and other files
```

### 3d. Install Playwright Browsers

```bash
pnpx playwright install chromium
```

**This installs Chromium for browser automation**

---

## Step 4: Initialize AgentForge (5 minutes)

### 4a. Run Initialization

```bash
cd ~/agentforge
node moltbot.mjs init:agentforge
```

**Expected output:**
```
✅ AgentForge initialized successfully!

📋 Next steps:
  1. Set your AI provider: node moltbot.mjs auth choice
  2. Start gateway: node moltbot.mjs gateway run --port 18789
  ...
```

### 4b. Verify Agent Workspaces

```bash
ls ~/.moltbot/agents/
```

**Should show:**
```
analyst  ceo  cfo  cmo  coo  coordinator  cto  innovation  risk
```

### 4c. Verify Cron Template Created

```bash
cat ~/.moltbot/agentforge-cron.txt
```

**Should show cron job templates**

---

## Step 5: Configure AI Provider (3 minutes)

**IMPORTANT:** After this step, also complete Step 5b (GitHub Access) - Critical for building products!



### 5a. Set API Key via Config File (Recommended for VPS)

**⚠️ IMPORTANT:** The config file is at `~/.clawdbot/moltbot.json` (with `clawdbot`, not `moltbot`).

The current config schema expects a **models catalog** with full provider entries (including `baseUrl` and a `models` array).  
Use ONE of the following `jq` commands (depending on your provider) after running `init:agentforge`.

#### Option 1: OpenAI (gpt-5-mini) – Recommended if you’re using OpenAI

```bash
jq '.models = {
  "mode": "merge",
  "providers": {
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-YOUR_OPENAI_KEY_HERE",
      "api": "openai-responses",
      "models": [
        {
          "id": "gpt-5-mini",
          "name": "gpt-5-mini",
          "api": "openai-responses",
          "reasoning": false,
          "input": ["text"],
          "cost": {
            "input": 0.0,
            "output": 0.0,
            "cacheRead": 0.0,
            "cacheWrite": 0.0
          },
          "contextWindow": 200000,
          "maxTokens": 16384
        }
      ]
    }
  }
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Replace `sk-YOUR_OPENAI_KEY_HERE` with your actual OpenAI API key.**

#### Option 2: Claude (Anthropic)

```bash
jq '.models = {
  "mode": "merge",
  "providers": {
    "anthropic": {
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "sk-ant-YOUR_API_KEY_HERE",
      "api": "anthropic-messages",
      "models": [
        {
          "id": "claude-sonnet-4.5",
          "name": "Claude Sonnet 4.5",
          "api": "anthropic-messages",
          "reasoning": true,
          "input": ["text", "image"],
          "cost": {
            "input": 0.0,
            "output": 0.0,
            "cacheRead": 0.0,
            "cacheWrite": 0.0
          },
          "contextWindow": 200000,
          "maxTokens": 16384
        }
      ]
    }
  }
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Replace `sk-ant-YOUR_API_KEY_HERE` with your actual Anthropic API key.**

#### Option 3: Google Gemini

```bash
jq '.models = {
  "mode": "merge",
  "providers": {
    "google": {
      "baseUrl": "https://generativelanguage.googleapis.com",
      "apiKey": "YOUR_GOOGLE_AI_KEY_HERE",
      "api": "google-generative-ai",
      "models": [
        {
          "id": "gemini-2.0-flash-exp",
          "name": "Gemini 2.0 Flash (experimental)",
          "api": "google-generative-ai",
          "reasoning": false,
          "input": ["text", "image"],
          "cost": {
            "input": 0.0,
            "output": 0.0,
            "cacheRead": 0.0,
            "cacheWrite": 0.0
          },
          "contextWindow": 200000,
          "maxTokens": 16384
        }
      ]
    }
  }
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Replace `YOUR_GOOGLE_AI_KEY_HERE` with your actual Google AI Studio key.**

#### Option 4: Ollama (Local or Cloud)

**If using Ollama Cloud (with credits):**
```bash
jq '.models = {
  "mode": "merge",
  "providers": {
    "ollama": {
      "baseUrl": "https://api.ollama.ai/v1",
      "apiKey": "YOUR_OLLAMA_API_KEY_HERE",
      "api": "openai-completions",
      "models": [
        {
          "id": "llama3.3",
          "name": "Llama 3.3",
          "api": "openai-completions",
          "reasoning": false,
          "input": ["text"],
          "cost": {
            "input": 0.0,
            "output": 0.0,
            "cacheRead": 0.0,
            "cacheWrite": 0.0
          },
          "contextWindow": 128000,
          "maxTokens": 8192
        }
      ]
    }
  }
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Replace `YOUR_OLLAMA_API_KEY_HERE` with your actual Ollama API key.**

**⚠️ IMPORTANT:** If you're using Ollama Cloud with hourly credit limits, **configure fallbacks** (see Step 5e below) to automatically switch to another provider when credits run out.

### 5e. Configure Model Fallbacks (Recommended for Ollama Cloud)

**Why:** When Ollama runs out of credits or hits rate limits, agents will automatically fall back to your backup provider.

**Add fallback configuration:**

```bash
# Read current config
CURRENT_CONFIG=$(cat ~/.clawdbot/moltbot.json)

# Add fallbacks (example: Ollama primary with OpenAI fallback)
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Common fallback patterns:**

**Pattern 1: Ollama → OpenAI**
```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Pattern 2: Ollama → Anthropic**
```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["anthropic/claude-sonnet-4.5"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Pattern 3: Ollama → Google Gemini**
```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["google/gemini-2.0-flash-exp"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Pattern 4: Multiple fallbacks (Ollama → OpenAI → Anthropic)**
```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini", "anthropic/claude-sonnet-4.5"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**How it works:**
- When Ollama hits credit limits or rate limits, Moltbot automatically tries the fallback models in order
- Falls back only on auth failures, rate limits, and timeouts (not on other errors)
- Each fallback is tried until one succeeds or all fail
- Logs show which model was used: check `sudo journalctl -u moltbot-gateway` for fallback attempts

**Verify fallbacks are configured:**
```bash
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model'
```

**Expected output:**
```json
{
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini"]
}
```

### 5b. Verify Config

```bash
sudo apt install -y jq
```




```bash
cat ~/.clawdbot/moltbot.json | jq .
```

**Should show your configuration with API key**

**Troubleshooting: "JSON5: invalid character" error:**

If you get a JSON5 parse error, you likely have a corrupted config file from appending JSON instead of merging. Fix it:

```bash
# 1. Delete corrupted configs
rm -f ~/.clawdbot/moltbot.json ~/.moltbot/moltbot.json

# 2. Re-run init to recreate base config
node moltbot.mjs init:agentforge

# 3. Then use jq to add your API key (for example, OpenAI gpt-5-mini):
jq '.models = {
  "mode": "merge",
  "providers": {
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-YOUR_ACTUAL_OPENAI_KEY_HERE",
      "api": "openai-responses",
      "models": [
        {
          "id": "gpt-5-mini",
          "name": "gpt-5-mini",
          "api": "openai-responses",
          "reasoning": false,
          "input": ["text"],
          "cost": {
            "input": 0.0,
            "output": 0.0,
            "cacheRead": 0.0,
            "cacheWrite": 0.0
          },
          "contextWindow": 200000,
          "maxTokens": 16384
        }
      ]
    }
  }
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json

# 4. Verify
cat ~/.clawdbot/moltbot.json | jq .
```

---

## Step 5c: Configure GitHub Access (5 minutes) 🆕 CRITICAL

**Why:** Agents need GitHub to build real products, store code, and manage repositories.

### Create Dedicated GitHub Account

**On your local machine:**
1. Go to https://github.com/signup
2. Create account: `agentforge-bot` (or your choice)
3. Use dedicated email for agent account

### Generate Personal Access Token

1. Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Scopes: ✅ `repo`, ✅ `workflow`, ✅ `user:email`, ✅ `delete_repo`
4. Copy token (format: `ghp_xxxx...`)

### Configure on VPS

```bash
# Run the interactive setup command
cd ~/agentforge
node moltbot.mjs setup:github


# Follow prompts:
# - Username: agentforge-bot
# - Email: your-agent-email@example.com
# - Token: ghp_xxxx...

# This will:
# ✅ Configure git globally
# ✅ Store credentials securely
# ✅ Set GITHUB_TOKEN environment variable
# ✅ Test GitHub API connection
```

**Manual setup alternative (if needed):**
```bash
# Set git identity
git config --global user.name "AgentForge Bot"
git config --global user.email "agentforge-bot@yourdomain.com"

# Store credentials
git config --global credential.helper store
cat > ~/.git-credentials << 'EOF'
https://agentforge-bot:YOUR_GITHUB_TOKEN_HERE@github.com
EOF
chmod 600 ~/.git-credentials

# Set environment variable
echo 'export GITHUB_TOKEN="YOUR_GITHUB_TOKEN_HERE"' >> ~/.bashrc
source ~/.bashrc
```

### Test GitHub Access

```bash
# Test API connection
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Expected: JSON response with your bot account info
```

---

## Step 5d: Configure Vercel Deployment (5 minutes) 🆕 CRITICAL

**Why:** Agents need Vercel to deploy products instantly and make them publicly accessible.

### Get Vercel Account

**On your local machine:**
1. Go to https://vercel.com/signup
2. Sign up with GitHub (use agentforge-bot account or personal)

### Generate Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "AgentForge Bot"
4. Scope: "Full Account"
5. Expiration: No expiration (or 1 year)
6. Copy token (format: `vercel_...` or similar)

### Configure on VPS

```bash
# Run the interactive setup command
cd ~/agentforge
node moltbot.mjs setup:vercel

# Follow prompts:
# - Vercel token: paste your token

# This will:
# ✅ Install Vercel CLI globally
# ✅ Store auth token securely
# ✅ Set VERCEL_TOKEN environment variable
# ✅ Test Vercel API connection
```

**Manual setup alternative (if needed):**
```bash
# Install Vercel CLI
sudo npm install -g vercel

# Store auth token
mkdir -p ~/.vercel
cat > ~/.vercel/auth.json << 'EOF'
{
  "token": "YOUR_VERCEL_TOKEN_HERE"
}
EOF
chmod 600 ~/.vercel/auth.json

# Set environment variable
echo 'export VERCEL_TOKEN="YOUR_VERCEL_TOKEN_HERE"' >> ~/.bashrc
source ~/.bashrc
```

### Test Vercel Access

```bash
# Test CLI is working
vercel whoami

# Expected: Shows your Vercel account username
```

**⚠️ IMPORTANT:** Without GitHub + Vercel, agents can't build or deploy products! Both are essential.

---

## Step 6: Setup Gateway as System Service (10 minutes)

**This ensures the gateway runs 24/7 and restarts on crashes/reboots**

### 6a. Create Systemd Service File

```bash
sudo tee /etc/systemd/system/moltbot-gateway.service > /dev/null << 'EOF'
[Unit]
Description=Moltbot Gateway for AgentForge
After=network.target

[Service]
Type=simple
User=agentforge
WorkingDirectory=/home/agentforge/agentforge
ExecStart=/usr/bin/node /home/agentforge/agentforge/moltbot.mjs gateway run --port 18789 --bind 0.0.0.0
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=moltbot-gateway

# Environment
Environment=NODE_ENV=production
Environment=HOME=/home/agentforge

# Security hardening (optional)
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
```

### 6b. Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable moltbot-gateway

# Start service now
sudo systemctl start moltbot-gateway

# Check status
sudo systemctl status moltbot-gateway
```

**Expected output:**
```
● moltbot-gateway.service - Moltbot Gateway for AgentForge
     Loaded: loaded (/etc/systemd/system/moltbot-gateway.service; enabled)
     Active: active (running) since ...
```

### 6c. Verify Gateway is Running

```bash
# Check if listening on port
ss -ltnp | grep 18789

# Check logs
sudo journalctl -u moltbot-gateway -f
# Press Ctrl+C to exit logs
```

**Expected:** Gateway is running and listening on port 18789

---

## Step 7: Configure Firewall (5 minutes)

### 7a. Install UFW (if not already installed)

```bash
sudo apt install -y ufw
```

### 7b. Configure Firewall Rules

```bash
# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow gateway port (for remote access if needed)
sudo ufw allow 18789/tcp

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
18789/tcp                  ALLOW       Anywhere
```

**⚠️ WARNING:** If you're accessing via SSH, make sure port 22 is allowed BEFORE enabling UFW!

---

## Step 8: Install Cron Jobs (3 minutes)

### 8a. Make Scripts Executable

```bash
cd ~/agentforge
chmod +x scripts/*.sh
```

### 8b. Install Cron Jobs

```bash
# Edit crontab
crontab -e
# Choose editor (nano is easiest for beginners)

# Add these lines (copy from ~/.moltbot/agentforge-cron.txt or below):
```

**Paste this into crontab:**

```cron

# AgentForge Automation
# Daily board meeting at 9am
0 9 * * * cd /home/agentforge/agentforge && ./scripts/board-meeting.sh >> /tmp/agentforge-board.log 2>&1

# Daily CEO execution at 10am (1 hour after board meeting)
0 10 * * * cd /home/agentforge/agentforge && ./scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1

# Weekly reflection (Sundays at 10pm)
0 22 * * 0 cd /home/agentforge/agentforge && ./scripts/weekly-reflection.sh >> /tmp/agentforge-reflection.log 2>&1

# Monthly meta-learning (1st of month at 11pm)
0 23 1 * * cd /home/agentforge/agentforge && ./scripts/monthly-learning.sh >> /tmp/agentforge-metalearning.log 2>&1

# Obsidian sync (every 6 hours)
0 */6 * * * cd /home/agentforge/agentforge && ./scripts/sync-to-obsidian.sh >> /tmp/agentforge-sync.log 2>&1
```

**Save and exit (Ctrl+X, then Y, then Enter in nano)**

### 8c. Verify Cron Jobs Installed

```bash
crontab -l
```

**Should show your cron jobs**




---

## Step 9: Test the System (15 minutes)

### 9a. Test Gateway Connection

```bash
# From the VPS
curl http://localhost:18789/health
```

**Expected:** Some response (exact format depends on gateway implementation)

### 9b. Test Agent Communication

```bash
cd ~/agentforge
node moltbot.mjs agent --agent ceo --message "Hello, what is your current capital and role?"
```

**Expected:** CEO responds explaining role and $0 capital

### 9c. Test Memory System

```bash
node moltbot.mjs agent --agent cfo --message "Search your memory for 'treasury'. What do you know about our starting capital?"
```

**Expected:** CFO uses memory_search and explains $0 starting capital

### 9d. Test Agent-to-Agent Messaging

```bash
node moltbot.mjs agent --agent ceo --message "Use sessions_send to send a message to the CFO asking about the current treasury balance."
```

**Expected:** CEO uses sessions_send tool successfully

**Verify it worked:**
```bash
node moltbot.mjs agent --agent cfo --message "Check your message history with sessions_history. Did the CEO contact you?"
```

**Expected:** CFO confirms receiving CEO's message

---

## Step 10: First Board Meeting (10 minutes)

### 10a. Trigger Board Meeting Manually

**Option 1 — Live TUI (recommended when running interactively):**
```bash
cd ~/agentforge
./scripts/board-meeting.sh --tui
```
Shows a real-time view: phase, current agent, and a short preview of each agent’s last message as they complete. Run in the foreground (not in cron).

**Option 2 — Background (for cron or when you don’t need the TUI):**
```bash
cd ~/agentforge
./scripts/board-meeting.sh
```

**This will take 5-10 minutes**

**Monitor progress (when not using --tui):**
```bash
# In another SSH session
tail -f /tmp/agentforge-board.log
```

### 10b. Check Board Decision

```bash
node moltbot.mjs tui --session agent:coordinator:main
```

**Use arrow keys to scroll, press 'q' to exit**

**Expected:** See coordinator's synthesized BOARD DECISION

---

## Step 11: CEO Execution (5 minutes)

### 11a. Trigger CEO Execution

```bash
./scripts/ceo-implement.sh
```

**Monitor:**
```bash
tail -f /tmp/agentforge-ceo.log
```

### 11b. Check CEO's Plan

```bash
node moltbot.mjs tui --session agent:ceo:main
```

**Expected:** See CEO's execution plan

### 11c. Check LEDGER

```bash
cat ~/.moltbot/agents/ceo/LEDGER.md
```

**Expected:** See active investment and $0 capital tracking

---

## Step 12: Monitor & Maintain

### Viewing Logs

**Gateway logs:**
```bash
sudo journalctl -u moltbot-gateway -f
# Press Ctrl+C to exit
```

**Board meeting logs:**
```bash
tail -f /tmp/agentforge-board.log
```

**CEO execution logs:**
```bash
tail -f /tmp/agentforge-ceo.log
```

**All recent logs:**
```bash
tail -100 /tmp/agentforge-*.log
```

### Checking Agent Status

**View any agent's session:**
```bash
node moltbot.mjs tui --session agent:ceo:main
node moltbot.mjs tui --session agent:coordinator:main
node moltbot.mjs tui --session agent:cfo:main
# etc.
```

**View agent memory:**
```bash
cat ~/.moltbot/agents/ceo/MEMORY.md
cat ~/.moltbot/agents/cfo/MEMORY.md
# etc.
```

**Check human requests:**
```bash
ls -la ~/.moltbot/human-requests/
```

### Restarting Gateway

**If you need to restart:**
```bash
sudo systemctl restart moltbot-gateway
sudo systemctl status moltbot-gateway
```

### Updating Code

**When you make changes:**
```bash
cd ~/agentforge
git pull
pnpm install
pnpm build
sudo systemctl restart moltbot-gateway
```

### Deploying the two-way board meeting update

**Short upgrade-only steps:** see [VPS_UPGRADE_BOARD_TWO_WAY.md](VPS_UPGRADE_BOARD_TWO_WAY.md).

The two-way consensus flow adds a **helper script** and changes the **board meeting script** so all six board members (CFO, CTO, CMO, COO, Risk, Innovation) see the analyst’s actual report before responding. The VPS needs these repo updates; config (`~/.clawdbot/moltbot.json`), gateway, and cron are unchanged.

**Files that must be on the VPS:**

| File | Purpose |
|------|--------|
| `scripts/board-get-session-message.mjs` | **New.** Reads an agent’s last assistant message from session transcript. |
| `scripts/board-meeting.sh` | **Updated.** Runs analyst first, gets brief, then runs the six with shared analyst report, then coordinator. Optional `--tui` runs the live TUI. |
| `scripts/board-meeting-tui.mjs` | **New.** Live TUI: same flow as the shell script but shows phase, current agent, and preview of each response in real time. Used when you run `./scripts/board-meeting.sh --tui`. |

**Option A — Git (recommended)**

1. On your **local machine**: commit and push the new/updated files to the branch the VPS uses (e.g. `main`):
   ```bash
   git add scripts/board-get-session-message.mjs scripts/board-meeting.sh scripts/board-meeting-tui.mjs
   git commit -m "Board: two-way consensus — shared analyst brief"
   git push origin main
   ```
2. On the **VPS** (as `agentforge`):
   ```bash
   cd ~/agentforge
   git pull --rebase origin main
   chmod +x scripts/board-get-session-message.mjs   # if needed
   ```
3. No gateway restart or cron change. Next board run (e.g. 9am cron) will use the new flow.

**Option B — Copy files without Git**

If the VPS does not pull from your repo, copy the two files from your dev machine:

```bash
# From your local machine (replace agentforge@VPS_IP and path if different)
scp scripts/board-get-session-message.mjs scripts/board-meeting.sh scripts/board-meeting-tui.mjs agentforge@YOUR_VPS_IP:~/agentforge/scripts/
```

Then on the VPS:
```bash
cd ~/agentforge
chmod +x scripts/board-get-session-message.mjs
```

**State directory:** The helper uses `CLAWDBOT_STATE_DIR` or `MOLTBOT_STATE_DIR` if set, else `~/.clawdbot`. Ensure the VPS runs the board script with the same state dir as the gateway (e.g. same user and env).

**Quick test on VPS:**
```bash
cd ~/agentforge
./scripts/board-meeting.sh
```
If the analyst has not run yet, the helper may return empty once; the script retries. Confirm in logs that the six members receive the shared analyst brief.

**Revert (script only):** To go back to the old one-way flow, restore a backup of `scripts/board-meeting.sh` (e.g. `scripts/board-meeting.sh.bak`) and remove or ignore `scripts/board-get-session-message.mjs`. Config and gateway are untouched.

---

## Step 13: Remote Access from Local Machine

**You can monitor and control AgentForge from your local machine via SSH**

### 13a. SSH Tunnel (Recommended for Security)

**From your local machine:**
```bash
# Create SSH tunnel for gateway
ssh -L 18789:localhost:18789 agentforge@YOUR_VPS_IP

# Keep this terminal open
```

**Now from another terminal on your local machine:**
```bash
# You can now access the gateway as if it's running locally
curl http://localhost:18789/health
```

### 13b. Direct SSH Commands

**From your local machine:**
```bash
# Run agent command remotely
ssh agentforge@YOUR_VPS_IP "cd agentforge && node moltbot.mjs agent --agent ceo --message 'Status report?'"

# Check logs
ssh agentforge@YOUR_VPS_IP "tail -100 /tmp/agentforge-board.log"

# View agent memory
ssh agentforge@YOUR_VPS_IP "cat ~/.moltbot/agents/ceo/LEDGER.md"
```

### 13c. SSHFS (Mount Remote Filesystem Locally)

**On your local machine (Mac/Linux):**
```bash
# Install sshfs (if not installed)
# Mac: brew install sshfs
# Linux: sudo apt install sshfs

# Mount remote directory
mkdir -p ~/agentforge-remote
sshfs agentforge@YOUR_VPS_IP:/home/agentforge agentforge-remote

# Now you can access VPS files locally
cat ~/agentforge-remote/.moltbot/agents/ceo/LEDGER.md

# Unmount when done
umount ~/agentforge-remote
```

---

## Step 14: Obsidian Vault Access

**Option 1: Sync Vault to Local Machine**

```bash
# From your local machine
rsync -avz --progress agentforge@YOUR_VPS_IP:/home/agentforge/agentforge/.obsidian-vault/ ./agentforge-vault/

# Then open ./agentforge-vault/ in Obsidian
```

**Option 2: Auto-Sync with Script**

**On your local machine, create `sync-vault.sh`:**
```bash
#!/bin/bash
rsync -avz --delete agentforge@YOUR_VPS_IP:/home/agentforge/agentforge/.obsidian-vault/ ~/agentforge-vault/
echo "Vault synced: $(date)"
```

**Make executable and run:**
```bash
chmod +x sync-vault.sh
./sync-vault.sh

# Open ~/agentforge-vault/ in Obsidian
```

**Add to cron for auto-sync (every hour):**
```bash
# On your local machine
crontab -e

# Add:
0 * * * * /path/to/sync-vault.sh >> ~/agentforge-vault-sync.log 2>&1
```

---

## Security Best Practices

### 1. Secure SSH Access

**Use SSH keys instead of passwords:**

```bash
# On your local machine, generate key (if you don't have one)
ssh-keygen -t ed25519

# Copy to VPS
ssh-copy-id agentforge@YOUR_VPS_IP

# Now test passwordless login
ssh agentforge@YOUR_VPS_IP
```

**Disable password authentication (optional but recommended):**
```bash
# On VPS as root or sudo
sudo nano /etc/ssh/sshd_config

# Find and set:
PasswordAuthentication no
PubkeyAuthentication yes

# Save and restart SSH
sudo systemctl restart sshd
```

### 2. Protect API Keys

**Never commit API keys to git:**
```bash
# On VPS
cd ~/agentforge
echo ".moltbot/" >> .git/info/exclude
```

**Store sensitive config separately:**
```bash
# Keep API keys in ~/.clawdbot/moltbot.json (not in repo)
# This file is in .gitignore by default
```

### 3. Set Up Fail2Ban (Optional)

**Protect against brute force attacks:**
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Updates

**Create update script:**
```bash
cat > ~/update-system.sh << 'EOF'
#!/bin/bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
echo "System updated: $(date)"
EOF

chmod +x ~/update-system.sh

# Add to weekly cron
crontab -e
# Add: 0 3 * * 0 ~/update-system.sh >> ~/update.log 2>&1
```

---

## Troubleshooting

### Gateway Won't Start

**Check logs:**
```bash
sudo journalctl -u moltbot-gateway -n 100 --no-pager
```

**Common issues:**

**Port in use:**
```bash
sudo lsof -i :18789
# Kill the process if needed
sudo kill -9 PID
sudo systemctl restart moltbot-gateway
```

**Config error:**
```bash
cat ~/.clawdbot/moltbot.json | jq .
# Fix any JSON syntax errors
```

**Missing dependencies:**
```bash
cd ~/agentforge
pnpm install
pnpm build
```

### Agent Not Responding

**Check gateway is running:**
```bash
sudo systemctl status moltbot-gateway
```

**Check AI provider:**
```bash
# Test API key
node moltbot.mjs agent --agent ceo --message "test"
# If fails, check API key in ~/.clawdbot/moltbot.json
```

**Check agent workspace:**
```bash
ls ~/.moltbot/agents/ceo/
# Should see SOUL.md, MEMORY.md, etc.
```

### Board Meeting Fails

**If runs time out:** Increase agent timeout and restore model config. See [VPS_CONFIG_UPDATE.md](VPS_CONFIG_UPDATE.md) for exact `jq` commands (e.g. `agents.defaults.timeoutSeconds = 1800` and default model + fallbacks).

**Check script logs:**
```bash
tail -100 /tmp/agentforge-board.log
```

**Run manually with verbose output:**
```bash
bash -x ~/agentforge/scripts/board-meeting.sh
```

**Check individual agent:**
```bash
node moltbot.mjs agent --agent analyst --message "Hello, can you respond?"
```

### Cron Jobs Not Running

**Check cron is running:**
```bash
sudo systemctl status cron
```

**Check crontab:**
```bash
crontab -l
```

**Check logs:**
```bash
grep CRON /var/log/syslog
```

**Test script manually:**
```bash
cd ~/agentforge
./scripts/board-meeting.sh
# Check for errors
```

---

## Monitoring & Alerts

### Basic Monitoring Script

**Create monitoring script:**
```bash
cat > ~/monitor-agentforge.sh << 'EOF'
#!/bin/bash

echo "=== AgentForge Status Report ==="
echo "Date: $(date)"
echo ""

# Gateway status
echo "Gateway Status:"
systemctl is-active moltbot-gateway || echo "❌ Gateway is DOWN"
echo ""

# Disk space
echo "Disk Space:"
df -h / | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5")"}'
echo ""

# Memory
echo "Memory:"
free -h | grep Mem | awk '{print "  Used: "$3" / "$2}'
echo ""

# Recent board meetings
echo "Recent Board Meetings:"
tail -5 /tmp/agentforge-board.log | head -5
echo ""

# Recent CEO activity
echo "Recent CEO Activity:"
tail -5 /tmp/agentforge-ceo.log | head -5
echo ""

# Human requests
REQUESTS=$(ls ~/.moltbot/human-requests/ 2>/dev/null | wc -l)
echo "Pending Human Requests: $REQUESTS"
echo ""

# Current capital
if [ -f ~/.moltbot/agents/ceo/LEDGER.md ]; then
    CAPITAL=$(grep "Current Available Capital:" ~/.moltbot/agents/ceo/LEDGER.md | tail -1)
    echo "CEO Ledger: $CAPITAL"
fi

echo ""
echo "=== End Report ==="
EOF

chmod +x ~/monitor-agentforge.sh
```

**Run monitoring:**
```bash
~/monitor-agentforge.sh
```

**Add to cron (daily email report):**
```bash
crontab -e
# Add (replace YOUR_EMAIL):
0 8 * * * ~/monitor-agentforge.sh | mail -s "AgentForge Daily Report" YOUR_EMAIL
```

---

## Performance Optimization

### 1. Enable Swap (if needed)

**If you have < 8GB RAM:**
```bash
# Create 4GB swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Optimize Node.js

**Set Node.js memory limit if needed:**
```bash
# Edit systemd service
sudo nano /etc/systemd/system/moltbot-gateway.service

# Add under [Service]:
Environment=NODE_OPTIONS="--max-old-space-size=2048"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart moltbot-gateway
```

### 3. Log Rotation

**Prevent log files from growing too large:**
```bash
sudo tee /etc/logrotate.d/agentforge > /dev/null << 'EOF'
/tmp/agentforge-*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 agentforge agentforge
}
EOF
```

---

## Backup Strategy

### Automated Backup Script

```bash
cat > ~/backup-agentforge.sh << 'EOF'
#!/bin/bash

BACKUP_DIR=~/agentforge-backups
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/agentforge-$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_FILE"

# Backup agent data, config, and vault
tar -czf "$BACKUP_FILE" \
    ~/.moltbot/agents/ \
    ~/.clawdbot/moltbot.json \
    ~/agentforge/.obsidian-vault/ \
    ~/.moltbot/human-requests/ 2>/dev/null

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/agentforge-*.tar.gz | tail -n +31 | xargs rm -f 2>/dev/null

echo "Backup complete: $BACKUP_FILE"
echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"
EOF

chmod +x ~/backup-agentforge.sh
```

**Add to cron (daily backups):**
```bash
crontab -e
# Add:
0 2 * * * ~/backup-agentforge.sh >> ~/backup.log 2>&1
```

**Sync backups to local machine:**
```bash
# On your local machine
rsync -avz --progress agentforge@YOUR_VPS_IP:~/agentforge-backups/ ./agentforge-backups-local/
```

---

## Quick Reference

### Essential Commands

**Start/Stop/Restart Gateway:**
```bash
sudo systemctl start moltbot-gateway
sudo systemctl stop moltbot-gateway
sudo systemctl restart moltbot-gateway
sudo systemctl status moltbot-gateway
```

**View Logs:**
```bash
sudo journalctl -u moltbot-gateway -f          # Gateway logs
tail -f /tmp/agentforge-board.log              # Board meetings
tail -f /tmp/agentforge-ceo.log                # CEO execution
```

**Test Agents:**
```bash
node moltbot.mjs agent --agent ceo --message "Status?"
node moltbot.mjs tui --session agent:ceo:main
```

**Manual Triggers:**
```bash
./scripts/board-meeting.sh      # Trigger board meeting
./scripts/ceo-implement.sh      # Trigger CEO execution
./scripts/sync-to-obsidian.sh   # Sync vault
```

**Check Status:**
```bash
~/monitor-agentforge.sh         # Full status report
cat ~/.moltbot/agents/ceo/LEDGER.md  # Check capital
```

---

## Success Checklist

**After completing this guide, verify:**

- [ ] VPS updated and secure
- [ ] Node.js 22.x installed
- [ ] AgentForge cloned and built
- [ ] init:agentforge completed
- [ ] AI provider configured
- [ ] Gateway running as systemd service
- [ ] Firewall configured
- [ ] Cron jobs installed
- [ ] Successfully tested CEO agent
- [ ] Successfully tested board meeting
- [ ] Successfully tested CEO execution
- [ ] Can access remotely via SSH
- [ ] Backups configured

**If all checked: ✅ PRODUCTION READY!**

---

## What Happens Next

### Automatic Operation

**Daily (9am VPS time):**
- Board meeting triggers
- 7 board members analyze opportunities
- Coordinator synthesizes decision

**Daily (10am VPS time):**
- CEO reads board decision
- Plans execution
- Spawns workers if needed
- Begins implementation

**Weekly (Sunday 10pm):**
- All agents reflect on week
- Update MEMORY.md
- Improve patterns

**Monthly (1st, 11pm):**
- Deep meta-learning
- Analyze trends
- Set improvement goals

**Every 6 hours:**
- Vault syncs to Obsidian format

### First Week Expected Results

**Day 1:** First board meeting, first decision
**Day 2-3:** CEO builds first product
**Day 4:** Launch
**Day 5-7:** Monitor for first sales
**Day 8-14:** First revenue likely

### Monitoring

**From your local machine:**
```bash
# Check daily
ssh agentforge@YOUR_VPS_IP "~/monitor-agentforge.sh"

# Sync vault weekly
rsync -avz agentforge@YOUR_VPS_IP:/home/agentforge/agentforge/.obsidian-vault/ ~/agentforge-vault/
# Open in Obsidian to audit
```

---

## Support Resources

**Documentation:**
- `README_AGENTFORGE.md` - Complete system guide
- `STRATEGIC_LEARNING_SYSTEM.md` - How agents learn
- `ZERO_CAPITAL_CONSTRAINT.md` - $0 capital system
- `UNLIMITED_OPPORTUNITY.md` - Autonomy philosophy

**Testing:**
- `PRE_LAUNCH_QA.md` - QA procedures
- `START_TESTING_NOW.md` - Quick testing guide

**Logs:**
- `/tmp/agentforge-*.log` - Operation logs
- `sudo journalctl -u moltbot-gateway` - Gateway logs
- `~/.moltbot/agents/*/memory/*.jsonl` - Agent sessions

---

## You're Ready!

**Your AgentForge is now:**
- ✅ Running 24/7 on VPS
- ✅ Fully automated (cron jobs)git ad
- ✅ Secured (firewall, systemd)
- ✅ Monitored (logs, scripts)
- ✅ Backed up (automated)
- ✅ Remotely accessible (SSH)

**The board will:**
- Meet daily at 9am
- Analyze opportunities
- Make decisions

**The CEO will:**
- Execute daily at 10am
- Build products
- Generate revenue

**You will:**
- Monitor progress remotely
- Review in Obsidian vault
- Watch capital grow from $0

**🚀 Let the AI board build your business empire!**


# Create or edit the plist / service config so the service gets the env.
# For Homebrew on macOS, often:
launchctl setenv OLLAMA_NUM_CTX 32768
# Then restart the Ollama app / service.