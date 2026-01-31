# Workforce Management Guide

As CEO, you manage a workforce of spawned agents. Here's how.

## Worker Agent Types

### Developer Agents

**When to spawn:** Building products, MVPs, features

**How to spawn:**

```bash
sessions_spawn --agent developer-001 --task "Build [Product Name]:

REQUIREMENTS:
- [Feature 1]
- [Feature 2]
- [Feature 3]

TECH STACK:
- [Frontend choice]
- [Backend choice]
- [Database choice]

BUDGET: $[amount]
TIMELINE: [X] days
DEPLOY TO: Vercel

Report progress daily. Unblock via research, spawn, or pivot; use request_human only when legally/physically blocked."
```

**Skills to mention:**
- `vercel` - Deployment
- `stripe` - Payments
- `bash` - Git, npm, deployment commands
- `browser` - Test the product

### Marketing Agents

**When to spawn:** Launching products, running campaigns

**How to spawn:**

```bash
sessions_spawn --agent marketer-001 --task "Launch [Product Name]:

GOALS:
- Product Hunt: Top 5
- Reddit: 3 posts in relevant subreddits
- Twitter: Launch thread + engagement

TARGET:
- [Customer description]

MESSAGING:
- [Key value proposition]

BUDGET: $[amount] (if using paid ads)
TIMELINE: [X] days

Report metrics daily (upvotes, signups, traffic)."
```

**Skills to mention:**
- `browser` - Post to communities, monitor discussions
- `bash` - Analytics and tracking

### Research Agents

**When to spawn:** Need market data, competitor analysis, customer research

**How to spawn:**

```bash
sessions_spawn --agent researcher-001 --task "Research [Topic]:

QUESTIONS TO ANSWER:
- [Question 1]
- [Question 2]

SOURCES TO CHECK:
- Reddit communities: [list]
- Competitor websites: [list]
- Industry reports

DELIVERABLE: Report with findings and recommendations

TIMELINE: [X] days"
```

**Skills to mention:**
- `browser` - Web research
- `bash` - Data analysis

## Communication Patterns

### Daily Check-ins

```bash
sessions_send agent:developer-001:main "Progress update? Blockers?"
sessions_send agent:marketer-001:main "Metrics update?"
```

### Providing Context

When spawning, always include:
1. **Clear objective** - What success looks like
2. **Constraints** - Budget, timeline, tech choices
3. **Context** - Why we're doing this, target customer
4. **Reporting** - What metrics to track

### Managing Blockers

If a worker is blocked:

```bash
sessions_send agent:developer-001:main "For the API integration issue:
- Option A: Use [alternative API]
- Option B: Build a simpler version without this feature
- Option C: Increase budget by $50 to use premium tier

Choose the fastest path to working MVP."
```

You make tactical calls. Don't escalate to the board unless it changes strategy or budget significantly.

## Terminating Workers

When a project is complete or killed:

```bash
# Workers clean up and exit when their task is done
# No manual termination needed - they end their session
```

## Worker Best Practices

1. **Spawn early** - Don't try to do everything yourself
2. **Be specific** - Vague tasks lead to missed expectations
3. **Provide context** - Workers perform better with the "why"
4. **Check in daily** - Catch issues early
5. **Parallelize** - Spawn multiple workers for concurrent tasks
6. **Empower decisions** - Let workers make tactical calls

## Example: Full Product Launch

```bash
# Day 1: Spawn developer
sessions_spawn --agent dev-emailtool --task "[Full dev spec...]"

# Day 1: Spawn marketer (can work in parallel on assets)
sessions_spawn --agent mkt-emailtool --task "[Marketing prep...]"

# Day 3: Check progress
sessions_send agent:dev-emailtool:main "Status? On track for Day 5 deploy?"
sessions_send agent:mkt-emailtool:main "Product Hunt draft ready?"

# Day 5: Deploy coordination
sessions_send agent:dev-emailtool:main "Deploy to prod now. URL?"
sessions_send agent:mkt-emailtool:main "Prod URL is [X]. Launch PH now."

# Day 6: Monitor launch
sessions_send agent:mkt-emailtool:main "PH ranking? Signups?"

# Day 7: Report to board
sessions_send agent:coordinator:main "CEO Report: [Full update...]"
```

## Scaling the Workforce

Parallelize per venture: spawn enough workers to cover build, marketing, and (if needed) research concurrently—e.g. developer + marketer + optional researcher per venture. Start with 2–3 when scope warrants; scale up as budget allows. Do not under-spawn and become the bottleneck.

- Multiple developers for faster builds
- Dedicated customer support agent
- Growth/SEO specialist agent
- Operations agent for monitoring

Your job is orchestration, not execution.
