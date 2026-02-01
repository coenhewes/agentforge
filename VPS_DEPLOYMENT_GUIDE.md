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

On Ubuntu, the default Chromium package is a snap stub and causes CDP (browser control) issues. For agent browser automation use **Google Chrome** (not Chromium). In Step 5h you will set `browser.executablePath`, `browser.headless: true`, and `browser.noSandbox: true` in config.

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
pnpm ui:build
ls -la dist/   # should include entry.js, cli.js, agentforge/, control-ui/, etc.
```

- **`pnpm build`** – CLI and gateway runtime.
- **`pnpm ui:build`** – Gateway control UI (web UI). Without it, the gateway will report "Control UI assets not found" when you open it in a browser or hit the health/root URL.

The guide uses **`node dist/entry.js`** for all CLI commands. That file is created by `pnpm build` and works even if `moltbot.mjs` is not present in the clone. From repo root you can also run **`pnpm moltbot`** (or `pnpm dev`) when developing; on the VPS use **`node dist/entry.js`** so cron and scripts (e.g. `board-meeting.sh`, `ceo-heartbeat.sh`) work after build.

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

The eight board members (analyst, cfo, cmo, coo, cto, risk, innovation, pr) live under `board/`; CEO and coordinator are top-level. PR (PR Lead) creates Moltbook content each board meeting; PR does not vote on ventures.

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

The config file **`~/.clawdbot/moltbot.json`** is created by init (Step 4) and then filled in here. Complete 5a (AI provider), 5h (browser), 5h2 (gateway auth token), and 5i (verify) so the config is **fully ready** before you start the gateway (Step 6). The schema supports optional **`humanInterface`** (e.g. for Stripe, ventures, capital); if you see **"Unrecognized key: humanInterface"**, update the repo and run `pnpm build` so the config validator includes it (see Troubleshooting).

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

**Model fallback and context window:** Set `agents.defaults.model.fallbacks` so when the primary model fails (e.g. 429 quota), the system tries the next. Example: primary Gemini 3 Pro, fallback `openai/gpt-5-mini` (see 5b). Ensure fallback models have sufficient context window for your prompts; model definitions in config include `contextWindow` and `maxTokens`.

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

**GitHub CLI (gh):** Agents run `gh repo create` and `gh` for pushing. Install the CLI so the gateway process can use it (systemd uses a minimal PATH; install to a path the service sees, e.g. `/usr/bin` or `/usr/local/bin`):

```bash
# Ubuntu 22+: install gh from system package manager (in PATH for systemd)
sudo apt update && sudo apt install -y gh
gh auth status
```

If your distro doesn’t have `gh` in apt, install from [GitHub CLI releases](https://github.com/cli/cli/releases) and put the binary in `/usr/local/bin`. If `gh` is only in your user PATH (e.g. `~/.local/bin`), add `PATH="/home/agentforge/.local/bin:$PATH"` to `~/.agentforge-env` and restart the gateway.

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

  **Check Stripe keys:** If using env, ensure `STRIPE_SECRET_KEY` is in `~/.agentforge-env` and the gateway unit uses `EnvironmentFile` (Step 6a). If using config, run `jq '.humanInterface.agentforge.stripe' ~/.clawdbot/moltbot.json` — you should see `enabled: true` and `secretKey` (never log or paste the key). Keys are at [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys).

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
  "noSandbox": true,
  "requestTimeoutMs": 15000,
  "remoteCdpTimeoutMs": 3000,
  "remoteCdpHandshakeTimeoutMs": 5000
})' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

`defaultProfile: "clawd"` makes agents use the managed browser (no Chrome extension needed on VPS).

**2. Verify:**

```bash
cat ~/.clawdbot/moltbot.json | jq '.browser'
```

You should see `enabled: true`, `defaultProfile: "clawd"`, `executablePath: "/usr/bin/google-chrome-stable"`, `headless: true`, `noSandbox: true`, plus timeout settings (`requestTimeoutMs`, `remoteCdpTimeoutMs`, `remoteCdpHandshakeTimeoutMs`). Restart the gateway after changing config so it picks up the browser settings.

**Verify browser is working:**
```bash
# After gateway restart, test browser control
node dist/entry.js browser --browser-profile clawd status
node dist/entry.js browser --browser-profile clawd open https://example.com
node dist/entry.js browser --browser-profile clawd snapshot
```

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

**Manual run:** To start the gateway by hand for testing, run `node dist/entry.js gateway run --port 18789` (the CLI automatically loads `~/.agentforge-env` if present, or the file at `AGENTFORGE_ENV`). Or pass the token explicitly: `node dist/entry.js gateway run --port 18789 --token "$GATEWAY_TOKEN"`.

---

## Step 5i: Verify config is complete

By this point `~/.clawdbot/moltbot.json` must contain everything needed for a full deploy. Run this check **after** completing 5a (provider), 5h (browser), and 5h2 (gateway token):

```bash
# Required: gateway (mode + auth token), tools, agents, model provider (google or openai), browser
jq 'if .gateway.mode and .gateway.auth.token and .tools.exec and (.agents.list | length) == 10 and (.models.providers.google or .models.providers.openai) and .browser.enabled and .browser.executablePath then "Config OK" else "Config incomplete: check gateway.mode, gateway.auth.token, tools, agents.list (10), models.providers (google or openai), browser" end' ~/.clawdbot/moltbot.json
```

You should see `"Config OK"`. If not, re-run the step that sets the missing part (init for gateway/tools/agents, 5a for Google provider or 5b for OpenAI, 5h for browser, 5h2 for gateway token).

**What the config contains by end of Step 5:**

| Set by | Keys |
|--------|------|
| init (Step 4) | `gateway.mode`, `tools.exec`, `tools.agentToAgent`, `agents.list` (10 agents), `agents.defaults` (model, imageModel, budget) |
| Step 5a or 5b | At least one of `models.providers.google` or `models.providers.openai` (API key + models) |
| Step 5h | `browser.enabled`, `browser.defaultProfile`, `browser.executablePath`, `browser.headless`, `browser.noSandbox` |
| Step 5h2 | `gateway.auth.mode`, `gateway.auth.token` (required to start the gateway) |

Optional: Step 5b adds `models.providers.openai` (and fallbacks if you use 5a); Step 5g can add Stripe under `humanInterface.agentforge.stripe`. Once the check above prints `"Config OK"`, the config is ready and you can start the gateway (Step 6).

**By the end of the guide, all keys, settings, and credentials are in place:**

- **In `~/.clawdbot/moltbot.json`:** All required keys and settings (gateway including **gateway.auth.token**, tools, agents, at least one of **models.providers.google** or **models.providers.openai**, browser). You supply: **Gemini API key** in Step 5a and/or **OpenAI API key** in Step 5b; **gateway token** in Step 5h2 (generated with `openssl rand -hex 32`).
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
# Optional: resource limits for long unattended runs (adjust for your VPS)
# MemoryMax=2G
# LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

- **Restart policy:** `Restart=always` and `RestartSec=10` make systemd restart the gateway after a crash or OOM so it does not stay down until you intervene.
- **Optional resource limits:** On small VPS, uncomment `MemoryMax=2G` (or lower) to cap gateway memory so the box does not OOM; set `LimitNOFILE=65536` if you hit “too many open files” under load. Then run `sudo systemctl daemon-reload` and `sudo systemctl restart agentforge-gateway`.

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

### 6e. Full autonomy (sudo)

If you want agents to install packages and run system commands on the VPS (e.g. `sudo npm i -g moltbot`, `sudo systemctl restart agentforge-gateway`), do the following. **This gives the gateway full exec autonomy; only do it on a machine you trust.**

1. **Sudo password in env**  
   Add to `~/.agentforge-env` (same file loaded by systemd in 6b):

   ```bash
   export SUDO_PASS='your-sudo-password'
   ```

   The gateway inherits this env when systemd starts it. `SUDO_PASS` is not stripped by the exec sanitizer, so child shells can use it. Agents can run:

   ```bash
   echo "$SUDO_PASS" | sudo -S npm i -g moltbot
   echo "$SUDO_PASS" | sudo -S systemctl restart agentforge-gateway
   ```

2. **Config: allow all exec (no allowlist, no approval)**  
   In `~/.clawdbot/moltbot.json` (or `~/.openclaw/moltbot.json` if you use that state dir), set exec to full and ask off so the agent is not blocked by allowlist or approval prompts:

   ```json
   "tools": {
     "exec": {
       "security": "full",
       "ask": "off"
     }
   }
   ```

   If you omit `tools.exec.security`, it defaults to `allowlist` and commands must match the exec allowlist (usually empty), so exec will be denied. With `security: "full"` and `ask: "off"`, any command the agent runs (including sudo) is executed without allowlist or approval checks.

3. **Systemd unit: allow privilege escalation**  
   The default unit (and `scripts/setup-systemd.sh`) sets `NoNewPrivileges=true`, which prevents child processes (including sudo) from gaining new privileges. For full autonomy, set `NoNewPrivileges=false` in the service file:

   ```bash
   sudo systemctl edit --full agentforge-gateway.service
   ```

   Change `NoNewPrivileges=true` to `NoNewPrivileges=false` (or remove the line), then:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart agentforge-gateway
   ```

   Do **not** add hardening that blocks writes or setuid (e.g. `ProtectSystem=strict`, `ProtectHome=true`, `ReadOnlyPaths=`, `SystemCallFilter=`) if you want agents to install packages and run sudo.

4. **Restart gateway**  
   After editing env or config:

   ```bash
   sudo systemctl restart agentforge-gateway
   ```

   Verify: run a test from the CLI or trigger a run that uses exec; the agent should be able to run `echo "$SUDO_PASS" | sudo -S true` and similar.

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

**Recommended crontab** (includes CEO heartbeat every 30 minutes; the template in `~/.moltbot/agentforge-cron.txt` written by `init:agentforge` includes all lines below). Format: `minute hour day-of-month month day-of-week command` (e.g. `0 9 * * *` = 9am daily). Use one line per job; no line breaks inside a line.

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
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18789/
```
Expect: `200` or `302`. For full health JSON use: `node dist/entry.js gateway call health`.

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

**State directory for board meeting:** The board meeting uses `scripts/board-get-current-state.mjs` to inject CURRENT VENTURE STATE (LEDGER + optional CEO status) into analyst and coordinator prompts. It defaults to `~/.moltbot` when `~/.moltbot/agents/ceo/LEDGER.md` exists (AgentForge init uses this path); otherwise it uses `~/.clawdbot`. To force a specific directory, set `MOLTBOT_STATE_DIR` (or `CLAWDBOT_STATE_DIR`) in the environment before the board meeting (e.g. in crontab: `MOLTBOT_STATE_DIR=/home/agentforge/.moltbot` at the start of the board-meeting line, or export it in a wrapper script).

Monitor: `tail -f /tmp/agentforge-board.log`

Then check coordinator decision:

```bash
node dist/entry.js tui --session agent:coordinator:main
```

---

## Step 11: First CEO Execution (5 minutes)

**Before running:** Ensure the VPS has the latest code. If you have not run the update steps recently (Step 12 “Update code”), run them first so `ceo-implement.sh` is the current version. If you see `value: No such file or directory` when running the script, see Troubleshooting below.

Run the CEO script. To capture output to the log and then watch it:

```bash
./scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1
tail -f /tmp/agentforge-ceo.log
```

Or run without redirection to only see the script’s own messages (CEO output is then in the session, not the log).

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

### Tracking business progress

Use these to see how the CEO and workers are building the business:

| What | How |
|------|-----|
| **Investments and capital** | `cat ~/.moltbot/agents/ceo/LEDGER.md` — CEO-maintained list of ventures, spend, revenue, status (active/killed). |
| **CEO status reports** | `tail -f /tmp/agentforge-heartbeat.log` — Every 30 min the CEO writes a short report: status (RED/GREEN), provisioning, workers, next steps. |
| **Investment Portal (TUI)** | `node dist/entry.js portal` — Ventures, capital, workers, logs, settings. Run `node scripts/sync-ledger.mjs` first so portal data matches LEDGER. |
| **CEO conversation** | `node dist/entry.js tui --session agent:ceo:main` — Latest CEO messages, decisions, and worker spawns. |
| **Worker sessions** | If the CEO spawned workers (e.g. dev-firewall), list sessions with `node dist/entry.js gateway call sessions.list --params '{}'` and open with `node dist/entry.js tui --session agent:ceo:subagent:<id>` (or the worker key from the list). |
| **Coordinator / board** | `node dist/entry.js tui --session agent:coordinator:main` — Current board decision; `agent:cfo:main`, etc. for individual board members. |

**Quick snapshot:** `cat ~/.moltbot/agents/ceo/LEDGER.md` and the last block of `tail -n 80 /tmp/agentforge-heartbeat.log` give you investments plus the latest CEO report.

**No active workers?** Workers only exist after the CEO spawns them via `sessions_spawn` (during `ceo-implement.sh` or a heartbeat). They show up as **CEO subagent sessions** (e.g. `agent:ceo:subagent:<id>`), not as separate agents in the list. If you see none:

1. **Check whether the CEO ever spawned any** — In the CEO session (`tui --session agent:ceo:main`) or heartbeat log, look for “sessions_spawn” or “dev-…”, “mkt-…” worker names. If the CEO was blocked (e.g. provisioning, gateway timeouts) before or after spawning, it may not have spawned yet or workers may have become unreachable.
2. **List subagent sessions** — `node dist/entry.js gateway call sessions.list --params '{}'` and look for keys like `agent:ceo:subagent:…` under the CEO. If there are none, the CEO has not successfully spawned workers yet.
3. **Trigger a fresh run** — Now that provisioning is unblocked (e.g. Cloudflare token), run `./scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1` again so the CEO can read the board decision and spawn workers. Then run a heartbeat: `./scripts/ceo-heartbeat.sh >> /tmp/agentforge-heartbeat.log 2>&1` and check the log for worker status.
4. **Ask the CEO to spawn workers** — You can nudge: `node dist/entry.js agent --agent ceo --message "Read LEDGER and the coordinator decision. Spawn any workers needed for active investments and report back."`

---

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

**Read pending human requests from CLI:** List with `ls ~/.moltbot/human-requests/` or `node dist/entry.js gateway call human.requests.list --params '{}'`. Read one with `cat ~/.moltbot/human-requests/*REQ-XXXXX* | jq .` or `node dist/entry.js gateway call human.requests.get --params '{"requestId":"REQ-XXXXX"}'`. Each request has `title`, `description`, `suggestedAction`, `priority`, `category`, `status`.

**Respond to a human request (e.g. REQ-XXXXX approved):** The gateway accepts `human.requests.respond` only over WebSocket, not HTTP. Use the CLI (from repo root, with gateway running):

```bash
node dist/entry.js gateway call human.requests.respond --params '{"requestId":"REQ-XXXXX","action":"approved","response":"Your message (e.g. Token set in config)."}'
```

Replace `REQ-XXXXX` and the response text. To verify: `cat ~/.moltbot/human-requests/*REQ-XXXXX* | jq '{ status, response, respondedAt }'` should show `"status": "approved"`.

**Restart gateway:**

```bash
sudo systemctl restart agentforge-gateway
```

**Update code (after pushing changes to GitHub):** On the VPS, from repo root:

```bash
cd ~/agentforge
git pull --rebase origin main
pnpm install
pnpm build
pnpm ui:build
sudo systemctl restart agentforge-gateway
```

**If build is killed or CPU maxes out (small VPS):** Add swap first (e.g. 2G), then run the build with lower priority and a memory limit:

```bash
# One-time: add 2G swap (if not already present)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Then build with memory limit and low priority
nice -n 19 NODE_OPTIONS=--max-old-space-size=1536 pnpm build
pnpm ui:build
sudo systemctl restart agentforge-gateway
```

If it still fails, see Troubleshooting (“Build killed or fails (OOM / CPU)”). You can also build on your Mac and rsync `dist/` to the VPS so the VPS never runs the heavy compile.

---

## Step 13: Remote Access

**SSH tunnel (local machine):**

```bash
ssh -L 18789:localhost:18789 agentforge@YOUR_VPS_IP
# Then curl -s -o /dev/null -w "%{http_code}" http://localhost:18789/ on local (expect 200 or 302)
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

## Optional: Telegram and WhatsApp

You can add **Telegram** and/or **WhatsApp** so you (or your team) can talk to the CEO or other agents from your phone. The gateway uses the same Moltbot channel stack; you just add config and (for Telegram) a token or (for WhatsApp) a QR login.

**Config file:** `~/.clawdbot/moltbot.json` (or `~/.moltbot/moltbot.json` depending on init). Add under `channels`:

**Telegram**

1. Create a bot with [@BotFather](https://t.me/BotFather), then copy the token.
2. Add to config:
   ```json
   "channels": {
     "telegram": {
       "enabled": true,
       "botToken": "YOUR_BOT_TOKEN",
       "dmPolicy": "pairing"
     }
   }
   ```
   Or set env `TELEGRAM_BOT_TOKEN=...` (config takes precedence if both set).
3. Restart the gateway. DM the bot; approve the pairing code on first contact.

**WhatsApp**

1. Add to config:
   ```json
   "channels": {
     "whatsapp": {
       "dmPolicy": "allowlist",
       "allowFrom": ["+15551234567"]
     }
   }
   ```
2. Run `node dist/entry.js channels login` (or `moltbot channels login`) and scan the QR with WhatsApp (Linked Devices).
3. Restart the gateway.

**Route DMs to the CEO (optional):** To have DMs on a channel go to the CEO (or another agent), add a binding in config, for example:
```json
"bindings": [
  { "match": { "channel": "telegram" }, "agentId": "ceo" }
]
```
Then Telegram DMs are handled by the CEO session. Omit bindings to use default routing (e.g. pairing/allowlist only).

**Full channel docs:** [Telegram](docs/channels/telegram), [WhatsApp](docs/channels/whatsapp). For an AgentForge-focused overview see [AgentForge channels](docs/start/agentforge-channels).

---

## Security

- Prefer SSH keys: `ssh-copy-id agentforge@YOUR_VPS_IP`
- API keys and secrets in `~/.clawdbot/moltbot.json` or `~/.agentforge-env`; never commit these files
- Optional: fail2ban, disable SSH password auth

---

## Testing the full system

Run these on the VPS (from `~/agentforge`) to confirm everything works. All commands assume the gateway is running (systemd).

**1. Config complete**

```bash
jq 'if .gateway.mode and .gateway.auth.token and .tools.exec and (.agents.list | length) == 10 and (.models.providers.google or .models.providers.openai) and .browser.enabled and .browser.executablePath then "Config OK" else "Config incomplete" end' ~/.clawdbot/moltbot.json
```

Expect: `"Config OK"`.

**2. Gateway responding**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18789/
```

Expect: `200` or `302` (root may serve control UI). If connection refused or non-2xx, check: `sudo systemctl status agentforge-gateway`, `ss -ltnp | grep 18789`.  
Note: Health JSON is only available via WebSocket (step 3); there is no HTTP `/health` JSON endpoint.

**3. Gateway auth (WebSocket)**

```bash
node dist/entry.js gateway call health
```

Expect: JSON health summary. If auth fails, check `gateway.auth.token` in config (Step 5h2).

**4. Agent run (CEO short message)**

```bash
node dist/entry.js agent --agent ceo --message "Reply with one sentence: system check OK."
```

Expect: CEO responds (may take 30–60 s). Confirms gateway, AI provider, and agent routing.

**5. Human requests (optional)**

```bash
node dist/entry.js gateway call human.requests.list --params '{}'
```

Expect: `{"requests":[...]}`. If you have a pending REQ-XXX, respond with:  
`node dist/entry.js gateway call human.requests.respond --params '{"requestId":"REQ-XXX","action":"approved","response":"Done."}'`

**6. Full pipeline (optional)**

- Board meeting: `./scripts/board-meeting.sh --tui` (or without TUI), then check coordinator: `node dist/entry.js tui --session agent:coordinator:main` and confirm latest message has `DECISION_JSON5`.
- CEO run: `./scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1` then `tail -f /tmp/agentforge-ceo.log`.
- Heartbeat: `./scripts/ceo-heartbeat.sh >> /tmp/agentforge-heartbeat.log 2>&1` then check the report in the log.

If any step fails, see Troubleshooting below.

---

## Troubleshooting

**"Cannot find module moltbot.mjs":** Use `node dist/entry.js` for all commands (e.g. `node dist/entry.js init:agentforge`). The guide uses `dist/entry.js`; ensure `pnpm build` has been run.

**ceo-implement.sh: line 40: value: No such file or directory:** The script on the VPS is an old version. The prompt contains double-quote characters; when the script runs `--message "$PROMPT"`, the first `"` inside the prompt closes the argument and bash treats the next word (e.g. `<value>`) as a file redirection. (1) Update the repo and rebuild (Step 12 “Update code”); the fixed script uses no double-quotes inside the prompt. If you have unstaged changes to `scripts/ceo-implement.sh` (e.g. from a manual edit), discard them so pull can run: `git restore scripts/ceo-implement.sh`, then `git pull --rebase origin main`. (2) If pull says “Already up to date”, the fix may not be on origin yet—copy the fixed script from your Mac or wait for it to be pushed.

**Human request still pending after curl:** The gateway accepts `human.requests.respond` only over WebSocket, not HTTP. Use: `node dist/entry.js gateway call human.requests.respond --params '{"requestId":"REQ-XXXXX","action":"approved","response":"Your message."}'` (see “Respond to a human request” under Step 12).

**Coordinator decision missing/invalid:** `ceo-implement.sh` requires a valid board decision from the coordinator. When it fails, it now prints the parser’s reason (e.g. “No assistant message found”, “Missing DECISION_JSON5 block”, or a validation error). To debug: (1) Run the parser yourself to see the full error: `node scripts/parse-coordinator-decision.mjs --agent coordinator` (no redirection). (2) Open the coordinator session and confirm the latest message has a `DECISION_JSON5:` block (or the NO CONSENSUS stub): `node dist/entry.js tui --session agent:coordinator:main`. (3) Ensure state dir matches the gateway: set `OPENCLAW_STATE_DIR` or `CLAWDBOT_STATE_DIR` to the same value the gateway uses (e.g. in `~/.agentforge-env` and when running board meeting / ceo-implement), so the script reads sessions from where the gateway wrote them. (4) Re-run the board meeting if the coordinator output was truncated or lacked the block.

**"Control UI assets not found":** Build the control UI with `pnpm ui:build` (Step 3b). Then restart the gateway so it serves `dist/control-ui/`. After that, the gateway root and health URL will serve the control UI.

**"Unrecognized key: humanInterface":** The config schema now allows `humanInterface` (used for Stripe, heartbeat, venture runloop, etc.). Update and rebuild: `cd ~/agentforge && git pull --rebase && pnpm build`. If you previously ran `moltbot doctor --fix` and it removed `humanInterface`, re-add the Stripe block with the Option B `jq` command in Step 5g.

**"Gateway auth is set to token, but no token is configured":** Complete **Step 5h2** (generate a token with `openssl rand -hex 32` and set `gateway.auth.token` in config via `jq`). Then restart the gateway.

**Gateway won’t start:** `sudo journalctl -u agentforge-gateway -n 100`. Check port 18789, config JSON, and `pnpm build`.

**Unknown agent id "pr" (or other new board member):** The gateway and CLI only know agents that are in config `agents.list`. If you added a new board member (e.g. PR Lead) by pulling code but did not re-run init, the config still has the old list. **Fix:** From repo root run `node dist/entry.js init:agentforge` to refresh config (writes all 10 agents including pr), then restart the gateway: `sudo systemctl restart agentforge-gateway`. Verify: `jq '.agents.list[].id' ~/.clawdbot/moltbot.json` (or `~/.moltbot/moltbot.json` if you use AgentForge state dir) should include `"pr"`.

**Agent not responding:** Confirm gateway is up and API keys in `~/.clawdbot/moltbot.json`. Test: `node dist/entry.js agent --agent ceo --message "test"`.

**`gh: command not found` when agents create repos:** The GitHub CLI must be installed and on the PATH used by the gateway (systemd does not load your shell PATH). Install `gh` (see Step 5e “GitHub CLI (gh)”) and, if needed, add `PATH=...` to `~/.agentforge-env` so the gateway service can find it. Restart the gateway after installing or changing PATH.

**Wrangler / Cloudflare Workers “register workers.dev subdomain” prompt:** In non-interactive runs, wrangler may fail with “Would you like to register a workers.dev subdomain now?” Register once in the Cloudflare dashboard: open `https://dash.cloudflare.com/<ACCOUNT_ID>/workers/onboarding` (use your account ID, e.g. from `env.vars.CLOUDFLARE_ACCOUNT_ID`) and complete the workers.dev subdomain setup. After that, `wrangler deploy` can succeed without the prompt.

**Worker unreachable / messaging times out:** When the CEO (or heartbeat) tries to message a worker (e.g. dev-firewall) via `sessions_send`, the request can time out (often after 30 s). Common causes: gateway busy with other runs, slow model API, or the worker run taking longer than the send timeout. What to do: (1) **Restart the gateway** to clear stuck state and free resources: `sudo systemctl restart agentforge-gateway`. (2) **Check gateway logs** for errors when the timeout occurs: `sudo journalctl -u agentforge-gateway -n 200 --no-pager`. (3) **File fallback:** The CEO can write instructions into the venture dir (e.g. `CEO_INSTRUCTIONS.md`); the developer agent will pick them up on its next run. (4) **Re-spawn if needed:** If the worker session is stuck and never responds, you can ask the CEO to spawn a fresh worker for that venture (context in the old session is lost but work can continue).

**PR finished but no new post on Moltbook:** The PR agent follows the **Moltbook skill** (https://www.moltbook.com/skill.md). Moltbook is at **https://www.moltbook.com** (use `www`). (1) **Prefer API over browser:** Set `MOLTBOOK_API_KEY` (e.g. in config env or `~/.agentforge-env`) so the PR agent can post via the Moltbook API — no browser or login needed, works headless. Register the agent at Moltbook once, get the API key, then add it to the gateway env. (2) **Check what PR actually did:** Open the PR session: `node dist/entry.js tui --session agent:pr:main` — did it say it published via API or browser, or that it hit login/error? (3) **Gateway logs:** `sudo journalctl -u agentforge-gateway -n 200 --no-pager` for browser or PR errors. (4) **Rate limit:** Moltbook allows 1 post per 30 minutes; if PR ran twice in a row, the second may be rate-limited.

**Board meeting fails:** See `tail -100 /tmp/agentforge-board.log`, run `./scripts/board-meeting.sh` manually, increase timeout in config if needed (see VPS_CONFIG_UPDATE.md).

**Cron not running:** `sudo systemctl status cron`, `crontab -l`, `grep CRON /var/log/syslog`. Run `./scripts/ceo-heartbeat.sh` and `./scripts/board-meeting.sh` by hand to verify.

**"bad minute" or crontab install fails:** Each line must be exactly five time fields then the command (e.g. `0 9 * * * cd /home/agentforge/agentforge && ./scripts/board-meeting.sh ...`). Do not paste lines with extra spaces, comments in the middle, or broken lines. Use `crontab -e` and type or paste the block from this guide; ensure paths match your user and repo (e.g. `/home/agentforge/agentforge`).

**venture:tick:** Use `node dist/entry.js venture:tick --venture <ventureId>`. Venture ID is the investment id (e.g. from LEDGER.md). Heartbeat script parses active IDs from LEDGER and runs tick for each.

**GitHub/Vercel not available to gateway:** Ensure `~/.agentforge-env` exists with `GITHUB_TOKEN` and `VERCEL_TOKEN` and the unit uses `EnvironmentFile=-/home/agentforge/.agentforge-env` (Step 6a). Restart the gateway after editing the env file.

**sync-ledger "unable to open database file":** The venture-state code creates the DB directory if missing. If you still see this, check `--workspace` points to the correct venture dir (default `~/.moltbot/ventures/default/`) and that the user has write permission.

**Log and disk growth:** Cron logs (`/tmp/agentforge-*.log`) and gateway logs (journald) can grow over time. For long unattended runs, see [KEEP_IT_RUNNING.md](KEEP_IT_RUNNING.md) “Log and disk growth” (truncate/rotate cron logs; limit journal size with `journald.conf`). If disk fills, cron may stop and the gateway may fail; check with `df -h`.

**Build killed or fails (OOM / CPU):** Exit code 137 or “Killed” usually means the process was killed (often OOM). On a small VPS, add swap first (e.g. 2G), then run the build with a memory limit and low priority: `nice -n 19 NODE_OPTIONS=--max-old-space-size=1536 pnpm build` then `pnpm ui:build`. If needed: restrict to one CPU with `taskset -c 0`, or build on your Mac and rsync `dist/` to the VPS (`pnpm build && pnpm ui:build` on Mac, then `rsync -avz dist/ agentforge@YOUR_VPS_IP:~/agentforge/dist/`), then on the VPS only restart the gateway.

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
| **Test full system** | See section **Testing the full system** (config → health → gateway call → agent → optional pipeline) |
| **Track business progress** | See **Step 12 → Tracking business progress** (LEDGER, heartbeat log, portal, CEO/worker sessions) |
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
- [ ] Repo cloned, `pnpm install`, `pnpm build`, `pnpm ui:build`
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

- **Keeping it running:** [KEEP_IT_RUNNING.md](KEEP_IT_RUNNING.md) — what to check, when to act, quick commands.
- `README_AGENTFORGE.md`, `docs/start/ceo-quickstart.md`
- Upgrade path: [VPS_UPGRADE_GUIDE.md](VPS_UPGRADE_GUIDE.md)
- Two-way board flow: [VPS_UPGRADE_BOARD_TWO_WAY.md](VPS_UPGRADE_BOARD_TWO_WAY.md)


