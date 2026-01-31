# Keeping AgentForge Running

Short guide for what to do **after** deployment so the system keeps running. For initial setup see [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md).

**Run from repo root:** All `node dist/entry.js` and `node scripts/...` commands below assume you are in the agentforge repo directory. If you're in `~`, run `cd ~/agentforge` first (or use `node ~/agentforge/dist/entry.js ...`).

---

## What runs by itself

| When | What |
|------|------|
| **Daily 9am** | Board meeting → coordinator decision |
| **Daily 10am** | CEO implementation (read decision, spawn workers, update LEDGER) |
| **Every 30 min** | CEO heartbeat (oversight, workers, venture tick, LEDGER sync) |
| **Weekly / monthly** | Reflection and meta-learning (if you added those cron entries) |

Cron must be running and the gateway must be up. One gateway restart or one missed cron run is usually fine; the next run catches up.

---

## Pre-production test checklist (before leaving it for a week)

Run this once after deployment or after a VPS upgrade, before unattended operation:

- [ ] **Gateway running and healthy** — `sudo systemctl status agentforge-gateway`, `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/` (expect `200` or `302`).
- [ ] **Cron installed** — Board 9am, CEO 10am, **CEO heartbeat every 30 min**, weekly/monthly if desired. `crontab -l` should show all lines (template in `~/.moltbot/agentforge-cron.txt` includes them after `init:agentforge`).
- [ ] **State dir for board meeting** — Board meeting script finds LEDGER at `~/.moltbot/agents/ceo/LEDGER.md` by default when that path exists; otherwise set `MOLTBOT_STATE_DIR` (or `CLAWDBOT_STATE_DIR`) where cron runs the board meeting. See [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) Step 10.
- [ ] **Model fallbacks** — CEO (and board if desired) have `agents.defaults.model.fallbacks` (or per-agent fallbacks) set so 429/rate limits don’t stall the loop. Verify with `jq '.agents.defaults.model' ~/.clawdbot/moltbot.json` (or your config path).
- [ ] **LEDGER and venture IDs** — `~/.moltbot/agents/ceo/LEDGER.md` exists; active investments use **INV-xxx** in the first column so `ceo-heartbeat.sh` can run `venture:tick` for each.
- [ ] **Dry run** — Run `./scripts/board-meeting.sh`, then `./scripts/ceo-implement.sh`, then `./scripts/ceo-heartbeat.sh`. Confirm coordinator decision is valid (DECISION_JSON5), CEO runs and updates LEDGER, and venture tick runs for any INV-xxx in Active Investments.

---

## What to check (and how often)

### 1. Gateway is up

**When:** After a reboot or if something feels stuck.

```bash
sudo systemctl status agentforge-gateway
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/
```

Expect: `active (running)` and `200` or `302`. If not: `sudo systemctl restart agentforge-gateway` and check logs with `sudo journalctl -u agentforge-gateway -n 100`.

### 2. Cron is running

**When:** After changing crontab or if no new heartbeat/board logs.

```bash
sudo systemctl status cron
crontab -l
```

You should see entries for board meeting, CEO run, and CEO heartbeat. If cron is off: `sudo systemctl start cron`.

### 3. CEO heartbeat ran (and where to see the report)

**When:** Every few days, or when you want to confirm the heartbeat is running.

```bash
tail -n 30 /tmp/agentforge-heartbeat.log
```

The log only shows **completion lines** (e.g. `[Fri Jan 30 14:30:36 UTC 2026] CEO heartbeat completed`) and optionally "Running venture tick for INV-XXX". It does **not** contain the CEO's written report.

To see the **actual CEO status report** (RED/GREEN, ventures, workers, next steps), open the CEO session and read the latest message:

```bash
node dist/entry.js tui --session agent:ceo:main
```

Scroll to the most recent CEO reply to the heartbeat prompt; that's where the status, actions, and next steps appear. RED in that reply usually means something needs you (e.g. human request, worker stuck).

### 4. Human requests (only when they exist)

**When:** When the heartbeat says “waiting for Human response” or you see a REQ-XXX.

**Read / list requests:**

```bash
# List request files on disk
ls ~/.moltbot/human-requests/

# List all requests (JSON) via gateway
node dist/entry.js gateway call human.requests.list --params '{}'

# Read a specific request (e.g. REQ-1875FC19): file on disk or via gateway
cat ~/.moltbot/human-requests/*REQ-1875FC19* | jq .
# or: node dist/entry.js gateway call human.requests.get --params '{"requestId":"REQ-1875FC19"}'
```

Each request file (or `human.requests.get` result) has `title`, `description`, `suggestedAction`, `priority`, `category`, and `status`. Use those to decide what to provide.

**Gmail for agents:** To give agents full access to a dedicated Gmail account (read, send, search), see [Gmail agent access](docs/start/gmail-agent-access.md). Recommended: **Himalaya** (IMAP/SMTP, least fragile). Optional: Gmail Pub/Sub + gog for push-triggered wake.

**If there are pending requests,** provide what’s needed (e.g. API token), set it in config, then approve:

```bash
node dist/entry.js gateway call human.requests.respond --params '{"requestId":"REQ-XXXXX","action":"approved","response":"Done. Token set in config."}'
```

Replace `REQ-XXXXX` and the response text. See [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) Step 12 for details.

### 5. Subagent concurrency limit

Spawned workers share a **global concurrency limit**: `agents.defaults.subagents.maxConcurrent` (default **8**). At most 8 worker runs at once; more spawns queue. If the CEO should run more workers in parallel, raise the limit in config (e.g. `agents.defaults.subagents.maxConcurrent: 16`) and restart the gateway. The default is defined in [src/config/agent-limits.ts](src/config/agent-limits.ts) as `DEFAULT_SUBAGENT_MAX_CONCURRENT`.

### 6. Investments and capital (optional)

**When:** When you want to see what’s being built and spent.

```bash
cat ~/.moltbot/agents/ceo/LEDGER.md
```

Shows active ventures, spend, revenue, and status. For a TUI: `node dist/entry.js portal` (run `node scripts/sync-ledger.mjs` first so portal matches LEDGER).

### 7. CEO multi-venture (optional)

The CEO may work on **multiple ventures at once** when each venture fits within available capital and the CEO has capacity (as defined in the CEO SOUL). To cap concurrency, set a hard limit in config:

```json
"humanInterface": {
  "agentforge": {
    "ventures": { "maxActive": 3 }
  }
}
```

Omit `ventures.maxActive` for no hard limit (CEO uses judgment). Budget is always enforced by the system.

### 8. Telegram / WhatsApp (optional)

**When:** If you enabled Telegram or WhatsApp and want to confirm they are up. Channels start with the gateway; if the gateway is healthy and config has `channels.telegram` or `channels.whatsapp`, they are active. See [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) “Optional: Telegram and WhatsApp” and [docs/start/agentforge-channels.md](docs/start/agentforge-channels.md).

---

## When to intervene

| Situation | What to do |
|-----------|------------|
| Gateway down or unhealthy | `sudo systemctl restart agentforge-gateway`; check `journalctl` if it keeps failing. |
| Cron not running | `sudo systemctl start cron`; fix crontab with `crontab -e` if entries are missing. |
| Human request pending (REQ-XXX) | Provide the requested item (e.g. token), set in config, then approve via `gateway call human.requests.respond` (see above). |
| Worker unreachable / timeouts | Restart gateway; check logs. If a worker is stuck, you can ask the CEO to spawn a fresh worker for that venture. |
| “gh: command not found” or similar | Install missing CLI (e.g. `sudo apt install -y gh`) and ensure it’s on the PATH the gateway uses; restart gateway. See [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) Troubleshooting. |
| Out of disk or memory | Free space; add swap if needed; restart gateway. Consider upgrading the VPS. |

### TUI shows “(no output)” or “(tool calls only)”

- **“(no output)”** – The agent finished a turn but returned no text (e.g. empty reply, or the model sent nothing). Try sending your message again; if it keeps happening, check gateway logs and model/API status.
- **“(tool calls only)”** – The agent replied with **only** tool calls (e.g. “I’ll use the browser to post…”). The run is still in progress: tools run on the gateway, then the agent gets the results and may send a text reply in a later turn. Wait a bit and scroll for the next assistant message, or check gateway logs to see tool execution.

If the session stays **idle** with no further messages, the run may have errored or the model may have stopped without a follow-up. Use `/status` in the TUI and check `journalctl -u agentforge-gateway -n 100` for errors.

### TUI: works when opening session, fails when sending in already-open session

If opening the CEO session works (history loads, first message may work) but sending a message in the **already-open** session gives “(no output)” or no reply:

1. **Run failed (429 / fallback failed)** – The run may be failing (e.g. Gemini 429 then OpenAI also fails). The gateway should then emit a chat **error** event so the TUI shows “run error: …”. If you see “(no output)” instead, check gateway logs at the time you sent the message:  
   `sudo journalctl -u agentforge-gateway -n 100 --no-pager | grep -E 'FailoverError|429|error|lane'`  
   If you see `FailoverError` or 429 there, the run failed; the TUI may not be receiving the error event (e.g. wrong runId or session filter). As a **workaround**: close the TUI and reopen the session, then send again; or wait for quota to reset and retry.

2. **Run completed with no text** – The run may be **completing** with no assistant text (e.g. model returned only tool calls or empty). In that case you get “(no output)” or “(tool calls only)” and no “run error”. Wait a bit for a follow-up message, or send a short follow-up (e.g. “ok?”).

3. **Lane / queue** – If the CEO session is on a lane and the previous run is still in progress or failed without clearing, the next message might queue and then fail. Check logs for “lane task error” or “lane wait exceeded”.

**Quick check:** When it happens, run `sudo journalctl -u agentforge-gateway -n 50 --no-pager` and look for the time you sent the message; that will show whether the run failed (error/429) or completed (and with what).

### Browser act fails with “fields are required”

This happens when the agent uses **browser act** with action **fill** but the `fields` array is missing, empty, or has items without `ref` and `type`. The fill action expects: `fields: [ { ref: "<aria ref>", type: "text"|"checkbox"|…, value?: … }, … ]`. If the model sends a different shape (e.g. `selector` instead of `ref`), entries are dropped and the service returns “fields are required”.

- **On the next run** the improved error message tells the model the exact expected shape so it can retry with correct fields.
- **Workaround:** Use manual credential entry or human intervention for sign-up (as the CEO concluded). Browser automation for form fill is best when the model gets a snapshot first and emits fields with `ref`/`type` from the snapshot’s refs.

Note: The browser control service runs only where the gateway runs (e.g. Mac with Moltbot.app and Chrome + Browser Relay extension). On a VPS, `browser.open`/`snapshot`/`act` only work if a browser-capable **node** is connected; otherwise use manual sign-up and credentials.

### Browser automation intermittent

If you see **"Can't reach the clawd browser control service (timed out...)"** or similar:

- Ensure the gateway is running before browser automation (start Moltbot.app or `moltbot gateway run`).
- On Linux, prefer Google Chrome over snap Chromium when possible; see [browser Linux troubleshooting](docs/tools/browser-linux-troubleshooting.md) if present.
- Optional: set `browser.requestTimeoutMs` (e.g. `15000`) in config if the first request often times out (default 10s, clamped 5–60s).
- If the default profile (e.g. clawd) is unreachable, the client will try the other profile (e.g. chrome extension relay) once before failing.

### Complete VPS Browser Setup (for consistent automation)

For reliable browser control on VPS, follow this complete setup:

**1. Install Google Chrome (not snap Chromium):**
```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y
```

**2. Install Playwright browsers:**
```bash
cd ~/agentforge
pnpx playwright install chrome
```

**3. Configure browser in moltbot.json:**
```bash
jq '.browser = {
  "enabled": true,
  "defaultProfile": "clawd",
  "executablePath": "/usr/bin/google-chrome-stable",
  "headless": true,
  "noSandbox": true,
  "requestTimeoutMs": 15000,
  "remoteCdpTimeoutMs": 3000,
  "remoteCdpHandshakeTimeoutMs": 5000
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**4. Restart gateway:**
```bash
sudo systemctl restart agentforge-gateway
```

**5. Verify browser status:**
```bash
# Check browser control service status
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'

# Test browser startup
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs

# CLI test
node dist/entry.js browser --browser-profile clawd status
node dist/entry.js browser --browser-profile clawd open https://example.com
node dist/entry.js browser --browser-profile clawd snapshot
```

**Browser config options:**
| Option | Description | Recommended VPS Value |
|--------|-------------|----------------------|
| `enabled` | Enable browser control | `true` |
| `defaultProfile` | Profile for agents to use | `"clawd"` |
| `executablePath` | Path to Chrome binary | `"/usr/bin/google-chrome-stable"` |
| `headless` | Run without GUI | `true` |
| `noSandbox` | Required for VPS | `true` |
| `requestTimeoutMs` | Tool call timeout | `15000` (15s) |
| `remoteCdpTimeoutMs` | CDP HTTP timeout | `3000` (3s) |
| `remoteCdpHandshakeTimeoutMs` | CDP WebSocket timeout | `5000` (5s) |

**Troubleshooting browser issues:**
- **"Failed to start Chrome CDP"**: Snap Chromium issue; install Google Chrome .deb
- **Timeouts on first request**: Increase `requestTimeoutMs` to 15000-30000
- **"Chrome extension relay is running, but no tab is connected"**: Use `defaultProfile: "clawd"` (managed browser, no extension needed on VPS)
- **Check gateway logs**: `sudo journalctl -u agentforge-gateway -n 100 --no-pager | grep -i browser`

### 429 RESOURCE_EXHAUSTED but fallback not trying OpenAI

If you still see only Gemini in the footer and 429 errors after setting `agents.defaults.model.fallbacks` and deploying the fallback fix:

1. **Confirm the gateway is running the new build**  
   Check process start time and that it’s using the repo you updated:  
   `ps -eo pid,lstart,cmd | grep -E 'gateway|node.*entry'`  
   Restart again if needed: `sudo systemctl restart agentforge-gateway`.

2. **Confirm default fallbacks in config**  
   On the VPS (as the user that runs the gateway, e.g. `agentforge`):  
   `cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model'`  
   You should see `"fallbacks": ["openai/gpt-5-mini"]` (or your fallback model). If `agents.defaults.model` is a string, replace it with an object that has `primary` and `fallbacks` (see VPS_DEPLOYMENT_GUIDE Step 5b).

3. **Confirm OpenAI is configured**  
   `cat ~/.clawdbot/moltbot.json | jq '.models.providers.openai'`  
   There should be `apiKey` (or env reference) and `models` with your fallback model id (e.g. `gpt-5-mini`). If missing, add the OpenAI provider (VPS_DEPLOYMENT_GUIDE Step 5b).

4. **Check gateway logs for fallback attempts**  
   `sudo journalctl -u agentforge-gateway -n 200 --no-pager | grep -iE 'fallback|openai|429|exhausted'`  
   If you see a fallback attempt to OpenAI and then another error, the issue may be OpenAI (key, quota, or model id). If you never see OpenAI in the logs, the 429 may be on a path that doesn’t use model fallback, or the config isn’t being read as expected.

5. **Optional: set CEO fallbacks explicitly**  
   If defaults still don’t apply, set the CEO’s model fallbacks in config:  
   `jq '(.agents.list[] | select(.id == "ceo") | .model.fallbacks) = ["openai/gpt-5-mini"]' ~/.clawdbot/moltbot.json > /tmp/c.json && mv /tmp/c.json ~/.clawdbot/moltbot.json`  
   Then restart the gateway.

### Gemini daily quota exceeded (graceful fallback)

When Gemini hits its daily limit (429 "You exceeded your current quota"), the system will try the fallback model if `agents.defaults.model.fallbacks` (or the agent’s fallbacks) are set. You’ll see a short log line like:

`Primary google/gemini-2.0-flash returned rate_limit (attempt 1/2), trying fallback`

and the run continues on the fallback (e.g. OpenAI). Subagents spawned during that run use the same effective model (the fallback), so they do not spin up on the rate-limited primary.

**Rate-limit cooldown:** After a 429, the primary provider/model is put in cooldown (default 15 minutes). The next runs skip it and go straight to the fallback, so decisions are not delayed by retrying the rate-limited model on every run. Optional config: `agents.defaults.model.rateLimitCooldownMinutes` (number, max 1440); omit to use the 15-minute default.

The TUI and assistant bubble show a short message (e.g. "HTTP 429: You exceeded your current quota...") instead of the full error JSON. If you still see repeated full "LLM error: { ... }" dumps, ensure fallbacks are configured (see [429 RESOURCE_EXHAUSTED but fallback not trying OpenAI](#429-resource_exhausted-but-fallback-not-trying-openai)) and that the gateway is running the latest build.

### Lane task error / FailoverError in logs

If you see `lane task error` or `FailoverError` with `429` in gateway logs:

- **lane wait exceeded** – The run waited in the lane queue (e.g. another run was using the same lane). Normal under load; if it happens often, consider increasing lane capacity or reducing concurrent runs.
- **lane task error … FailoverError … 429** – The run hit a rate limit (or similar) and fallback either failed too or wasn't configured. The TUI should show the error in the assistant bubble and a system line "run error: …". Fix fallbacks (see [429 RESOURCE_EXHAUSTED but fallback not trying OpenAI](#429-resource_exhausted-but-fallback-not-trying-openai)) or wait for quota to reset, then retry.

---

## Updating code

When you pull new code (e.g. from GitHub), rebuild and restart so the gateway and scripts use the new version:

```bash
cd ~/agentforge
git pull --rebase origin main
pnpm install
pnpm build
pnpm ui:build
sudo systemctl restart agentforge-gateway
```

OR If the SOUL.md of anyrthing is updated:

```bash
cd ~/agentforge
git pull --rebase origin main
pnpm install
pnpm build
pnpm ui:build
node dist/entry.js init:agentforge  
sudo systemctl restart agentforge-gateway
```

If `pnpm build` is killed (OOM on small VPS), add swap and/or use the memory-limited build from [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) Troubleshooting.

**If the update adds a new board member** (e.g. PR Lead): re-run init so config gets the new agent, then restart the gateway: `node dist/entry.js init:agentforge` then `sudo systemctl restart agentforge-gateway`. Otherwise you may see "Unknown agent id \"pr\"" when the board meeting or CLI runs that agent.

**What init overwrites (and what it doesn’t):**
- **Crontab:** Init does **not** change your installed crontab. It only overwrites the **template** file `~/.moltbot/agentforge-cron.txt`. Your `crontab -l` is untouched; any custom cron lines you added stay.
- **Config (moltbot.json):** Init **merges** with existing config but **replaces** `agents.list` (full list of 10 agents) and overwrites `agents.defaults` (model, imageModel, subagents, budget). Other keys (API keys, `gateway.auth`, browser, channels, `humanInterface`, etc.) are **preserved**. So **GitHub, Vercel, Cloudflare, and other credentials** (in config or env) are **not** touched; the system still “knows” it has access to them.
- **Agent workspaces (~/.moltbot/agents/):** Init copies SOUL.md, AGENTS.md, HEARTBEAT.md, etc. from the repo. **LEDGER.md and MEMORY.md are preserved** when they already exist (so project/venture data and agent memory are **not** wiped on re-init). SOUL.md is overwritten (repo version wins); session transcripts live under `sessions/` and are never copied from the repo, so they stay.

---

## Quick command reference

| Task | Command |
|------|--------|
| Gateway status | `sudo systemctl status agentforge-gateway` |
| Restart gateway | `sudo systemctl restart agentforge-gateway` |
| Gateway logs | `sudo journalctl -u agentforge-gateway -f` |
| Heartbeat ran (completion only) | `tail -n 30 /tmp/agentforge-heartbeat.log` |
| CEO status report (RED/GREEN, etc.) | `node dist/entry.js tui --session agent:ceo:main` (read latest reply) |
| CEO / board logs | `tail -f /tmp/agentforge-ceo.log`, `tail -f /tmp/agentforge-board.log` |
| LEDGER | `cat ~/.moltbot/agents/ceo/LEDGER.md` |
| Portal (TUI) | `node dist/entry.js portal` |
| Approve human request | `node dist/entry.js gateway call human.requests.respond --params '{"requestId":"REQ-XXX","action":"approved","response":"..."}'` |

---

## Log and disk growth

Cron logs (`/tmp/agentforge-board.log`, `/tmp/agentforge-ceo.log`, `/tmp/agentforge-heartbeat.log`, etc.) and gateway logs (journald) can grow over time. For a week or more of unattended runs:

- **Cron logs:** Optionally truncate or rotate. Example: keep only the last 10,000 lines: `tail -n 10000 /tmp/agentforge-heartbeat.log > /tmp/agentforge-heartbeat.log.tmp && mv /tmp/agentforge-heartbeat.log.tmp /tmp/agentforge-heartbeat.log`. Or use logrotate with a config that rotates `/tmp/agentforge-*.log` by size or daily.
- **Gateway logs:** journald rotates by default; limit size with `journald.conf` (e.g. `SystemMaxUse=100M` for the journal). View recent: `sudo journalctl -u agentforge-gateway -n 500`.

If disk fills up, cron may stop writing and the gateway may fail; check disk with `df -h` and free space in `/tmp` and the journal.

---

## Backup (optional)

If you want a simple backup of config and state:

```bash
tar -czf agentforge-backup-$(date +%Y%m%d).tar.gz \
  ~/.moltbot/agents/ ~/.moltbot/ventures/ ~/.moltbot/human-requests/ \
  ~/.clawdbot/moltbot.json ~/.agentforge-env
```

Store the tarball somewhere safe (not only on the same VPS).

---

## Summary

1. **Leave it running** – Gateway and cron do the work.
2. **Check every few days** – Heartbeat log and, if needed, LEDGER.
3. **Act when needed** – Restart gateway, approve human requests, fix missing tools (e.g. `gh`).
4. **Update when you pull** – Rebuild and restart the gateway.

For full deployment, troubleshooting, and testing, see [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md).


## Running a Board Meeting:
For TUI:
```Bash
   ./scripts/board-meeting.sh --tui
  ```