---
summary: "Give agents access to Airwallex (balances, FX, transfers, beneficiaries, cards)"
title: Airwallex access for agents
read_when:
  - Setting up Airwallex as the venture bank account
  - Configuring AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY for the gateway
---

# Airwallex access for agents

This guide describes how to give your agents access to **Airwallex** so they can check balances, get FX quotes, manage beneficiaries, create and list transfers, and create and list virtual cards. Once configured, the CEO and other agents use the Airwallex tools for the venture’s bank account and payouts.

## What agents get

With Airwallex configured, agents can use:

| Tool | Purpose |
|------|---------|
| `airwallex_balances` | Current account balances (available, pending, total) per currency |
| `airwallex_get_quote` | FX quote for a currency pair; use `quote_id` in transfers for FX |
| `airwallex_create_beneficiary` | Save a beneficiary for reuse in transfers |
| `airwallex_list_beneficiaries` | List saved beneficiaries (optional filters) |
| `airwallex_get_beneficiary` | Get a saved beneficiary by id |
| `airwallex_create_transfer` | Create outbound transfer (by `beneficiary_id` or inline `beneficiaryJson`) |
| `airwallex_get_transfer` | Get transfer status by id |
| `airwallex_list_transfers` | List transfers (optional status, date range, pagination) |
| `airwallex_create_card` | Create a virtual card for the organisation |
| `airwallex_list_cards` | List issued cards |
| `airwallex_get_card` | Get card metadata by id (no PAN/CVV) |

See [Skills](/tools/skills) and the airwallex skill in the repo at `skills/airwallex/SKILL.md` for full tool descriptions and workflows.

## Step 1: Get Airwallex API credentials

1. Log in to the [Airwallex web app](https://www.airwallex.com/) (or your organisation’s Airwallex portal).
2. Open the **API** or **Developers** section (often under Settings or Integrations). The exact name may vary by account type.
3. Create or copy API credentials:
   - **Client ID** – identifies your application.
   - **API Key** – secret key for authentication. Treat it like a password; do not commit it to version control or share it in chat.
4. For **testing only**, you can use the [Airwallex demo/sandbox](https://www.airwallex.com/docs) and set the base URL to `https://api-demo.airwallex.com` (see Step 3).

## Step 2: Choose where to store credentials

The gateway (and thus the agents) need two environment variables:

- `AIRWALLEX_CLIENT_ID` – your Client ID.
- `AIRWALLEX_API_KEY` – your API key.

The CLI loads env (in order; later sources do not override earlier ones) from:

1. `.env` in the current working directory
2. `~/.openclaw/.env` (or `$OPENCLAW_STATE_DIR/.env` if set)
3. `$AGENTFORGE_ENV` if set, otherwise `~/.agentforge-env`

Use one of these so that the **process that runs the gateway** sees the variables. If the gateway runs under systemd or launchd, that process often does **not** inherit your shell env; use a file that the service loads (e.g. `EnvironmentFile` in systemd pointing at `~/.agentforge-env`).

## Step 3: Set the variables

**Option A – Global env file (recommended for a dedicated gateway host)**

Append to the global env file the gateway user reads (e.g. `~/.agentforge-env` or `~/.openclaw/.env`):

```bash
# Airwallex (venture bank account)
export AIRWALLEX_CLIENT_ID="your_client_id_here"
export AIRWALLEX_API_KEY="your_api_key_here"
```

For **demo/sandbox** only, add:

```bash
export AIRWALLEX_BASE_URL="https://api-demo.airwallex.com"
```

Omit `AIRWALLEX_BASE_URL` for production; the default is `https://api.airwallex.com`.

**Option B – Config `env.vars`**

If your deployment uses the OpenClaw/AgentForge config file, you can put the values under `env.vars` so they are injected into the gateway process:

```json
{
  "env": {
    "vars": {
      "AIRWALLEX_CLIENT_ID": "your_client_id_here",
      "AIRWALLEX_API_KEY": "your_api_key_here"
    }
  }
}
```

For demo only, add `"AIRWALLEX_BASE_URL": "https://api-demo.airwallex.com"`. Do not commit real keys to version control; use a secret manager or env file that is not in the repo.

**Option C – CWD `.env` (development only)**

For local development you can use a `.env` in the project root. Add it to `.gitignore` and never commit it:

```
AIRWALLEX_CLIENT_ID=your_client_id_here
AIRWALLEX_API_KEY=your_api_key_here
```

## Step 4: Ensure the gateway sees the variables

- **Manual runs:** If you start the gateway from a shell that has sourced `~/.agentforge-env` (or equivalent), it will see the vars.
- **systemd:** In the unit file, set `EnvironmentFile=-/home/user/.agentforge-env` (or the user that runs the gateway). Restart the service after changing the file: `sudo systemctl restart agentforge-gateway`.
- **Docker / other:** Ensure the container or process has `AIRWALLEX_CLIENT_ID` and `AIRWALLEX_API_KEY` in its environment (e.g. via `docker run -e` or a mounted env file).

## Step 5: Verify access

1. Restart the gateway if you changed env or config so it picks up the new variables.
2. Open a session with an agent that has Airwallex tools (e.g. CEO) and ask it to check the Airwallex balance, or trigger a tool that calls Airwallex (e.g. “What’s our Airwallex balance?”).
3. If credentials are wrong or missing, the tool will return an error (e.g. “Airwallex not configured” or an auth error from the API). Fix the env vars and restart the gateway, then try again.

## Summary

| Item | Value |
|------|--------|
| **Required env vars** | `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY` |
| **Optional** | `AIRWALLEX_BASE_URL` – set to `https://api-demo.airwallex.com` for demo; omit for production |
| **Where to set** | `~/.agentforge-env`, `~/.openclaw/.env`, or config `env.vars` (ensure the gateway process loads them) |
| **Verify** | Restart gateway, then ask an agent to check balance or use any Airwallex tool |

After this, agents can use all Airwallex tools for balances, FX, beneficiaries, transfers, and cards. For the full financial flow (Stripe revenue → payouts to Airwallex), also configure [Stripe](https://docs.molt.bot) and set Airwallex as the default payout destination in Stripe.
