# VPS Upgrade Guide – Gemini 3 Pro + Nano Banana Pro + Codex

**Use this guide to upgrade a live AgentForge VPS** from the pre–Gemini 3 setup (Ollama/OpenAI/older models) to the new model plan:

- **Board, Coordinator, CEO:** Gemini 3 Pro (API model ID: `gemini-3-pro-preview`)  
- **Image (understanding/generation):** Nano Banana Pro (Gemini 3 Pro Image; API ID: `gemini-3-pro-image-preview`)  
- **Standard subagents:** Gemini 3 Pro (default)  
- **Developer/coding subagents:** GPT-5.1 Codex (when CEO passes model override at spawn time)

---

## Prerequisites

- SSH access to the VPS  
- User that runs AgentForge (e.g. `agentforge`)  
- **Gemini API key** (Google AI Studio): https://aistudio.google.com/apikey  
- **(Optional)** **OpenAI API key** if you keep the default fallback `openai/gpt-5-mini`: https://platform.openai.com/api-keys  
- **(Optional)** OpenAI Codex OAuth already set up (for developer subagents); if not, coding subagents will use Gemini 3 Pro fallback

---

## Step 1: Backup (5 minutes)

**On the VPS:**

```bash
ssh agentforge@YOUR_VPS_IP
cd ~/agentforge
```

Create a timestamped backup of config and important state (no secrets in repo):

```bash
BACKUP_DIR=~/agentforge-backup-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
cp -a ~/.clawdbot/moltbot.json "$BACKUP_DIR/" 2>/dev/null || true
cp -a ~/.moltbot/agentforge-cron.txt "$BACKUP_DIR/" 2>/dev/null || true
# Optional: backup CEO ledger and human requests
cp -a ~/.moltbot/agents/ceo/LEDGER.md "$BACKUP_DIR/" 2>/dev/null || true
ls -la ~/.moltbot/human-requests/ 2>/dev/null | head -5
echo "Backup in $BACKUP_DIR"
```

Keep this session open; you will use it for the rest of the upgrade.

---

## Step 2: Pull and Rebuild (10 minutes)

**Still on the VPS, in `~/agentforge`:**

```bash
cd ~/agentforge
git fetch origin
git status
```

If you have local changes (e.g. custom scripts), decide:

- **Option A – Rebase (recommended):** Integrate remote changes and keep your commits on top.  
  If you have no local commits or are okay rebasing:
  ```bash
  git pull --rebase origin main
  ```
- **Option B – Merge:**  
  ```bash
  git pull origin main
  ```

Resolve any merge conflicts if they appear, then rebuild:

```bash
pnpm install
pnpm build
```

Verify:

```bash
ls -la dist/cli.js
node moltbot.mjs --version
```

---

## Step 3: Add or Update Gemini Provider (3 minutes)

You must have the **Google (Gemini) provider** in config with **Gemini 3 Pro** and **Nano Banana Pro** so board, CEO, and image model work.

**Config file:** `~/.clawdbot/moltbot.json`

### 3a. If you do NOT have a Google provider yet

Merge in the Google provider and set your API key (replace `YOUR_GEMINI_API_KEY` with your real key):

```bash
# Replace YOUR_GEMINI_API_KEY with your key from https://aistudio.google.com/apikey
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

### 3b. If you already have a Google provider

Update the API key and ensure the three models above exist. Example (key only):

```bash
GEMINI_KEY="YOUR_GEMINI_API_KEY"
jq --arg key "$GEMINI_KEY" '.models.providers.google.apiKey = $key' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

Then verify:

```bash
cat ~/.clawdbot/moltbot.json | jq '.models.providers.google | { apiKey: (.apiKey | if . then "SET" else "MISSING" end), modelIds: [.models[].id] }'
```

You should see `apiKey: "SET"` and model IDs including `gemini-3-pro-preview` and `gemini-3-pro-image-preview`.

### 3c. OpenAI API key (optional, for fallback)

The default model fallback is `openai/gpt-5-mini`. If you keep that fallback (Step 4a), the gateway needs an **OpenAI API key** so fallback requests can run.

**Option 1 – In config (`~/.clawdbot/moltbot.json`):**

If you already have an `openai` provider, set or update the key:

```bash
# Replace YOUR_OPENAI_API_KEY with your key from https://platform.openai.com/api-keys
OPENAI_KEY="YOUR_OPENAI_API_KEY"
jq --arg key "$OPENAI_KEY" '.models.providers.openai.apiKey = $key' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

If you do **not** have an `openai` provider yet, add it (merge) with key and a minimal model so fallback works:

```bash
OPENAI_KEY="YOUR_OPENAI_API_KEY"
jq --arg key "$OPENAI_KEY" '.models.providers.openai = {
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": $key,
  "api": "openai-responses",
  "models": [
    {
      "id": "gpt-5-mini",
      "name": "gpt-5-mini",
      "api": "openai-responses",
      "reasoning": false,
      "input": ["text"],
      "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
      "contextWindow": 200000,
      "maxTokens": 16384
    }
  ]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Option 2 – Environment variable:**  
Set `OPENAI_API_KEY` for the gateway process (e.g. in the systemd unit or `~/.profile` if you start the gateway manually). The app will use it when the openai provider is used and no key is in config.

**Verify:**

```bash
cat ~/.clawdbot/moltbot.json | jq '.models.providers.openai.apiKey // "not set (env may be used)"'
```

If you do **not** want an OpenAI fallback, remove it in Step 4a by using `"fallbacks": []` instead of `["openai/gpt-5-mini"]` and skip this step.

---

## Step 4: Apply New Model Defaults (2 minutes)

These updates switch board/CEO/default/image/subagents to the new model plan **without** re-running `init:agentforge` (so your timeouts and other tweaks are preserved).

Run each block in order.

**4a. Default model (primary + fallback)**

```bash
jq '.agents.defaults.model = {
  "primary": "google/gemini-3-pro-preview",
  "fallbacks": ["openai/gpt-5-mini"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

(Remove or change the fallback if you do not use OpenAI.)

**4b. Image model (Nano Banana Pro)**

```bash
jq '.agents.defaults.imageModel = {
  "primary": "google/gemini-3-pro-image-preview",
  "fallbacks": []
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**4c. Subagents default (standard subagents = Gemini 3 Pro)**

```bash
jq '.agents.defaults.subagents.model = "google/gemini-3-pro-preview"' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**4d. Per-agent model overrides (all 9 agents = Gemini 3 Pro)**

This sets every board member, coordinator, and CEO to Gemini 3 Pro. If your `agents.list` has a different structure (e.g. extra fields), adjust the `jq` or skip and set overrides manually.

```bash
jq '.agents.list = (.agents.list // [] | map(
  if .id then . + {"model": {"primary": "google/gemini-3-pro-preview", "fallbacks": []}} else . end
))' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**4e. Verify**

```bash
cat ~/.clawdbot/moltbot.json | jq '{
  defaultModel: .agents.defaults.model.primary,
  imageModel: .agents.defaults.imageModel.primary,
  subagentsModel: .agents.defaults.subagents.model,
  listIds: [.agents.list[]?.id]
}'
```

You should see `defaultModel`, `imageModel`, and `subagentsModel` pointing at Gemini 3 Pro / Nano Banana Pro, and `listIds` listing your 9 agents.

---

## Step 5: (Optional) OpenAI Codex for Developer Subagents

**Implementation:** Developer/coding subagents use **GPT-5.1 Codex** (`openai-codex/gpt-5.1-codex`) only when the CEO passes that model at spawn time. The CEO SOUL instructs the CEO to pass `model: "openai-codex/gpt-5.1-codex"` when spawning workers for building/coding/technical tasks; the `sessions_spawn` tool accepts an optional `model` parameter and applies it to the child session. Standard subagents (marketing, ops, etc.) keep using the default (Gemini 3 Pro).

- **If you already use OpenAI Codex on this VPS:** ensure the gateway (and cron, if it runs agents) uses the same state dir as where you ran `moltbot models auth login --provider openai-codex`, so the OAuth token is available. No config change needed for defaults; the CEO SOUL already tells the CEO to pass the Codex model when spawning coding workers.
- **If you want to add Codex on the VPS (you don’t use it yet):** Codex uses **OAuth** (not an API key). You must complete the login flow once so the token is stored where the gateway can read it.
  1. **On a machine with a browser:** run `moltbot models auth login --provider openai-codex --set-default` and sign in with your OpenAI/ChatGPT account. That writes the OAuth token into your state dir (e.g. `~/.clawdbot` or `~/.moltbot`).
  2. **Copy auth to the VPS:** copy the auth store (e.g. `auth.json` and any `auth`-related files in your state dir) to the VPS user’s state dir so the gateway sees the same token. Ensure the gateway service runs as that user and uses the same state dir.
  3. **Or on the VPS with a browser/tunnel:** if the VPS has a desktop or you can forward a browser, run `moltbot models auth login --provider openai-codex` on the VPS so the token is written locally.
  4. **Allowlist the model (if you use one):** if your config has `agents.defaults.models` allowlists, add `openai-codex/gpt-5.1-codex` so the spawn with that model is allowed.
- **If you do not use Codex:** leave as is. Coding subagents will use the default (Gemini 3 Pro) when the CEO spawns them without a model override.

---

## Step 6: Restart Gateway (1 minute)

So the process loads the new config and code:

```bash
sudo systemctl restart moltbot-gateway
sudo systemctl status moltbot-gateway
```

Check that it is `active (running)` and that the logs look normal:

```bash
sudo journalctl -u moltbot-gateway -n 30 --no-pager
```

Optional sanity check:

```bash
ss -ltnp | grep 18789
curl -s http://localhost:18789/health
```

---

## Step 7: Verify (5 minutes)

**7a. Config and agents**

```bash
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model, .agents.defaults.imageModel, .agents.defaults.subagents.model'
```

**7b. Run a quick board meeting (dry run)**

If your cron or script runs the board meeting, you can trigger one manually (or run a single agent) to confirm Gemini 3 Pro is used:

```bash
cd ~/agentforge
# Example: run board meeting script if you have it
./scripts/board-meeting.sh
# Or run a single agent and check logs
```

Watch logs for model-related errors:

```bash
sudo journalctl -u moltbot-gateway -f
```

**7c. CEO SOUL**

Confirm the CEO workspace has the updated SOUL (model override for coding subagents):

```bash
grep -A2 "Model choice" ~/.moltbot/agents/ceo/SOUL.md
```

If you pulled the latest repo, you should see the note about standard subagents (default) vs developer subagents (Codex model override).

---

## Step 8: Restore Timeouts / Custom Settings (if needed)

If you had previously increased agent timeout (e.g. 30 minutes) and the merge or jq overwrote it, set it again:

```bash
jq '.agents.defaults.timeoutSeconds = 1800' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
sudo systemctl restart moltbot-gateway
```

Other custom defaults (budget, etc.) can be re-applied the same way; see [VPS_CONFIG_UPDATE.md](VPS_CONFIG_UPDATE.md) for examples.

---

## Alternative: Full Re-init (Clean Slate)

If you prefer to reset AgentForge config to the exact state produced by the new `init:agentforge` (all agents + defaults overwritten):

1. Back up `~/.clawdbot/moltbot.json` and any customizations (Step 1).
2. Pull and build (Step 2).
3. Run:
   ```bash
   node moltbot.mjs init:agentforge
   ```
4. Re-add your **Gemini API key** (Step 3a or 3b) — init does not store API keys.
5. Re-apply **timeout** and any other custom defaults (e.g. Step 8).
6. Restart the gateway (Step 6).

This overwrites `agents.list` and `agents.defaults` with the repo’s current defaults (Gemini 3 Pro, Nano Banana Pro, subagents default Gemini 3 Pro).

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| `No API key found for provider "google"` | Ensure `models.providers.google.apiKey` is set in `~/.clawdbot/moltbot.json` and that the gateway process (systemd) can read that file. |
| Board/CEO still use old model | Confirm `agents.defaults.model.primary` and each `agents.list[].model.primary` are `google/gemini-3-pro-preview`. Restart gateway after config change. |
| Image tool / vision fails | Confirm `agents.defaults.imageModel.primary` is `google/gemini-3-pro-image-preview` and that the Google provider has that model id. |
| Developer subagents not using Codex | CEO must pass `model: "openai-codex/gpt-5.1-codex"` when calling `sessions_spawn` for coding tasks. Check CEO SOUL and that Codex OAuth is configured if you want Codex. |
| JSON invalid after jq | Run `cat ~/.clawdbot/moltbot.json | jq .`; if it fails, restore from backup and re-apply the failing step. |

---

## Checklist

- [ ] Backup created  
- [ ] Repo pulled and built  
- [ ] Gemini API key set in `~/.clawdbot/moltbot.json`  
- [ ] (Optional) OpenAI API key set if using fallback `openai/gpt-5-mini`  
- [ ] (Optional) Codex OAuth set if you want developer subagents to use `openai-codex/gpt-5.1-codex`  
- [ ] Google provider has `gemini-3-pro-preview` and `gemini-3-pro-image-preview`  
- [ ] `agents.defaults.model` = Gemini 3 Pro  
- [ ] `agents.defaults.imageModel` = Nano Banana Pro  
- [ ] `agents.defaults.subagents.model` = Gemini 3 Pro  
- [ ] `agents.list` entries use Gemini 3 Pro  
- [ ] Gateway restarted  
- [ ] Timeout/custom defaults re-applied if needed  
- [ ] Quick test (board meeting or one agent) and logs checked  
