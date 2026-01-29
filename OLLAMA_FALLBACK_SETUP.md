# Ollama Fallback Setup Guide

**Quick guide for adding fallback providers when Ollama credits run out**

---

## Problem

When using Ollama Cloud (or any provider with hourly credit limits), agents can fail when credits are exhausted. Moltbot supports automatic fallback to backup providers.

---

## Solution: Configure Model Fallbacks

Moltbot automatically tries fallback models when the primary provider fails due to:
- Rate limits
- Credit exhaustion
- Auth failures
- Timeouts

---

## Quick Setup

### Step 1: Check Current Config

```bash
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model'
```

### Step 2: Add Fallbacks

**If you're using Ollama as primary:**

```bash
# Example: Ollama → OpenAI fallback
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Replace `ollama/llama3.3` with your actual Ollama model ID**  
**Replace `openai/gpt-5-mini` with your fallback provider/model**

### Step 3: Verify

```bash
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model'
```

**Expected:**
```json
{
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini"]
}
```

---

## Common Fallback Patterns

### Pattern 1: Ollama → OpenAI

**Requires:** OpenAI API key configured in `models.providers.openai`

```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

### Pattern 2: Ollama → Anthropic (Claude)

**Requires:** Anthropic API key configured in `models.providers.anthropic`

```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["anthropic/claude-sonnet-4.5"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

### Pattern 3: Ollama → Google Gemini

**Requires:** Google AI API key configured in `models.providers.google`

```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["google/gemini-2.0-flash-exp"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

### Pattern 4: Multiple Fallbacks (Chain)

**Try Ollama → OpenAI → Anthropic in order:**

```bash
jq '.agents.defaults.model = {
  "primary": "ollama/llama3.3",
  "fallbacks": ["openai/gpt-5-mini", "anthropic/claude-sonnet-4.5"]
}' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

---

## How It Works

1. **Primary model fails** (rate limit, credits exhausted, etc.)
2. **Moltbot automatically tries fallbacks** in order
3. **First successful fallback is used** for that request
4. **Next request starts with primary again** (unless it's still in cooldown)

**Fallback triggers:**
- ✅ Rate limits
- ✅ Credit exhaustion ("insufficient credits")
- ✅ Auth failures
- ✅ Timeouts
- ❌ Not triggered by: validation errors, network errors (non-timeout), etc.

---

## Monitoring Fallbacks

### Check Gateway Logs

```bash
# View recent logs
sudo journalctl -u moltbot-gateway -n 100 --no-pager | grep -i fallback

# Follow logs in real-time
sudo journalctl -u moltbot-gateway -f | grep -i fallback
```

### Check Agent Sessions

```bash
# View agent session to see which model was used
node moltbot.mjs tui --session agent:ceo:main

# Look for model indicators in the session history
```

---

## Troubleshooting

### Fallbacks Not Working

**Check fallbacks are configured:**
```bash
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model.fallbacks'
```

**Should show:** `["openai/gpt-5-mini"]` or your configured fallbacks

**Check fallback provider is configured:**
```bash
cat ~/.clawdbot/moltbot.json | jq '.models.providers.openai'
```

**Should show:** Your OpenAI provider config with `apiKey` and `baseUrl`

### Fallback Provider Also Fails

If all fallbacks fail, you'll see an error like:
```
All models failed: ollama/llama3.3: insufficient credits | openai/gpt-5-mini: rate limit exceeded
```

**Solutions:**
1. Add more fallback providers (see Pattern 4 above)
2. Check fallback provider API keys are valid
3. Wait for rate limit cooldowns to expire

### Model ID Format

Fallback model IDs must match the format: `provider/model-id`

**Examples:**
- ✅ `ollama/llama3.3`
- ✅ `openai/gpt-5-mini`
- ✅ `anthropic/claude-sonnet-4.5`
- ✅ `google/gemini-2.0-flash-exp`
- ❌ `llama3.3` (missing provider prefix)
- ❌ `gpt-5-mini` (missing provider prefix)

---

## Advanced: Per-Agent Fallbacks

You can override fallbacks for specific agents:

```bash
jq '.agents.list += [{
  "id": "ceo",
  "model": {
    "primary": "ollama/llama3.3",
    "fallbacks": ["openai/gpt-5-mini"]
  }
}]' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Note:** Per-agent fallbacks override global `agents.defaults.model.fallbacks` for that agent only.

---

## Quick Reference

**Add fallback:**
```bash
jq '.agents.defaults.model.fallbacks += ["openai/gpt-5-mini"]' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Remove fallback:**
```bash
jq '.agents.defaults.model.fallbacks = []' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**Change primary model:**
```bash
jq '.agents.defaults.model.primary = "openai/gpt-5-mini"' ~/.clawdbot/moltbot.json > /tmp/config.json && mv /tmp/config.json ~/.clawdbot/moltbot.json
```

**View current config:**
```bash
cat ~/.clawdbot/moltbot.json | jq '.agents.defaults.model'
```

---

**Last Updated:** 2026-01-29
