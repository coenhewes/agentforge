---
summary: "Give agents full access to a dedicated Gmail account (Himalaya or gog)"
title: Gmail access for agents
read_when:
  - Setting up a dedicated Gmail account for agents
  - Choosing between Himalaya (IMAP/SMTP) and Gmail API (gog + Pub/Sub)
---

# Gmail access for agents

This guide describes how to give your agents full access to a **dedicated Gmail account** so they can read, send, search, and organize email. Two approaches are supported; the recommended one is the least fragile and gives the most direct ownership.

## Options at a glance

| Approach | Access | Fragility | Best for |
|----------|--------|-----------|----------|
| **Himalaya (IMAP/SMTP)** | Full: read, send, search, folders, move, delete, attachments | Low: one App Password, one config file | Dedicated agent mailbox; agents “own” the account |
| **gog + Gmail Pub/Sub** | Gmail API (search, send, drafts) + push when new mail arrives | Higher: GCP project, Pub/Sub, OAuth, optional Tailscale | Push-triggered agent wake + Gmail API features |

**Recommendation:** Use **Himalaya** for a dedicated agent Gmail account. It gives full access with minimal moving parts (no GCP, no OAuth for watch). Add **Gmail Pub/Sub + gog** only if you want new-mail push notifications or Gmail API–specific features.

---

## Option 1: Himalaya (recommended – least fragile, full access)

Himalaya is a CLI email client that uses IMAP and SMTP. Agents run `himalaya` via the **exec** tool. One Gmail account, one App Password, one config file; works on macOS and Linux (including VPS).

### Skills and tools

- **Skill:** [Himalaya](/skills/himalaya) (`skills/himalaya/SKILL.md`) – agents use this to know how to list, read, send, search, and manage email.
- **Tool:** `exec` – agents run `himalaya` commands. Ensure `tools.exec` is enabled for the agents that should use email (e.g. CEO, board, workers).

### Step 1: Create a dedicated Gmail account

1. Create a new Google account (e.g. `youragents@gmail.com`) used only for agents.
2. Enable **2-Step Verification**: Google Account → Security → 2-Step Verification.
3. Create an **App Password**: Google Account → Security → 2-Step Verification → App passwords → generate one for “Mail” (or “Other” / “OpenClaw”).
4. Save the 16-character App Password; you will put it in Himalaya config (or a secret store).

### Step 2: Install Himalaya

**macOS (Homebrew):**
```bash
brew install himalaya
himalaya --version
```

**Linux (VPS):** Install from [releases](https://github.com/soywod/himalaya/releases) or your distro (e.g. Ubuntu/Debian if a package exists), or build from source. Ensure `himalaya` is on the **PATH** used by the gateway (e.g. `/usr/local/bin` or add to `PATH` in `~/.agentforge-env` for systemd).

### Step 3: Configure Himalaya for Gmail

Create or edit the config file. Paths:

- **macOS / Linux:** `~/.config/himalaya/config.toml`
- **VPS (gateway user):** `/home/agentforge/.config/himalaya/config.toml` (or whatever user runs the gateway)

**Minimal Gmail config (replace with your dedicated account and App Password):**

```toml
[accounts.agentforge]
email = "youragents@gmail.com"
display-name = "AgentForge"
default = true

# IMAP – read mail
backend.type = "imap"
backend.host = "imap.gmail.com"
backend.port = 993
backend.encryption.type = "tls"
backend.login = "youragents@gmail.com"
backend.auth.type = "password"
backend.auth.raw = "xxxx xxxx xxxx xxxx"   # App Password (space-separated)

# SMTP – send mail
message.send.backend.type = "smtp"
message.send.backend.host = "smtp.gmail.com"
message.send.backend.port = 587
message.send.backend.encryption.type = "start-tls"
message.send.backend.login = "youragents@gmail.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.raw = "xxxx xxxx xxxx xxxx"
```

**Secure password (recommended):** Avoid storing the App Password in the config file. Use a command that prints the password:

```toml
backend.auth.type = "password"
backend.auth.cmd = "pass show gmail/agentforge-app-password"
# Same for message.send.backend.auth.cmd
```

Then store the App Password in `pass`, 1Password CLI, or another secret store the gateway user can run. On a VPS you can use an env var and a small wrapper script if your secret manager is not available.

**Multiple accounts:** You can add more `[accounts.xxx]` blocks. Agents use the default account unless they pass `--account xxx`.

### Step 4: Ensure agents can run Himalaya

1. **Exec tool:** In gateway config, `tools.exec` should allow running commands (e.g. `security: "full"`) for the agents that need email (CEO, workers, etc.).
2. **PATH:** The gateway process must see `himalaya` on PATH. If you run via systemd, set `Environment=PATH=...` or put `PATH=...` in `~/.agentforge-env` and use `EnvironmentFile=-/home/agentforge/.agentforge-env` so `/usr/local/bin` (or where `himalaya` lives) is included.
3. **Skill:** The Himalaya skill is in the repo; agents that have access to skills will see how to use `himalaya envelope list`, `himalaya message read`, `himalaya template send`, etc. No extra “Gmail skill” is required – the Himalaya skill covers Gmail when the account is Gmail.

### Step 5: Verify from the host

Run as the same user that runs the gateway:

```bash
himalaya envelope list --max 5
himalaya folder list
```

If that works, agents can use the same commands via `exec`.

### What agents can do with Himalaya

- **List/search:** `himalaya envelope list`, `himalaya envelope list from:x@y.com subject:invoice`
- **Read:** `himalaya message read <id>`
- **Send:** `himalaya template send` (stdin) or `himalaya message write -H To:... -H Subject:... "body"`
- **Reply/forward:** `himalaya message reply <id>`, `himalaya message forward <id>`
- **Organize:** `himalaya message move <id> "Archive"`, `himalaya message delete <id>`
- **Attachments:** `himalaya attachment download <id>`

See [Himalaya skill](/skills/himalaya) and [configuration reference](/skills/himalaya/references/configuration) for full command set and Gmail-specific notes.

---

## Option 2: Gmail Pub/Sub + gog (push + Gmail API)

Use this if you want **new-mail push notifications** (e.g. trigger an agent run when mail arrives) or Gmail API features (threads, labels, drafts). It requires a GCP project, Pub/Sub, and OAuth for **gog** (gogcli).

### What you get

- **Push:** When new mail arrives, Gmail publishes to Pub/Sub → `gog gmail watch serve` → OpenClaw webhook → agent run (or wake).
- **Gmail API via gog:** Agents can run `gog gmail search`, `gog gmail send`, `gog gmail drafts create`, etc. (if they have `exec` and `gog` on PATH and gog is authorized for the account).

### Skills and docs

- **Skill:** [gog](/skills/gog) (`skills/gog/SKILL.md`) – Gmail/Calendar/Drive/Sheets/Docs CLI.
- **Full setup:** [Gmail Pub/Sub](/automation/gmail-pubsub) – one-time GCP setup, topic, subscription, `gog gmail watch start`, `gog gmail watch serve`, and hook config.

### Quick hook config (after Pub/Sub is set up)

In gateway config (`~/.clawdbot/moltbot.json` or `~/.moltbot/moltbot.json`):

```json5
{
  "hooks": {
    "enabled": true,
    "token": "OPENCLAW_HOOK_TOKEN",
    "path": "/hooks",
    "presets": ["gmail"],
    "gmail": {
      "account": "youragents@gmail.com"
    }
  }
}
```

When `hooks.gmail.account` is set and the gateway starts, it can start `gog gmail watch serve` and auto-renew the watch (unless you set `OPENCLAW_SKIP_GMAIL_WATCHER=1`). Use the same dedicated Gmail account as in Himalaya, or a separate one. For **gog** read/send from agents, authorize that account with `gog auth add youragents@gmail.com --services gmail`.

### Fragility notes

- GCP project, Pub/Sub topic/subscription, and IAM must stay correct.
- OAuth tokens for gog must be refreshed (gog handles this; ensure the process can access the token store).
- Tailscale Funnel (or another HTTPS endpoint) is needed for Pub/Sub push unless you run the push handler manually and expose it yourself.

---

## Summary

- **Dedicated Gmail for agents:** Create one account, enable 2FA, use an App Password.
- **Recommended (least fragile, full access):** **Himalaya** – IMAP/SMTP, one config file, agents run `himalaya` via exec. Use the [Himalaya skill](/skills/himalaya) and [configuration reference](/skills/himalaya/references/configuration).
- **Optional (push + Gmail API):** **Gmail Pub/Sub + gog** – see [Gmail Pub/Sub](/automation/gmail-pubsub) and [gog skill](/skills/gog). Use the same account or a second one; authorize gog for that account if agents should run `gog gmail` commands.

With Himalaya, agents effectively “own” the dedicated Gmail account: they can read, send, search, and organize mail without any GCP or OAuth complexity.
