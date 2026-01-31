---
summary: "AgentForge: enable Telegram and WhatsApp to talk to the CEO or other agents"
title: AgentForge channels (Telegram, WhatsApp)
read_when:
  - Enabling messaging channels for AgentForge on a VPS or local
  - Routing Telegram/WhatsApp DMs to the CEO or board
---

# AgentForge channels (Telegram, WhatsApp)

AgentForge runs on **Moltbot**, which supports Telegram and WhatsApp (and other channels). You can enable these on your VPS or local gateway so you (or your team) can talk to the CEO or other agents from your phone.

## What you get

- **Telegram** or **WhatsApp** DMs to your bot/number are delivered to the gateway.
- With **bindings**, you can route a channel to a specific agent (e.g. all Telegram DMs → CEO).
- The same CEO/board/worker sessions and tools are available; only the transport (Telegram/WhatsApp) changes.

## Quick setup

1. **Config:** Add `channels.telegram` or `channels.whatsapp` to your gateway config (`~/.clawdbot/moltbot.json` or `~/.moltbot/moltbot.json`). See [VPS_DEPLOYMENT_GUIDE](../../VPS_DEPLOYMENT_GUIDE.md) “Optional: Telegram and WhatsApp” for copy-paste snippets.
2. **Telegram:** Create a bot with [@BotFather](https://t.me/BotFather), set `channels.telegram.botToken` (or `TELEGRAM_BOT_TOKEN`), restart gateway. DM the bot and approve pairing.
3. **WhatsApp:** Set `channels.whatsapp` (e.g. `dmPolicy: "allowlist"`, `allowFrom: ["+15551234567"]`), run `moltbot channels login` and scan the QR with WhatsApp (Linked Devices), restart gateway.
4. **Route to CEO (optional):** Add a binding so DMs go to the CEO:
   ```json
   "bindings": [ { "match": { "channel": "telegram" }, "agentId": "ceo" } ]
   ```

## Full channel docs

- [Telegram](/channels/telegram) – Bot API, token, pairing, groups.
- [WhatsApp](/channels/whatsapp) – Web channel, QR login, allowlist, multi-account.

For initial VPS deployment including optional channels, see [VPS_DEPLOYMENT_GUIDE](../../VPS_DEPLOYMENT_GUIDE.md). For day-to-day checks (including whether channels are up), see [KEEP_IT_RUNNING](../../KEEP_IT_RUNNING.md).
