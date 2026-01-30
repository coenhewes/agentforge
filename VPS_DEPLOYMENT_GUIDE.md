# AgentForge - Ubuntu 22.04 LTS VPS Deployment Guide

**Fresh deploy only.** Use this guide when deploying AgentForge on a new Ubuntu VPS from scratch. (For upgrading an existing VPS, see [VPS_UPGRADE_GUIDE.md](VPS_UPGRADE_GUIDE.md).)

---

## Prerequisites

### What You Need

**VPS (minimum):**
- Ubuntu 22.04 LTS
- 2 CPU cores
- 4GB RAM (8GB recommended)
- 20GB disk
- Public IP or domain (optional)

**Local:**
- SSH client, terminal

**API keys:**
- **Google (Gemini)** – required for the recommended model plan (board, CEO, image). Get key: https://aistudio.google.com/apikey
- **(Optional)** OpenAI API key for fallback and/or Codex (developer subagents): https://platform.openai.com/api-keys

---

## Step 1: Initial VPS Setup (10 minutes)

### 1a. Connect

```bash
ssh root@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with your VPS IP or hostname.

### 1b. Non-root user

```bash
adduser agentforge
usermod -aG sudo agentforge
su - agentforge
```

**Run all following steps as `agentforge`.**

### 1c. Update system

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Step 2: Install Dependencies (15 minutes)

### 2a. Node.js 22.x

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v22.x.x
```

### 2b. pnpm

```bash
sudo npm install -g pnpm
pnpm --version
```

### 2c. Git and build tools

```bash
sudo apt install -y git build-essential python3
```

### 2d. Playwright (browser automation)

System libraries required for Playwright-driven browser automation:

```bash
sudo apt install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libdbus-1-3 \
  libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libpango-1.0-0 libcairo2 libasound2
```

### 2e. Google Chrome (for managed browser on Linux)

On Ubuntu, the default Chromium package is a snap stub and causes CDP (browser control) issues. For agent browser automation you need Google Chrome installed:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y
```

You must also complete **Step 5h (Configure browser for VPS)** after init so the managed browser is fully deployed.

### 2f. Optional: bird (Twitter/X CLI)

If agents will use Twitter/X (tweet, search, read threads), install the bird CLI:

```bash
sudo npm install -g @steipete/bird
bird whoami   # verify (auth is cookie-based; configure separately)
```

Other skills (e.g. GitHub, Vercel, Stripe) are configured in later steps; see `skills/` in the repo for the full list.

---

## Step 3: Clone and Build (10 minutes)

### 3a. Clone

```bash
cd ~
git clone https://github.com/coenhewes/agentforge.git agentforge
cd agentforge
```

Use your own fork or the AgentForge repo URL; the folder name (`agentforge`) is used in paths below.

### 3b. Install and build

```bash
pnpm install
pnpm build
ls -la dist/   # should include entry.js, cli.js, agentforge/, etc.
```

The guide uses **`node dist/entry.js`** for all CLI commands. That file is created by `pnpm build` and works even if `moltbot.mjs` is not present in the clone.

### 3c. Playwright browsers (Chrome recommended)

Install the browser(s) Playwright will drive. Use **Chrome** (not Chromium) for best compatibility with agent browser automation:

```bash
pnpx playwright install chrome
```

Optional: also install Chromium if you want a fallback:

```bash
pnpx playwright install chromium
```

---

## Step 4: Initialize AgentForge (5 minutes)

### 4a. Run init

```bash
cd ~/agentforge
node dist/entry.js init:agentforge
```

This:

- Copies board (cfo, cto, cmo, coo, analyst, risk, innovation), coordinator, and CEO workspaces to `~/.moltbot/agents/`
- Sets `tools.exec.security=full`, `tools.exec.ask=off` (headless/cron)
- Sets `sandbox.mode=off` for all AgentForge agents
- Registers 9 agents with **Gemini 3 Pro** (board, coordinator, CEO) and **Nano Banana Pro** (image)
- Writes cron template to `~/.moltbot/agentforge-cron.txt`

### 4b. Verify

```bash
ls ~/.moltbot/agents/
# board  ceo  coordinator

ls ~/.moltbot/agents/board/
# analyst  cfo  cmo  coo  cto  innovation  risk

cat ~/.moltbot/agentforge-cron.txt
# Board 9am, CEO 10am, weekly reflection, monthly learning
```

The seven board members (analyst, cfo, cmo, coo, cto, risk, innovation) live under `board/`; CEO and coordinator are top-level.

### 4c. Next steps (from init)

1. Set AI provider: follow **Step 5a** below (add Gemini API key to config with `jq`). For interactive setup instead, run `node dist/entry.js onboard`.
2. GitHub: `node dist/entry.js setup:github` (required for building products)
3. Vercel: `node dist/entry.js setup:vercel` (required for deploying products)
4. Start gateway: `node dist/entry.js gateway run --port 18789`
5. First board meeting: `./scripts/board-meeting.sh`
6. Coordinator TUI: `node dist/entry.js tui --session agent:coordinator:main`
7. CEO execution: `./scripts/ceo-implement.sh`
8. Install cron (and CEO heartbeat – see Step 8)

---

## Step 5: Configure AI Provider and config (5 minutes)

The config file **`~/.clawdbot/moltbot.json`** is created by init (Step 4) and then filled in here. Complete 5a (AI provider), 5h (browser), 5h2 (gateway auth token), and 5i (verify) so the config is **fully ready** before you start the gateway (Step 6).

### 5a. Recommended: Google (Gemini 3 Pro + Nano Banana Pro)

Required for the default AgentForge model plan (board, CEO, image).

```bash
# Install jq if needed
sudo apt install -y jq

# Set your Gemini API key
GEMINI_KEY="YOUR_GEMINI_API_KEY"

jq --arg key "$GEMINI_KEY" '.models.providers.google = {
  "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
  "apiKey": $key,
  "api": "google-generative-ai",
  "models": [
    {
      "id": "gemini-3-pro-preview",
      "name": "Gemini 3 Pro",
      "api": "google-generative-ai",
      "reasoning": true,
      "input": ["text", "image"],
      "cost": { "input": 2, "output": 12, "cacheRead": 0, "cacheWrite": 0 },
      "contextWindow": 1000000,
      "maxTokens": 65536
    },
    {
      "id": "gemini-3-flash-preview",
      "name": "Gemini 3 Flash",
      "api": "google-generative-ai",
      "reasoning": true,
      "input": ["text", "image"],
      "cost": { "input": 0.5, "output": 3, "cacheRead": 0, "cacheWrite": 0 },
      "contextWindow": 1000000,
      "maxTokens": 65536
    },
    {
      "id": "gemini-3-pro-image-preview",
      "name": "Nano Banana Pro (Gemini 3 Pro Image)",
      "api": "google-generative-ai",
      "reasoning": true,
      "input": ["text", "image"],
      "cost": { "input": 2, "output": 0.134, "cacheRead": 0, "cacheWrite": 0 },
      "contextWindow": 65536,
      "maxTokens": 32768
    }
  ]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

Get key: https://aistudio.google.com/apikey

### 5b. Optional: OpenAI (fallback / Codex)

For default fallback and/or developer subagents (Codex):

```bash
# Fallback only
jq '.agents.defaults.model.fallbacks = ["openai/gpt-5-mini"]' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json

# Add OpenAI provider if not present (replace sk-... with your key)
jq '.models.providers.openai = {
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-YOUR_OPENAI_KEY",
  "api": "openai-responses",
  "models": [{"id": "gpt-5-mini", "name": "gpt-5-mini", "api": "openai-responses", "reasoning": false, "input": ["text"], "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0}, "contextWindow": 200000, "maxTokens": 16384}]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

Codex: use `node dist/entry.js models auth login --provider openai-codex` so the CEO can pass the Codex model when spawning coding workers. No extra cron change; CEO SOUL already instructs this.

### 5c. Other providers (alternatives to Gemini)

You can use **Anthropic** or **Ollama** instead; then set `agents.list` and `agents.defaults.model` to the IDs you use. For the full AgentForge board/CEO/image plan, Gemini 3 Pro + Nano Banana Pro is recommended (see [VPS_UPGRADE_GUIDE.md](VPS_UPGRADE_GUIDE.md)).

### 5d. Verify config

```bash
cat ~/.clawdbot/moltbot.json | jq .
```

Fix JSON5 errors by re-running init then re-applying provider blocks with `jq` (do not append raw JSON).

---

## Step 5e: GitHub Access (required)

Agents need GitHub to build and manage repos.

```bash
cd ~/agentforge
node dist/entry.js setup:github
```

Follow prompts (username, email, personal access token with `repo`, `workflow`, `user:email`). Or set `git config` and `GITHUB_TOKEN` manually.

---

## Step 5f: Vercel (required)

Agents need Vercel to deploy products.

```bash
node dist/entry.js setup:vercel
```

Follow prompts to store token and test connection.

---

## Step 5g: Financial and Venture State (optional)

Venture state is stored in SQLite per workspace. Default workspace: `~/.moltbot/ventures/default/`; DB path: `~/.moltbot/ventures/default/ops/venture.sqlite`.

- **Investments, transactions, capital, payment_cards** are created and updated by the CEO and runloop; you can add **initial capital** via the Investment Portal or by running a one-off sync from LEDGER.
- **LEDGER ↔ SQLite sync:** After CEO runs, sync with:
  ```bash
  cd ~/agentforge && node scripts/sync-ledger.mjs
  ```
  Options: `--to-sqlite`, `--to-markdown`, `--ledger <path>`, `--workspace <dir>`. The CEO heartbeat script (Step 8) runs this after each heartbeat.
- **Stripe (optional):** So revenue can sync into venture state, set Stripe keys in one of two ways.

  **Option A – Env (recommended):** Add to `~/.agentforge-env` (create the file if needed; same file used in Step 6a):

  ```bash
  echo "STRIPE_SECRET_KEY=sk_live_YOUR_KEY" >> ~/.agentforge-env
  echo "STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY" >> ~/.agentforge-env
  chmod 600 ~/.agentforge-env
  ```

  Use your real secret/publishable keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys). The publishable key is optional; the secret key is required for sync.

  **Option B – Config:** Merge Stripe into `~/.clawdbot/moltbot.json` under `humanInterface.agentforge.stripe` (keeps any existing `humanInterface.agentforge` keys):

  ```bash
  jq '.humanInterface.agentforge = ((.humanInterface.agentforge // {}) + {
    "stripe": {
      "enabled": true,
      "secretKey": "sk_live_YOUR_SECRET_KEY",
      "publicKey": "pk_live_YOUR_PUBLISHABLE_KEY"
    }
  })' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
  ```

  Replace the placeholder strings with your keys. After a deploy with the schema that allows `humanInterface`, this key is valid; if you see "Unrecognized key: humanInterface", see Troubleshooting below.

- **Investment Portal (operator UI):** From a machine with access to the VPS (or on VPS with display):
  ```bash
  node dist/entry.js portal
  ```
  Use `--workspace <dir>` and `--venture <id>` as needed. Use for capital, ventures, workers, logs, settings.

---

## Step 5h: Configure browser for VPS (required for browser automation)

For agent browser automation to work on the VPS, the gateway must know which browser to use and how to run it headless. If you installed Google Chrome in Step 2e, set the browser config **after** init (and after AI provider config) so the deployment is complete.

**1. Merge browser config into `~/.clawdbot/moltbot.json`:**

```bash
jq '.browser = ((.browser // {}) + {
  "enabled": true,
  "defaultProfile": "clawd",
  "executablePath": "/usr/bin/google-chrome-stable",
  "headless": true,
  "noSandbox": true
})' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

`defaultProfile: "clawd"` makes agents use the managed browser (no Chrome extension needed on VPS).

**2. Verify:**

```bash
cat ~/.clawdbot/moltbot.json | jq '.browser'
```

You should see `enabled: true`, `defaultProfile: "clawd"`, `executablePath: "/usr/bin/google-chrome-stable"`, `headless: true`, `noSandbox: true`. Restart the gateway after changing config so it picks up the browser settings.

If you did not install Google Chrome in Step 2e, install it first, then run the `jq` command above. For other options (e.g. snap Chromium with attach-only mode), see `docs/tools/browser-linux-troubleshooting.md`.

---

## Step 5h2: Set gateway auth token (required to start the gateway)

The gateway uses **token** auth by default. You must set a token or it will refuse to start with: *"Gateway auth is set to token, but no token is configured."*

**1. Generate a token and write it into config:**

```bash
GATEWAY_TOKEN=$(openssl rand -hex 32)
jq --arg token "$GATEWAY_TOKEN" '.gateway.auth = ((.gateway.auth // {}) + {"mode": "token", "token": $token})' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**2. (Optional) Add to `~/.agentforge-env`** so manual runs and CLI calls have it without reading config:

```bash
echo "CLAWDBOT_GATEWAY_TOKEN=$GATEWAY_TOKEN" >> ~/.agentforge-env
# If you haven't created the file yet: chmod 600 ~/.agentforge-env
```

If you already created `~/.agentforge-env` in Step 6a, run the `echo` line above (reuse the same `$GATEWAY_TOKEN` from step 1, or read it from config). The gateway and any CLI that talks to it (e.g. `node dist/entry.js agent ...`) will use this token.

**3. Verify:**

```bash
# Token is in config (do not print it in logs)
jq '.gateway.auth.mode, (.gateway.auth.token != null)' ~/.clawdbot/moltbot.json
# Should show: "token" and true
```

**Manual run:** To start the gateway by hand for testing, either `export CLAWDBOT_GATEWAY_TOKEN="$GATEWAY_TOKEN"` (or `source ~/.agentforge-env`) then `node dist/entry.js gateway run --port 18789`, or pass the token: `node dist/entry.js gateway run --port 18789 --token "$GATEWAY_TOKEN"`.

---

## Step 5i: Verify config is complete

By this point `~/.clawdbot/moltbot.json` must contain everything needed for a full deploy. Run this check **after** completing 5a (provider), 5h (browser), and 5h2 (gateway token):

```bash
# Required: gateway (mode + auth token), tools, agents, Google provider, browser
jq 'if .gateway.mode and .gateway.auth.token and .tools.exec and (.agents.list | length) == 9 and .models.providers.google and .browser.enabled and .browser.executablePath then "Config OK" else "Config incomplete: check gateway.mode, gateway.auth.token, tools, agents.list (9), models.providers.google, browser" end' ~/.clawdbot/moltbot.json
```

You should see `"Config OK"`. If not, re-run the step that sets the missing part (init for gateway/tools/agents, 5a for Google provider, 5h for browser, 5h2 for gateway token).

**What the config contains by end of Step 5:**

| Set by | Keys |
|--------|------|
| init (Step 4) | `gateway.mode`, `tools.exec`, `tools.agentToAgent`, `agents.list` (9 agents), `agents.defaults` (model, imageModel, budget) |
| Step 5a | `models.providers.google` (API key + models) |
| Step 5h | `browser.enabled`, `browser.defaultProfile`, `browser.executablePath`, `browser.headless`, `browser.noSandbox` |
| Step 5h2 | `gateway.auth.mode`, `gateway.auth.token` (required to start the gateway) |

Optional: Step 5b adds `models.providers.openai` and fallbacks; Step 5g can add Stripe under `humanInterface.agentforge.stripe`. Once the check above prints `"Config OK"`, the config is ready and you can start the gateway (Step 6).

**By the end of the guide, all keys, settings, and credentials are in place:**

- **In `~/.clawdbot/moltbot.json`:** All required keys and settings (gateway including **gateway.auth.token**, tools, agents, models.providers.google, browser). You supply: **Gemini API key** in Step 5a; **gateway token** in Step 5h2 (generated with `openssl rand -hex 32`).
- **GitHub and Vercel:** Stored by `setup:github` and `setup:vercel` (e.g. `~/.bashrc`). So the gateway run by **systemd** can see them, you must add an env file and `EnvironmentFile` in Step 6a below. Optionally add `CLAWDBOT_GATEWAY_TOKEN` to that file (same value as in config) so manual runs and CLI have it.
- **Optional:** OpenAI key (5b), Stripe keys (5g) — add if you use those features.

---

## Step 6: Gateway as System Service (10 minutes)

### 6a. Env file for gateway (so it has GitHub + Vercel)

Systemd does not source `~/.bashrc`, so the gateway process will not see `GITHUB_TOKEN` or `VERCEL_TOKEN` unless we pass them. Create an env file (use the same token values you used in Step 5e and 5f):

```bash
# If GITHUB_TOKEN and VERCEL_TOKEN are already in your environment (e.g. you ran setup:github and setup:vercel in this session and they were added to ~/.bashrc), copy them into the env file:
cat > ~/.agentforge-env << EOF
GITHUB_TOKEN=$GITHUB_TOKEN
VERCEL_TOKEN=$VERCEL_TOKEN
EOF
chmod 600 ~/.agentforge-env
```

If not, create `~/.agentforge-env` manually and add one line per variable with the same token values you used in Step 5e and 5f, then run `chmod 600 ~/.agentforge-env`. The gateway will read this file when started by systemd (Step 6b).

### 6b. Systemd unit

```bash
sudo tee /etc/systemd/system/agentforge-gateway.service > /dev/null << 'EOF'
[Unit]
Description=Moltbot Gateway for AgentForge
After=network.target

[Service]
Type=simple
User=agentforge
WorkingDirectory=/home/agentforge/agentforge
ExecStart=/usr/bin/node /home/agentforge/agentforge/dist/entry.js gateway run --port 18789 --bind 0.0.0.0
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=agentforge-gateway
Environment=NODE_ENV=production
Environment=HOME=/home/agentforge
EnvironmentFile=-/home/agentforge/.agentforge-env
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
```

The `EnvironmentFile=-/home/agentforge/.agentforge-env` line loads `GITHUB_TOKEN` and `VERCEL_TOKEN` (the `-` means do not fail if the file is missing).

### 6c. Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable agentforge-gateway
sudo systemctl start agentforge-gateway
sudo systemctl status agentforge-gateway
```

### 6d. Check

```bash
ss -ltnp | grep 18789
sudo journalctl -u agentforge-gateway -f
```

---

## Step 7: Firewall (5 minutes)

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 18789/tcp
sudo ufw enable
sudo ufw status
```

Allow SSH (22) before enabling UFW.

---

## Step 8: Cron Jobs (5 minutes)

Make scripts executable, then install crontab.

```bash
cd ~/agentforge
chmod +x scripts/*.sh
```

**Recommended crontab** (includes CEO heartbeat every 30 minutes; template in `~/.moltbot/agentforge-cron.txt` does not include heartbeat – add it manually):

```cron
# AgentForge - Daily Board Meeting (9am)
0 9 * * * cd /home/agentforge/agentforge && ./scripts/board-meeting.sh >> /tmp/agentforge-board.log 2>&1

# AgentForge - CEO Implementation (10am, after board)
0 10 * * * cd /home/agentforge/agentforge && ./scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1

# AgentForge - CEO Heartbeat (every 30 min) – continuous oversight, workers, venture runloop, LEDGER sync
*/30 * * * * cd /home/agentforge/agentforge && ./scripts/ceo-heartbeat.sh >> /tmp/agentforge-heartbeat.log 2>&1

# AgentForge - Weekly Reflection (Sun 10pm)
0 22 * * 0 cd /home/agentforge/agentforge && ./scripts/weekly-reflection.sh >> /tmp/agentforge-reflection.log 2>&1

# AgentForge - Monthly Meta-Learning (1st 11pm)
0 23 1 * * cd /home/agentforge/agentforge && ./scripts/monthly-learning.sh >> /tmp/agentforge-learning.log 2>&1
```

Install:

```bash
crontab -e
# Paste the block above; adjust paths if your repo is elsewhere (e.g. /home/agentforge/agentforge)
```

Or append to existing crontab:

```bash
(crontab -l 2>/dev/null; cat ~/.moltbot/agentforge-cron.txt) | crontab -
# Then crontab -e and add the CEO heartbeat line (*/30 * * * * ... ceo-heartbeat.sh ...)
```

**What the CEO heartbeat does:** Sends a heartbeat prompt to the CEO, then for each active investment in LEDGER runs `node dist/entry.js venture:tick --venture <id>`, then runs `scripts/sync-ledger.mjs`.

Verify:

```bash
crontab -l
```

---

## Step 9: Test (10 minutes)

### Gateway

```bash
curl http://localhost:18789/health
```

### CEO

```bash
cd ~/agentforge
node dist/entry.js agent --agent ceo --message "What is your role and current capital?"
```

### LEDGER and venture state

After first CEO run:

```bash
cat ~/.moltbot/agents/ceo/LEDGER.md
node dist/entry.js portal
```

---

## Step 10: First Board Meeting (10 minutes)

**With TUI (interactive):**

```bash
cd ~/agentforge
./scripts/board-meeting.sh --tui
```

**Without TUI (e.g. cron):**

```bash
./scripts/board-meeting.sh
```

Monitor: `tail -f /tmp/agentforge-board.log`

Then check coordinator decision:

```bash
node dist/entry.js tui --session agent:coordinator:main
```

---

## Step 11: First CEO Execution (5 minutes)

```bash
./scripts/ceo-implement.sh
tail -f /tmp/agentforge-ceo.log
```

Check CEO session and LEDGER:

```bash
node dist/entry.js tui --session agent:ceo:main
cat ~/.moltbot/agents/ceo/LEDGER.md
```

Optional: run LEDGER ↔ SQLite sync and open Investment Portal:

```bash
node scripts/sync-ledger.mjs
node dist/entry.js portal
```

---

## Step 12: Monitor and Maintain

**Logs:**

- Gateway: `sudo journalctl -u agentforge-gateway -f`
- Board: `tail -f /tmp/agentforge-board.log`
- CEO: `tail -f /tmp/agentforge-ceo.log`
- Heartbeat: `tail -f /tmp/agentforge-heartbeat.log`

**Sessions / state:**

- `node dist/entry.js tui --session agent:ceo:main` (or coordinator, cfo, etc.)
- `node dist/entry.js portal` (ventures, capital, workers, logs, settings)
- `cat ~/.moltbot/agents/ceo/LEDGER.md`
- Human requests: `ls ~/.moltbot/human-requests/`

**Restart gateway:**

```bash
sudo systemctl restart agentforge-gateway
```

**Update code:**

```bash
cd ~/agentforge
git pull --rebase origin main
pnpm install
pnpm build
sudo systemctl restart agentforge-gateway
```

---

## Step 13: Remote Access

**SSH tunnel (local machine):**

```bash
ssh -L 18789:localhost:18789 agentforge@YOUR_VPS_IP
# Then curl http://localhost:18789/health on local
```

**Remote commands:**

```bash
ssh agentforge@YOUR_VPS_IP "cd agentforge && node dist/entry.js agent --agent ceo --message 'Status?'"
```

**Connect Mac models (e.g. Ollama) to VPS:** Use a reverse SSH tunnel from Mac: `ssh -R 11434:localhost:11434 agentforge@YOUR_VPS_IP -N`. On VPS set Ollama `baseUrl` to `http://127.0.0.1:11434/v1` if needed. See previous versions of this guide or VPS_UPGRADE_GUIDE for full steps.

---

## Step 14: Obsidian Vault (optional)

Sync vault from VPS to local:

```bash
rsync -avz --progress agentforge@YOUR_VPS_IP:/home/agentforge/agentforge/.obsidian-vault/ ./agentforge-vault/
```

---

## Security

- Prefer SSH keys: `ssh-copy-id agentforge@YOUR_VPS_IP`
- API keys and secrets in `~/.clawdbot/moltbot.json` or `~/.agentforge-env`; never commit these files
- Optional: fail2ban, disable SSH password auth

---

## Troubleshooting

**"Cannot find module moltbot.mjs":** Use `node dist/entry.js` for all commands (e.g. `node dist/entry.js init:agentforge`). The guide uses `dist/entry.js`; ensure `pnpm build` has been run.

**"Unrecognized key: humanInterface":** The config schema now allows `humanInterface` (used for Stripe, heartbeat, venture runloop, etc.). Update and rebuild: `cd ~/agentforge && git pull --rebase && pnpm build`. If you previously ran `moltbot doctor --fix` and it removed `humanInterface`, re-add the Stripe block with the Option B `jq` command in Step 5g.

**"Gateway auth is set to token, but no token is configured":** Complete **Step 5h2** (generate a token with `openssl rand -hex 32` and set `gateway.auth.token` in config via `jq`). Then restart the gateway.

**Gateway won’t start:** `sudo journalctl -u agentforge-gateway -n 100`. Check port 18789, config JSON, and `pnpm build`.

**Agent not responding:** Confirm gateway is up and API keys in `~/.clawdbot/moltbot.json`. Test: `node dist/entry.js agent --agent ceo --message "test"`.

**Board meeting fails:** See `tail -100 /tmp/agentforge-board.log`, run `./scripts/board-meeting.sh` manually, increase timeout in config if needed (see VPS_CONFIG_UPDATE.md).

**Cron not running:** `sudo systemctl status cron`, `crontab -l`, `grep CRON /var/log/syslog`. Run `./scripts/ceo-heartbeat.sh` and `./scripts/board-meeting.sh` by hand to verify.

**venture:tick:** Use `node dist/entry.js venture:tick --venture <ventureId>`. Venture ID is the investment id (e.g. from LEDGER.md). Heartbeat script parses active IDs from LEDGER and runs tick for each.

**GitHub/Vercel not available to gateway:** Ensure `~/.agentforge-env` exists with `GITHUB_TOKEN` and `VERCEL_TOKEN` and the unit uses `EnvironmentFile=-/home/agentforge/.agentforge-env` (Step 6a). Restart the gateway after editing the env file.

**sync-ledger "unable to open database file":** The venture-state code creates the DB directory if missing. If you still see this, check `--workspace` points to the correct venture dir (default `~/.moltbot/ventures/default/`) and that the user has write permission.

---

## Backup

Include agent workspaces, config, vault, human-requests, and venture state:

```bash
tar -czf agentforge-backup-$(date +%Y%m%d).tar.gz \
  ~/.moltbot/agents/ \
  ~/.moltbot/ventures/ \
  ~/.moltbot/human-requests/ \
  ~/.clawdbot/moltbot.json \
  ~/.agentforge-env \
  ~/agentforge/.obsidian-vault/
```

---

## Quick Reference

| Task | Command |
|------|--------|
| Gateway | `sudo systemctl start/stop/restart agentforge-gateway` |
| Logs | `sudo journalctl -u agentforge-gateway -f`, `tail -f /tmp/agentforge-*.log` |
| CEO | `node dist/entry.js agent --agent ceo --message "…"` |
| Portal | `node dist/entry.js portal` |
| Board meeting | `./scripts/board-meeting.sh` or `./scripts/board-meeting.sh --tui` |
| CEO run | `./scripts/ceo-implement.sh` |
| LEDGER sync | `node scripts/sync-ledger.mjs` |
| Venture tick | `node dist/entry.js venture:tick --venture <id>` |

---

## Success Checklist

- [ ] VPS updated, non-root user `agentforge`
- [ ] Node 22, pnpm, git, build tools, Playwright system deps
- [ ] Playwright browser installed (`pnpx playwright install chrome`; optional: Google Chrome .deb, bird)
- [ ] Repo cloned, `pnpm install`, `pnpm build`
- [ ] `node dist/entry.js init:agentforge` completed
- [ ] AI provider configured (Gemini 3 Pro + Nano Banana Pro recommended)
- [ ] GitHub and Vercel configured
- [ ] Browser config set for VPS (Step 5h: defaultProfile, executablePath, headless, noSandbox)
- [ ] Gateway auth token set (Step 5h2: gateway.auth.token in config)
- [ ] Config verified complete (Step 5i: jq check prints "Config OK")
- [ ] Env file `~/.agentforge-env` with GITHUB_TOKEN and VERCEL_TOKEN (Step 6a) so gateway has all credentials
- [ ] Gateway running as systemd service
- [ ] UFW: 22, 18789 allowed
- [ ] Cron: board 9am, CEO 10am, **CEO heartbeat every 30 min**, weekly/monthly
- [ ] Board meeting and CEO execution tested
- [ ] LEDGER and (optional) portal checked

---

## What Runs Automatically

- **Daily 9am:** Board meeting → coordinator decision
- **Daily 10am:** CEO implementation (read decision, plan, spawn workers, update LEDGER)
- **Every 30 min:** CEO heartbeat (oversight, workers, venture runloop, LEDGER sync)
- **Weekly (Sun 10pm):** Reflection
- **Monthly (1st 11pm):** Meta-learning

---

## Support

- `README_AGENTFORGE.md`, `docs/start/ceo-quickstart.md`
- Upgrade path: [VPS_UPGRADE_GUIDE.md](VPS_UPGRADE_GUIDE.md)
- Two-way board flow: [VPS_UPGRADE_BOARD_TWO_WAY.md](VPS_UPGRADE_BOARD_TWO_WAY.md)
