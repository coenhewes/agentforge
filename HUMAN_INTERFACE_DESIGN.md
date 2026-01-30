# Human Interface System Design

## Problem Statement

Agents need to:
1. Request human help for **human-only constraints** (legal/physical requirements)
2. Ask for **access** to external services (API keys, credentials, billing details)
3. Escalate when **truly blocked** (no viable path forward)
4. Report critical issues requiring human intervention

Humans need to:
1. Monitor agent activity at a glance
2. Respond to agent requests quickly
3. Override or veto agent decisions
4. Set policies/guardrails for autonomous operation

---

## Solution: Multi-Channel Human Interface

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HUMAN INTERFACE LAYER                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Web Dashboard (Primary)                                  │
│     - Real-time request queue                                │
│     - One-click approve/deny                                 │
│     - Agent activity overview                                │
│     - Budget monitoring                                      │
│                                                               │
│  2. Messaging Channels (Notifications)                       │
│     - Telegram/Slack/Discord alerts                          │
│     - Quick reply for urgent requests                        │
│     - Mobile access                                          │
│                                                               │
│  3. Special "Human" Agent Session                            │
│     - Agents send requests here                              │
│     - Humans respond via TUI or channels                     │
│     - Persisted request/response history                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### 1. Human Request Tool (For Agents)

**New tool: `request_human`**

Agents can call this when blocked:

```typescript
// Agent calls this tool
request_human({
  priority: "high" | "medium" | "low" | "urgent",
  category: "approval" | "access" | "blocked" | "critical",
  title: "Need Stripe API keys for payment integration",
  description: "Building checkout flow, need production Stripe keys...",
  context: {
    agent: "developer-001",
    project: "email-template-saas",
    investmentId: "INV-20260128-001"
  },
  suggestedAction:
    "Provide keys via: node moltbot.mjs config set env.vars.STRIPE_SECRET_KEY=\"sk_live_...\" and env.vars.STRIPE_PUBLISHABLE_KEY=\"pk_live_...\"",
  timeout: "24h"  // Auto-escalate if no response
})
```

**Output:**
- Request stored in `~/.moltbot/human-requests/[timestamp]-[id].json`
- Notification sent to configured channels
- Request appears in web dashboard
- Agent receives request ID to check status

---

### 2. Human Requests Session

**Special agent session: `agent:human:main`**

Agents send requests here using `sessions_send`:

```bash
# Agent sends request
sessions_send agent:human:main "HUMAN REQUEST [URGENT] - Need Vercel API token for deployment. Project: email-saas. Investment: INV-001. Suggested action: Set via config. Timeout: 2h."

# Human views requests
node moltbot.mjs tui --session agent:human:main

# Human responds (in TUI or via command)
# Agent polls session to check for response
```

---

### 3. Web Dashboard Enhancement

**New section: "Human Requests"**

Add to `ui/src/ui/views/`:

```typescript
// ui/src/ui/views/human-requests.ts

interface HumanRequest {
  id: string;
  timestamp: string;
  agent: string;
  priority: "urgent" | "high" | "medium" | "low";
  category: "approval" | "access" | "blocked" | "critical";
  title: string;
  description: string;
  context: Record<string, any>;
  status: "pending" | "approved" | "denied" | "resolved";
  response?: string;
  respondedAt?: string;
  respondedBy?: string;
}

// UI shows:
// - Sortable table by priority/timestamp
// - Filter by status/category
// - Quick approve/deny buttons
// - Text box for custom responses
// - Agent context (which project, investment, etc.)
```

**Dashboard layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 AgentForge Dashboard                                      │
├─────────────────────────────────────────────────────────────┤
│ [Home] [Agents] [Usage] [Requests] ← NEW TAB                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ⚠️  URGENT REQUESTS (2)                                       │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🔴 API Access - developer-001                          │   │
│ │ Need Stripe API keys for checkout                      │   │
│ │ Investment: INV-20260128-001 | Budget: $50             │   │
│ │ [Approve] [Deny] [Details...]                          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ 📋 PENDING REQUESTS (5)                                       │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🟡 Blocked - ceo                                        │   │
│ │ Hard blocker >4h: need billing details for ads platform │   │
│ │ [Approve] [Deny] [Details...]                          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ✅ RESOLVED (12) [Show...]                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Messaging Channel Notifications

**Use existing channel integration:**

```typescript
// When agent creates request:
if (request.priority === "urgent" || request.priority === "high") {
  // Send to configured notification channel
  sendChannelMessage({
    channel: config.notifications.channel, // e.g., "telegram:owner"
    message: formatHumanRequest(request),
    buttons: [
      { text: "✅ Approve", callback: `approve:${request.id}` },
      { text: "❌ Deny", callback: `deny:${request.id}` },
      { text: "📋 Details", url: `http://localhost:18789/requests/${request.id}` }
    ]
  });
}
```

**Telegram bot commands:**

```
/requests - List pending human requests
/approve REQ123 - Approve request REQ123
/deny REQ123 - Deny request REQ123
/details REQ123 - Show full request details
```

---

### 5. Agent Request Patterns

**Example: CEO requests access (billing/credentials)**

```typescript
// In CEO SOUL.md
// When missing access that cannot be obtained autonomously:
const request = await request_human({
  priority: "high",
  category: "access",
  title: "Need billing access for paid tool (cannot proceed without it)",
  description:
    "Blocked on enabling a paid plan for <tool>. This requires a human to provide billing details or credentials.",
  suggestedAction: "Provide access/credentials or complete billing setup for <tool>.",
  timeout: "4h",
});

// CEO waits for response, then proceeds
```

**Example: Developer requests access**

```typescript
// In developer agent
const request = await request_human({
  priority: "urgent",
  category: "access",
  title: "Need GitHub personal access token",
  description: `Building ${projectName}
Need to push code to new private repo
Repo: github.com/${org}/${repo}`,
  suggestedAction: "Create token at https://github.com/settings/tokens and run: node moltbot.mjs config set integrations.github.token=ghp_...",
  timeout: "2h"
});

// Developer waits, then retries or reports blocked
```

**Example: Marketing requests access**

```typescript
// When a platform requires login/verification the agent cannot complete
const request = await request_human({
  priority: "medium",
  category: "access",
  title: "Need access to <platform> account",
  description:
    "Blocked on publishing/analytics for <platform>. Requires credentials or phone/SMS verification.",
  suggestedAction: "Log in / complete verification / provide access so marketing can proceed.",
  timeout: "4h",
});
```

---

## Configuration

**New config section: `moltbot.json`**

```json
{
  "humanInterface": {
    "enabled": true,
    "channels": {
      "notifications": "telegram:owner",
      "urgent": "telegram:owner",
      "approvals": "telegram:owner"
    },
    "autoApprove": {
      "enabled": false,
      "categories": [],
      "maxAmount": 0
    },
    "escalation": {
      "urgentTimeout": "2h",
      "highTimeout": "12h",
      "mediumTimeout": "24h",
      "lowTimeout": "72h"
    }
  }
}
```

---

## Agent Guidelines (Update SOUL.md files)

**Add to all agent personas:**

```markdown
## When to Request Human Help

Request human help only for:
1. 🔴 **Legal/compliance/contracts** requiring human review or signature (category="critical")
2. 🔴 **Physical-world actions** (ID/bank/notary/SMS verification) (category="critical")
3. 🔴 **Missing access** (API keys/credentials/billing) you cannot obtain (category="access")
4. 🟡 **Hard blocker >4 hours** with no viable alternative (category="blocked")

How to request:

```bash
# For blocking issues (you can't proceed)
request_human --priority urgent --category access \
  --title "Need Stripe API keys" \
  --description "Full context..." \
  --timeout 2h

# Alternative: Send to human session
sessions_send agent:human:main "REQUEST [URGENT]: Need help with X. Context: Y. Timeout: 2h."
```

**How to check response:**

```bash
# Poll human session for response
sessions_history agent:human:main --limit 5 | grep "RESPONSE.*REQ-[your-id]"

# Or wait for tool response if using request_human
```
```

---

## Human Response Patterns

**Via Web Dashboard:**
- Click "Approve" or "Deny" button
- Enter optional reason/instructions
- Request auto-marked as resolved

**Via TUI:**
```bash
node moltbot.mjs tui --session agent:human:main
# See pending requests
# Type: "RESPONSE REQ-123: APPROVED - Here are the keys: sk_live_..."
```

**Via Messaging (Telegram example):**
```
Human: /requests
Bot: 📋 2 pending requests:
     1. REQ-123 [URGENT] - Need Stripe keys (developer-001)
     2. REQ-124 [HIGH] - Legal review needed (ceo)