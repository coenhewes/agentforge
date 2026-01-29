# VPS config re-update (fix timeouts + restore model)

**Use this when the VPS is timing out on board meetings or agent runs.** These steps update `~/.clawdbot/moltbot.json` only; no repo or gateway restart required (restart gateway only if you change env or want to pick up config immediately).

---

## 1. Fix timeouts (required)

Default agent timeout is **10 minutes**. Board meetings (analyst + 6 members + coordinator) often need longer per run.

**On the VPS:**

```bash
# Set agent timeout to 30 minutes (1800 seconds)
jq '.agents.defaults.timeoutSeconds = 1800' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json

# Verify
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.timeoutSeconds'
# Expected: 1800
```

Use **1200** (20 min) if you prefer a shorter limit.

---

## 2. Restore default model (primary + fallback)

If you had **Ollama (local tunnel) as primary** and **OpenAI as fallback**:

```bash
# Primary: ollama-local/qwen2.5:14b, Fallback: openai/gpt-5-mini
jq '.agents.defaults.model = {
  "primary": "ollama-local/qwen2.5:14b",
  "fallbacks": ["openai/gpt-5-mini"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

If you're **OpenAI-only** (no Ollama):

```bash
jq '.agents.defaults.model = {
  "primary": "openai/gpt-5-mini",
  "fallbacks": []
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Verify:**

```bash
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model'
```

---

## 3. Analyst override (optional)

If you want the **analyst** to use a stronger model (e.g. GPT-5) while others use the default, add or update `agents.list` so the analyst has a `model` override.

**If you already have `agents.list`** (e.g. from `init:agentforge`):

```bash
# Update analyst entry to use openai/gpt-5
jq '(.agents.list // []) | map(if .id == "analyst" then . + {"model": {"primary": "openai/gpt-5", "fallbacks": ["openai/gpt-5-mini"]}} else . end) as $list | .agents.list = $list' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**If you don't have `agents.list` yet**, add an analyst override (other agents still use `agents.defaults.model`):

```bash
jq '.agents.list = ((.agents.list // []) + [{"id": "analyst", "model": {"primary": "openai/gpt-5", "fallbacks": ["openai/gpt-5-mini"]}}])' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

---

## 4. OpenAI API key

If you use OpenAI (primary or fallback), the gateway must have an API key:

- **In config:** `models.providers.openai.apiKey` in `~/.clawdbot/moltbot.json` (see VPS_DEPLOYMENT_GUIDE Step 5a), or  
- **Env:** `OPENAI_API_KEY` set for the gateway process (e.g. in the systemd service or `~/.profile` if you start the gateway manually).

**Check config:**

```bash
cat ~/.clawdbot/moltbot.json | jq '.models.providers.openai.apiKey // "not set"'
```

If it shows `"not set"` and you rely on env, ensure the **moltbot-gateway** service or your shell has `OPENAI_API_KEY` set.

---

## 5. Restart gateway (optional)

Config changes (timeout, model) are usually read on the next agent request. To force a reload:

```bash
sudo systemctl restart moltbot-gateway
sudo systemctl status moltbot-gateway
```

---

## Quick one-liner (timeout + default model only)

If you only need **timeout fix** and **OpenAI primary** (no analyst override):

```bash
jq '.agents.defaults.timeoutSeconds = 1800 | .agents.defaults.model = {"primary": "openai/gpt-5-mini", "fallbacks": []}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

Then verify: `cat ~/.clawdbot/moltbot.json | jq '.agents.defaults'`
