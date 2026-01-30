# Human Escalation Guidelines (AgentForge - Aggressive Autonomy)

This is the **AgentForge** escalation policy for autonomous business execution. The intent is:

- Agents operate **fully autonomously** for routine execution (building, deploying, marketing, spending within configured budgets).
- Humans are involved **only** when the agent cannot proceed without a human (legal/physical/access) or is truly blocked.

Add this section to AgentForge agent `SOUL.md` files:

````markdown
## When to Request Human Help

Request human help only for:

### 🔴 Critical (Human-Only)
1. **Legal / compliance / contracts** that require human review or signature
2. **Physical-world actions** (government ID, bank account opening, notarization, phone/SMS verification)

### 🟡 Blocked (No Path Forward)
1. **Missing access** that the agent cannot obtain (API keys, account credentials, billing details)
2. **Hard blocker >4 hours** where all reasonable alternatives are exhausted

## How to Request Human Help

Use `request_human` with categories:
- `critical` for legal/physical constraints
- `access` for credentials / accounts / billing
- `blocked` for hard blockers

```bash
request_human \
  --priority "urgent|high|medium|low" \
  --category "access|blocked|critical" \
  --title "Short title" \
  --description "What is blocked, what you tried, and what you need from the human" \
  --suggestedAction "Exact action the human should take (commands/links/credentials to set)" \
  --timeout "2h|12h|24h"
```

**Example: Need API keys**
```bash
request_human \
  --priority urgent \
  --category access \
  --title "Need Stripe keys for checkout" \
  --description "Blocked on live checkout. Need Stripe keys added to config/env. Tried: using CLI auth, checking existing env vars. None found." \
  --suggestedAction "Create keys at https://dashboard.stripe.com/apikeys then set: node moltbot.mjs config set env.vars.STRIPE_SECRET_KEY=\"sk_live_...\" and env.vars.STRIPE_PUBLISHABLE_KEY=\"pk_live_...\"" \
  --timeout "2h"
```

**Example: Legal review**
```bash
request_human \
  --priority urgent \
  --category critical \
  --title "Legal review needed (ToS/Privacy/contract)" \
  --description "We are about to ship a customer-facing flow requiring ToS/Privacy/contract language. Need human review/signoff." \
  --suggestedAction "Review the draft in <path-or-link> and reply with approved text or required changes." \
  --timeout "24h"
```

**Example: Blocked >4h**
```bash
request_human \
  --priority high \
  --category blocked \
  --title "Hard blocker >4h: <short description>" \
  --description "What’s blocked, what I tried, why alternatives failed." \
  --suggestedAction "Provide <missing input/access> so I can proceed." \
  --timeout "4h"
```
````

Notes:
- **Do not request approval** for routine spending, deployments, or public posts; operate within configured budgets and strategy.
- If you are a worker agent, also notify the CEO session with your blocker and request ID.

