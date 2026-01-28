# Human Interface System Design

## Problem Statement

Agents need to:
1. Request human approval for high-stakes decisions
2. Ask for access to external services (API keys, credentials, etc.)
3. Escalate when blocked on tasks only humans can do
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
  suggestedAction: "Provide keys via: node moltbot.mjs config set integrations.stripe.secretKey=sk_live_...",
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
│ │ 🟡 Approval - ceo                                       │   │
│ │ Invest $200 in paid ads? ROI projection: 150%          │   │
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

**Example: CEO requests approval for large spend**

```typescript
// In CEO SOUL.md
// Before spending >$100:
const request = await request_human({
  priority: "high",
  category: "approval",
  title: `Approve $${amount} spend on ${description}`,
  description: `Investment: ${investmentId}
Budget remaining: $${remaining}
Expected ROI: ${roi}%
Risk assessment: ${risk}
Projected timeline: ${timeline}`,
  suggestedAction: "Reply 'APPROVED' or 'DENIED' with reason",
  timeout: "12h"
});

// CEO waits for response or continues with smaller spend
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

**Example: Marketing requests human verification**

```typescript
// Before posting to social media
const request = await request_human({
  priority: "medium",
  category: "approval",
  title: "Review social media post before publishing",
  description: `Platform: Twitter
Content: "${tweetContent}"
Images: [attached]
Scheduled: ${time}`,
  suggestedAction: "Reply 'APPROVED' to publish or suggest edits",
  timeout: "4h"
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
  },
  "agents": {
    "defaults": {
      "humanApprovalRequired": {
        "spending": { "threshold": 100, "enabled": true },
        "externalPosts": { "enabled": true },
        "apiAccess": { "enabled": true },
        "codeDeployment": { "enabled": false }
      }
    }
  }
}
```

---

## Agent Guidelines (Update SOUL.md files)

**Add to all agent personas:**

```markdown
## When to Request Human Help

You MUST request human approval for:
1. 🔴 **Spending >$100** on anything (use request_human with category="approval")
2. 🔴 **Posting to social media** with company accounts (use category="approval")
3. 🔴 **Accessing external APIs** you don't have keys for (use category="access")
4. 🟡 **Deploying to production** (use category="approval")
5. 🟡 **Legal/compliance decisions** (use category="critical")

You SHOULD request human help when:
- Stuck on a task for >2 hours
- Unsure about strategic direction
- Risk assessment shows high probability of failure
- Need human-only actions (e.g., credit card payment, ID verification)

How to request:

```bash
# For blocking issues (you can't proceed)
request_human --priority urgent --category access \
  --title "Need Stripe API keys" \
  --description "Full context..." \
  --timeout 2h

# For approvals (you can proceed but want validation)
request_human --priority high --category approval \
  --title "Approve $200 ad spend" \
  --description "ROI analysis..." \
  --timeout 12h

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
     2. REQ-124 [HIGH] - Approve $200 ad spend (ceo)