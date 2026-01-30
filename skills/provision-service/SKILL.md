---
name: provision-service
description: "Standard workflow for agents to self-provision accounts/API keys, store secrets, smoke-test access, and escalate to humans only when blocked (KYC/SMS/CAPTCHA/2FA)."
metadata: {"moltbot":{"emoji":"🧩"}}
---

# ProvisionService (Autonomous)

Use this workflow whenever a venture requires a new SaaS account, API key, webhook secret, domain, or similar third-party setup.

## Principle

- **Attempt autonomously first** using browser + CLI + email.
- **Escalate only when blocked** by: KYC/ID, phone/SMS ownership, CAPTCHA/anti-bot, 2FA push approval, or billing details a human must enter.

## Secret storage standard (default)

Store secrets in config so they are available to all agents via environment variables:

- Config key: `env.vars.<ENV_VAR_NAME>`
- Example:

```bash
node moltbot.mjs config set env.vars.STRIPE_SECRET_KEY="sk_live_..."
node moltbot.mjs config set env.vars.STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Optional: 1Password references

If 1Password is available and signed in, you may store an `op://...` reference in `env.vars.<KEY>` and let runtime resolve it.

Example:

```bash
node moltbot.mjs config set env.vars.STRIPE_SECRET_KEY="op://Vault/Stripe/secret_key"
```

## Workflow

### Step 0: Define the secret contract

Write down:
- **Service**: e.g. Stripe, Vercel, AWS, SendGrid
- **Purpose**: what the key is used for
- **Required secrets**: list env var names (e.g. `SENDGRID_API_KEY`)
- **Smoke test**: exact command that proves access (no manual steps)

### Step 1: Attempt signup/login (browser)

Use the browser tool with a persistent profile if possible. Move slowly and avoid bot detection.

If you hit CAPTCHA / phone verification you cannot complete, stop and escalate.

### Step 2: Create API keys (browser or CLI)

Navigate to the service’s settings and create the key(s).

Immediately copy them into a safe place (do **not** paste secrets into public channels).

### Step 3: Store secrets

Prefer config env vars:

```bash
node moltbot.mjs config set env.vars.<KEY>="<value>"
```

### Step 4: Smoke test

Run a deterministic check:
- For an HTTP API key: `curl` a known endpoint
- For CLIs: `vercel whoami`, `gh auth status`, etc.

### Step 5: Record provisioning metadata

In the venture workspace, record:
- service
- date
- key names (NOT the values)
- who owns the account (human/KYC owner)
- smoke test command

## Escalation (when blocked)

Use `request_human` with:
- category `critical` for KYC/legal/physical
- category `access` for billing/credentials/SMS ownership
- category `blocked` for CAPTCHA/anti-bot or anything that needs a human to click/verify

Include:
- current URL
- what you tried
- exactly what the human needs to do
- what you’ll do next after unblocked

