# Keeping AgentForge Running

Short guide for what to do **after** deployment so the system keeps running. For initial setup see [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md).

**Run from repo root:** All `node dist/entry.js` and `./scripts/...` commands assume you are in the agentforge repo directory (e.g. `cd ~/agentforge` first).

---

## Quick start (TL;DR)

1. **Gateway + cron** — Gateway runs 24/7; cron runs the daily pipeline (9am) and CEO heartbeat (every 30 min).
2. **Check every few days** — `tail -n 30 /tmp/agentforge-heartbeat.log` and, if needed, open the CEO session for the full status report.
3. **Act when needed** — Restart gateway, approve human requests (REQ-XXX), fix missing tools (e.g. `gh`).
4. **After pulling code** — `pnpm install && pnpm build && pnpm ui:build` then `sudo systemctl restart agentforge-gateway`.

---

## Contents

- [What runs by itself](#what-runs-by-itself)
- [Pre-production checklist](#pre-production-checklist-before-leaving-it-for-a-week)
- [What to check (and how often)](#what-to-check-and-how-often)
- [When to intervene](#when-to-intervene)
- [Updating code](#updating-code)
- [Quick command reference](#quick-command-reference)
- [System overview](#system-overview)
- [Summary](#summary)

---

## What runs by itself

| When | What |
|------|------|
| **Daily (e.g. 9am)** | **Single daily pipeline:** `scripts/daily-board-ceo.sh` runs board meeting → coordinator (writes decision to store) → CEO implement in one process. |
| **Every 30 min** | CEO heartbeat (oversight, workers, venture tick, LEDGER sync). Driven by **gateway** (default after `init:agentforge`) or by cron as backup. |
| **Weekly / monthly** | Reflection and meta-learning (if you added those cron entries). |

**Requirements:** Cron must be running and the gateway must be up. One gateway restart or one missed cron run is usually fine; the next run catches up.

**Autonomous loop (CEO heartbeat):** After `init:agentforge`, the CEO is the default agent with `heartbeat: { every: "30m" }`. The **gateway** runs the CEO every 30 minutes. The cron entry that runs `ceo-heartbeat.sh` every 30 min is **optional** (backup). If you rely only on the gateway heartbeat, ensure the gateway runs 24/7 (e.g. systemd) and that cron env (see [Cron environment](#21-cron-environment-state-dir-and-config-path)) is only needed for the daily pipeline.

---

## Pre-production checklist (before leaving it for a week)

Run once after deployment or after a VPS upgrade:

- [ ] **Gateway running and healthy** — `sudo systemctl status agentforge-gateway`, `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/` (expect `200` or `302`).
- [ ] **Cron installed** — Daily pipeline once (e.g. 9am): `./scripts/daily-board-ceo.sh`; CEO heartbeat every 30 min; weekly/monthly if desired. Template: `~/.moltbot/agentforge-cron.txt` (after `init:agentforge`). Set `OPENCLAW_STATE_DIR=$HOME/.moltbot` (or your state dir) in crontab so cron uses the same config. `crontab -l` should show your entries.
- [ ] **State dir for board meeting** — Board meeting finds LEDGER at `~/.moltbot/agents/ceo/LEDGER.md` by default when that path exists; otherwise set `MOLTBOT_STATE_DIR` (or `CLAWDBOT_STATE_DIR`) where cron runs. See [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) Step 10.
- [ ] **Model fallbacks** — CEO (and board if desired) have `agents.defaults.model.fallbacks` set so 429/rate limits don’t stall the loop. Verify: `jq '.agents.defaults.model' ~/.clawdbot/moltbot.json` (or your config path).
- [ ] **Venture store** — Venture state is in SQLite (default `ops/venture.sqlite`); **LEDGER.md** is generated from the store. CEO uses venture tools (`ventures_list`, `venture_update`, `venture_create`, `venture_mark_killed`, `venture_capital_status`). Heartbeat script gets active venture IDs via `venture list --status active --ids-only` and runs `venture:tick` for each.
- [ ] **Dry run** — Run `./scripts/daily-board-ceo.sh` (or separately `./scripts/board-meeting.sh` then `./scripts/ceo-implement.sh`), then `./scripts/ceo-heartbeat.sh`. Confirm coordinator decision is valid, CEO runs and updates venture store, and venture tick runs for each active venture.
- [ ] **AgentForge dry-run** — Run `./scripts/agentforge-dry-run.sh` to verify crontab, config path, and gateway. Optionally `./scripts/agentforge-dry-run.sh --probe` to test one short CEO run.

**Resilience – 429 and fallbacks:** Ensure `agents.defaults.model.fallbacks` is set so one provider (e.g. 429) does not permanently stall the loop. See [429 and fallbacks](#429-resource_exhausted-but-fallback-not-trying-openai) and [Gemini quota](#gemini-daily-quota-exceeded-graceful-fallback) below.

---

## What to check (and how often)

### 1. Gateway is up

**When:** After a reboot or if something feels stuck.

```bash
sudo systemctl status agentforge-gateway
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/
```

Expect: `active (running)` and `200` or `302`. If not: `sudo systemctl restart agentforge-gateway` and check logs: `sudo journalctl -u agentforge-gateway -n 100`.

### 2. Cron is running

**When:** After changing crontab or if no new heartbeat/board logs.

```bash
sudo systemctl status cron
crontab -l
```

You should see the daily pipeline (e.g. `daily-board-ceo.sh` at 9am) and CEO heartbeat every 30 min. If cron is off: `sudo systemctl start cron`.

### 2.1. Cron environment (state dir and config path)

**When:** After deployment or if cron runs but the CEO heartbeat log shows "agent run failed (exit code N)" and manual `node dist/entry.js agent --agent ceo --message "Test"` works in your shell.

Cron runs with a minimal environment. The CLI loads config from `OPENCLAW_STATE_DIR` or `CLAWDBOT_STATE_DIR` (fallback: `~/.openclaw` / `~/.clawdbot`). If your config and agents live under `~/.moltbot`, set the state dir so cron uses the same config.

**Option 1 – set in crontab:** Prefix each cron line with env vars:

```bash
OPENCLAW_STATE_DIR=$HOME/.moltbot
0 9 * * * cd /path/to/agentforge && OPENCLAW_STATE_DIR=$HOME/.moltbot ./scripts/daily-board-ceo.sh >> /tmp/agentforge-daily.log 2>&1
*/30 * * * * cd /path/to/agentforge && OPENCLAW_STATE_DIR=$HOME/.moltbot ./scripts/ceo-heartbeat.sh >> /tmp/agentforge-heartbeat.log 2>&1
```

**Option 2 – source env in the script:** Create `~/.moltbot/agentforge-env` with `export OPENCLAW_STATE_DIR=$HOME/.moltbot` and at the top of `ceo-heartbeat.sh` add `[ -f ~/.moltbot/agentforge-env ] && . ~/.moltbot/agentforge-env` (only if you adopt this convention).

**Verify:** Run from a minimal env that mimics cron: `env -i HOME=$HOME OPENCLAW_STATE_DIR=$HOME/.moltbot bash -c 'cd /path/to/agentforge && ./scripts/ceo-heartbeat.sh'` and confirm it completes without "agent run failed".

### 3. CEO heartbeat ran (and where to see the report)

**When:** Every few days, or when you want to confirm the heartbeat is running.

```bash
tail -n 30 /tmp/agentforge-heartbeat.log
```

The log shows **completion or failure** (e.g. `CEO heartbeat completed` or `CEO heartbeat agent run failed (exit code N)`). It does **not** contain the CEO’s full written report.

To see the **actual CEO status report** (RED/GREEN, ventures, workers, next steps), open the CEO session and read the latest message:

```bash
node dist/entry.js tui --session agent:ceo:main
```

Scroll to the most recent CEO reply; that’s where the status, actions, and next steps appear. RED usually means something needs you (e.g. human request, worker stuck).

### 4. Human requests (only when they exist)

**When:** When the heartbeat says “waiting for Human response” or you see a REQ-XXX.

**List / read requests:**

```bash
ls ~/.moltbot/human-requests/
node dist/entry.js gateway call human.requests.list --params '{}'
cat ~/.moltbot/human-requests/*REQ-1875FC19* | jq .
```

**Approve after providing what’s needed:**

```bash
node dist/entry.js gateway call human.requests.respond --params '{"requestId":"REQ-XXXXX","action":"approved","response":"Done. Token set in config."}'
```

See [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) Step 12 for details. For Gmail agent access see [docs/start/gmail-agent-access.md](docs/start/gmail-agent-access.md).

### 5. Subagent concurrency limit (optional)

Spawned workers share **global concurrency**: `agents.defaults.subagents.maxConcurrent` (default **8**). To run more workers in parallel, raise it in config (e.g. `16`) and restart the gateway. Defined in [src/config/agent-limits.ts](src/config/agent-limits.ts).

### 6. Investments and LEDGER (optional)

```bash
cat ~/.moltbot/agents/ceo/LEDGER.md
```

For TUI: `node dist/entry.js portal` (run `node scripts/sync-ledger.mjs` first so portal matches LEDGER).

### 7. CEO multi-venture cap (optional)

To cap how many ventures the CEO runs at once, set in config:

```json
"humanInterface": { "agentforge": { "ventures": { "maxActive": 3 } } }
```

Omit for no hard limit. Budget is always enforced.

### 8. Telegram / WhatsApp (optional)

If enabled, channels start with the gateway. See [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) “Optional: Telegram and WhatsApp” and [docs/start/agentforge-channels.md](docs/start/agentforge-channels.md).

### 9. Payment card (Investment Portal) (optional)

1. Run `node dist/entry.js portal` → **Settings** (tab 5) → **c** → fill card number, CVV, expiry, cardholder name, **Card Limit**.
2. **Encryption key:** From config `humanInterface.agentforge.capitalManagement.cardEncryptionKeyId` or env `AGENTFORGE_CARD_KEY`. If the console prints "Generated new encryption key", **persist that key** or decryption will fail after restart.
3. **Stripe:** CEO uses `capital_charge_active_card`; Stripe must be configured. Each charge deducts from the card balance; the tool returns the new remaining balance.

---

## When to intervene

| Situation | Action |
|-----------|--------|
| Gateway down or unhealthy | `sudo systemctl restart agentforge-gateway`; check `journalctl` if it keeps failing. |
| Cron not running | `sudo systemctl start cron`; fix crontab with `crontab -e` if entries are missing. |
| Human request pending (REQ-XXX) | Provide the requested item, set in config, then approve via `gateway call human.requests.respond` (see above). |
| Worker unreachable / timeouts | Restart gateway; check logs. If a worker is stuck, ask the CEO to spawn a fresh worker for that venture. |
| “gh: command not found” or similar | Install missing CLI (e.g. `sudo apt install -y gh`) and ensure it’s on the PATH the gateway uses; restart gateway. |
| Out of disk or memory | Free space; add swap if needed; restart gateway. Consider upgrading the VPS. |

---

### Troubleshooting

#### TUI shows “(no output)” or “(tool calls only)”

- **“(no output)”** – The agent finished a turn but returned no text. Try sending again; if it persists, check gateway logs and model/API status.
- **“(tool calls only)”** – The agent replied with only tool calls. The run is still in progress; wait for the next assistant message or check gateway logs.

If the session stays **idle**, the run may have errored. Use `/status` in the TUI and `journalctl -u agentforge-gateway -n 100` for errors.

#### TUI: works when opening session, fails when sending in already-open session

1. **Run failed (429 / fallback failed)** – Check gateway logs: `sudo journalctl -u agentforge-gateway -n 100 --no-pager | grep -E 'FailoverError|429|error|lane'`. If you see `FailoverError` or 429, fix fallbacks (see below) or wait for quota to reset. Workaround: close and reopen the session, then send again.
2. **Run completed with no text** – Model may have returned only tool calls or empty. Wait for a follow-up or send a short “ok?”.
3. **Lane / queue** – Previous run may still be in progress or failed without clearing. Check logs for “lane task error” or “lane wait exceeded”.

#### Browser act fails with “fields are required”

The **fill** action expects `fields: [ { ref: "<aria ref>", type: "text"|"checkbox"|…, value?: … }, … ]`. If the model sends a different shape, the service returns “fields are required”. Use manual credential entry or human intervention for sign-up when automation can’t succeed. Browser control runs only where the gateway runs (e.g. Mac with Moltbot.app and Chrome + Browser Relay). On a VPS, browser tools work only if a browser-capable node is connected.

#### Browser automation intermittent

If you see **"Can't reach the clawd browser control service (timed out...)"**:

- Ensure the gateway is running before browser automation.
- On Linux, prefer Google Chrome over snap Chromium; see [browser Linux troubleshooting](docs/tools/browser-linux-troubleshooting.md) if present.
- Optional: set `browser.requestTimeoutMs` (e.g. `15000`) in config.

**Browser vs request_human:** Use the **browser** for research and simple actions. Treat sign-up flows that require CAPTCHA, 2FA, or KYC as **request_human** so the CEO doesn’t stall on automation failures.

#### Complete VPS browser setup

For reliable browser control on VPS:

1. **Install Google Chrome (not snap Chromium):**  
   `wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb` then `sudo dpkg -i google-chrome-stable_current_amd64.deb` and `sudo apt --fix-broken install -y`.
2. **Install Playwright:** `cd ~/agentforge && pnpx playwright install chrome`.
3. **Config (moltbot.json):** Add/merge:
   ```json
   "browser": {
     "enabled": true,
     "defaultProfile": "clawd",
     "executablePath": "/usr/bin/google-chrome-stable",
     "headless": true,
     "noSandbox": true,
     "requestTimeoutMs": 15000,
     "remoteCdpTimeoutMs": 3000,
     "remoteCdpHandshakeTimeoutMs": 5000
   }
   ```
4. **Restart gateway:** `sudo systemctl restart agentforge-gateway`.
5. **Verify:** `curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'` and `node dist/entry.js browser --browser-profile clawd status`.

Troubleshooting: “Failed to start Chrome CDP” → use Google Chrome .deb, not snap. Timeouts → increase `requestTimeoutMs`. “Chrome extension relay… no tab” → use `defaultProfile: "clawd"`. Check logs: `sudo journalctl -u agentforge-gateway -n 100 --no-pager | grep -i browser`.

#### 429 RESOURCE_EXHAUSTED but fallback not trying OpenAI

1. **Confirm gateway is new build** — `ps -eo pid,lstart,cmd | grep -E 'gateway|node.*entry'`; restart if needed.
2. **Confirm default fallbacks** — `cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model'` should show `"fallbacks": ["openai/gpt-5-mini"]` (or your fallback). If `agents.defaults.model` is a string, replace with an object that has `primary` and `fallbacks` (see VPS_DEPLOYMENT_GUIDE Step 5b).
3. **Confirm OpenAI configured** — `jq '.models.providers.openai' ~/.clawdbot/moltbot.json` should have `apiKey` and `models` with your fallback model id.
4. **Check gateway logs** — `sudo journalctl -u agentforge-gateway -n 200 --no-pager | grep -iE 'fallback|openai|429|exhausted'`.
5. **Optional: set CEO fallbacks explicitly** — `jq '(.agents.list[] | select(.id == "ceo") | .model.fallbacks) = ["openai/gpt-5-mini"]' ~/.clawdbot/moltbot.json > /tmp/c.json && mv /tmp/c.json ~/.clawdbot/moltbot.json` then restart.

#### Gemini daily quota exceeded (graceful fallback)

When Gemini hits its daily limit (429), the system tries the fallback if `agents.defaults.model.fallbacks` is set. You’ll see a log line like “Primary google/gemini-2.0-flash returned rate_limit (attempt 1/2), trying fallback”. Optional config: `agents.defaults.model.rateLimitCooldownMinutes` (default 15).

#### Lane task error / FailoverError in logs

- **lane wait exceeded** – Run waited in the lane queue; normal under load.
- **lane task error … FailoverError … 429** – Rate limit and fallback failed or not configured. Fix fallbacks (see above) or wait for quota, then retry.

#### Moltbook API 500 / SSL error

During a board meeting, the PR Lead may report Moltbook API 500 or SSL. They are instructed to state the failure and offer to paste the draft for manual publish. Check `MOLTBOOK_API_KEY` and Moltbook service status; if the API is down, use the manual paste from the PR Lead’s message in `agent:pr:main`.

#### No git pushes for 20+ hours

CEO heartbeat should enforce development (spawn/nudge if no progress in 12h). If a venture repo has had no pushes for 20+ hours, check: (1) CEO session for heartbeat replies and spawn/nudge, (2) worker sessions for BLOCKED/PROGRESS, (3) gateway/logs for 429 or run failures. Fix blockers; next heartbeat should then trigger development.

---

## Updating code

When you pull new code:

```bash
cd ~/agentforge
git pull --rebase origin main
pnpm install
pnpm build
pnpm ui:build
sudo systemctl restart agentforge-gateway
```

If **SOUL.md or agent docs** were updated, re-run init so config and agent files stay in sync:

```bash
node dist/entry.js init:agentforge
sudo systemctl restart agentforge-gateway
```

If `pnpm build` is killed (OOM on small VPS), add swap and/or use the memory-limited build from [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) Troubleshooting.

**New board member:** Re-run init so config gets the new agent, then restart gateway; otherwise you may see "Unknown agent id \"pr\"".

**Cron template:** Init writes `~/.moltbot/agentforge-cron.txt` with the **single daily pipeline** at 9am (`daily-board-ceo.sh`) and CEO heartbeat every 30 min. If you see the **old** template (separate "9am board meeting" and "10am CEO implement"), you ran init from **stale compiled code**. Run `pnpm build` then `node dist/entry.js init:agentforge` again so the template is refreshed.

**What init overwrites (and what it doesn’t):**

- **Crontab:** Init does **not** change your installed crontab. It only overwrites the **template** `~/.moltbot/agentforge-cron.txt`. Your `crontab -l` is untouched.
- **Config (moltbot.json):** Init **merges** but **replaces** `agents.list` and overwrites `agents.defaults`. Other keys (API keys, gateway.auth, browser, channels, humanInterface, etc.) are **preserved**.
- **Agent workspaces (~/.moltbot/agents/):** Init copies SOUL.md, AGENTS.md, HEARTBEAT.md from the repo. **LEDGER.md and MEMORY.md are preserved** when they already exist. Session transcripts are never copied from the repo.

---

## Quick command reference

| Task | Command |
|------|--------|
| Gateway status | `sudo systemctl status agentforge-gateway` |
| Restart gateway | `sudo systemctl restart agentforge-gateway` |
| Gateway logs | `sudo journalctl -u agentforge-gateway -f` |
| Heartbeat completion | `tail -n 30 /tmp/agentforge-heartbeat.log` |
| CEO status report | `node dist/entry.js tui --session agent:ceo:main` (read latest reply) |
| Board / CEO logs | `tail -f /tmp/agentforge-board.log`, `tail -f /tmp/agentforge-ceo.log` |
| Run board meeting (TUI) | `./scripts/board-meeting.sh --tui` |
| Run daily pipeline | `./scripts/daily-board-ceo.sh` (or `--tui` for live view) |
| LEDGER | `cat ~/.moltbot/agents/ceo/LEDGER.md` |
| Portal (TUI) | `node dist/entry.js portal` |
| Approve human request | `node dist/entry.js gateway call human.requests.respond --params '{"requestId":"REQ-XXX","action":"approved","response":"..."}'` |

---

## System overview

### Venture store (source of truth)

Venture state lives in SQLite (default agent workspace `ops/venture.sqlite`). **LEDGER.md** is generated from the store (e.g. by `scripts/sync-ledger.mjs --to-markdown` or when the CEO uses venture tools). The CEO should use **ventures_list**, **venture_get**, **venture_update**, **venture_create**, **venture_mark_killed**, and **venture_capital_status** to read/write state. The heartbeat script gets active venture IDs via `venture list --status active --ids-only` and runs `venture:tick` for each.

### Single daily pipeline

**Script:** `scripts/daily-board-ceo.sh` — board meeting → coordinator (writes decision to store) → CEO implement in one process. Use one cron entry (e.g. 9am). Ensures the coordinator output is in the decision store before CEO implement runs. Optional: `--tui` for live view.

**Cron example:**

```bash
0 9 * * * cd /path/to/agentforge && OPENCLAW_STATE_DIR=$HOME/.moltbot ./scripts/daily-board-ceo.sh >> /tmp/agentforge-daily.log 2>&1
```

### Board meeting (manual or via daily pipeline)

For interactive TUI: `./scripts/board-meeting.sh --tui`. The daily pipeline runs it non-interactively at 9am.

### Why we build on OpenClaw

AgentForge uses **OpenClaw** (messaging gateway + Pi-style agent runtime) for: session store, tool execution (exec, browser, sandbox), model fallback, compaction; multi-agent sessions and lanes; optional channels (Telegram, WhatsApp, etc.); and rich tools (exec, browser, web_search, message, gateway, venture tools, capital_charge, board_decision, human_request). Past failures to run autonomously were **orchestration and data flow** (wrong agent on heartbeat, cron env, coordinator handoff, LEDGER vs store); we improve on this base (venture store, single daily pipeline, CEO tools) rather than rewriting.

### Kill-threshold and revenue-loop

- **Kill-threshold:** `venture:tick` evaluates kill switches in the per-venture store (e.g. “no revenue by day 30”). When met, the venture is marked killed in the per-venture and global investment store; LEDGER is regenerated; the CEO is notified.
- **Revenue-loop:** If a venture has Stripe but zero revenue after N days, consider killing or iterating. Use `ventures_list` or LEDGER; use `venture_mark_killed` or spawn development/marketing as needed.

---

## Log and disk growth

Cron logs (`/tmp/agentforge-board.log`, `/tmp/agentforge-ceo.log`, `/tmp/agentforge-heartbeat.log`, etc.) and gateway logs (journald) can grow. Optionally truncate or rotate cron logs (e.g. `tail -n 10000 /tmp/agentforge-heartbeat.log > /tmp/agentforge-heartbeat.log.tmp && mv /tmp/agentforge-heartbeat.log.tmp /tmp/agentforge-heartbeat.log`). journald rotates by default; limit with `journald.conf` (e.g. `SystemMaxUse=100M`). Check disk: `df -h`.

---

## Backup (optional)

```bash
tar -czf agentforge-backup-$(date +%Y%m%d).tar.gz \
  ~/.moltbot/agents/ ~/.moltbot/ventures/ ~/.moltbot/human-requests/ \
  ~/.clawdbot/moltbot.json ~/.agentforge-env
```

Store the tarball somewhere safe (not only on the same VPS).

---

## Summary

1. **Leave it running** — Gateway and cron do the work.
2. **Check every few days** — Heartbeat log and, if needed, LEDGER and CEO session.
3. **Act when needed** — Restart gateway, approve human requests, fix missing tools (e.g. `gh`).
4. **Update when you pull** — Rebuild and restart the gateway.

For full deployment, troubleshooting, and testing, see [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md).
