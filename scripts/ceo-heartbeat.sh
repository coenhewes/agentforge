#!/usr/bin/env bash
#
# CEO Heartbeat Script
# Runs every 30 minutes to provide continuous oversight of all ventures and workers
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# CEO heartbeat prompt - AUTONOMOUS EXECUTION LOOP
PROMPT="CEO Heartbeat - $(date +"%Y-%m-%d %H:%M")
Current time: $(date -Iseconds 2>/dev/null || date +"%Y-%m-%dT%H:%M:%S%z"). Treat this as a new cycle; do not repeat prior summaries.

YOUR ONE GOAL: MAKE MONEY. Every action must move toward revenue.

This heartbeat is YOUR autonomous execution loop. You MUST take action every time - never reply that all is well.

This run must include at least one of: sessions_spawn, sessions_send, sessions_history, or a browser/tool call. Otherwise you are only monitoring.

## 1. ASSESS BOARD VISION
- Read LEDGER.md for current ventures and board direction
- Read latest from agent:coordinator:main if needed
- Understand: What ventures are approved? What's the strategic direction?

## 2. POLL WORKERS AND CHECK STATE
- Check LEDGER.md for all active investments
- Poll workers: sessions_history for each known worker session
- Look for COMPLETE, BLOCKED, PROGRESS messages
- Check kill thresholds - are any investments approaching limits?

**EVERY HEARTBEAT = DO EVERYTHING POSSIBLE:** Do not do one thing and stop. Proactively act on every lever that can improve the business this cycle: dev, marketing, ops, unblocking, copy, research, LEDGER, kill thresholds, coordinator update, MEMORY. Your reply must reflect multiple actions where applicable.

**PROGRESS STALENESS:** For each active venture, if no PROGRESS/COMPLETE from a developer in 12+ hours, your next action MUST be to spawn or nudge development. Never leave 20+ hours with no development progress.

## 3. DIAGNOSE EACH BUSINESS

For EACH active venture, ask: **Why aren't people buying?**

**READINESS - Is the product ready to buy?**
- Does Stripe checkout work? Can someone pay RIGHT NOW?
- Are there bugs blocking the purchase flow?
- Is the core value proposition delivered?
→ If NO: Spawn developer to fix. This is #1 priority. 'Deployed' without payment = NOT LAUNCHED.

**AWARENESS - Do people know it exists?**
- Is there marketing content live?
- Have we posted to Reddit, Twitter, Product Hunt?
- Is there SEO/search presence?
- Are we in communities where customers hang out?
→ If NO: Spawn marketer or do marketing yourself.

**PRESENTATION - Does it look trustworthy?**
- Is the landing page professional?
- Are there screenshots, demos, or videos?
- Is the copy clear and compelling?
- Does it look like a real product or a side project?
→ If NO: Spawn designer or improve copy yourself.

**PRICING - Is the price right?**
- Is it competitive with alternatives?
- Is there a clear value proposition for the price?
- Have we tested different price points?
- Is there a free trial or money-back guarantee?
→ If UNSURE: Spawn researcher to analyze competitors, adjust pricing.

**TRUST - Do people trust us enough to pay?**
- Are there testimonials or social proof?
- Is there a refund policy visible?
- Does the site look legitimate (not scammy)?
- Is there a way to contact support?
→ If NO: Add social proof, guarantees, contact info.

**FRICTION - Is it easy to buy?**
- How many clicks from landing to purchase?
- Is checkout confusing or asking for too much info?
- Are there unnecessary barriers (account creation, etc.)?
- Is mobile checkout working?
→ If HIGH FRICTION: Simplify the funnel, spawn developer if needed.

## 4. SPAWN THE RIGHT WORKER

Based on your diagnosis, spawn ANY worker that solves the problem:
- developer - Build, fix bugs, payment integration
- marketer - Content, social, Product Hunt, Reddit
- designer - Landing page, UI polish, visuals
- copywriter - Sales copy, email sequences
- researcher - Competitor analysis, pricing research
- analyst - Metrics, funnel optimization

Use descriptive names: sessions_spawn --agent designer-landing-v2 --task \"...\"

## 5. LOG TO MEMORY (REQUIRED)

After diagnosing and acting, UPDATE MEMORY.md with:
- What you diagnosed for each venture
- What action you took and why
- What you expect to happen
- What you learned from previous actions

This creates institutional memory. The system gets smarter over time.

## 6. WRITE VISIBLE UPDATE
- Post progress to agent:coordinator:main so board sees your work
- Update LEDGER.md with current state (spend, revenue, status)
- Update MEMORY.md with diagnostic log and learnings
- Log: What you diagnosed, what you did, what's next

## 7. NEVER IDLE
- DO NOT reply 'HEARTBEAT_OK' or 'all is well'
- DO NOT just monitor - EXECUTE
- If truly nothing to do (impossible) → research new opportunities or build something

REMEMBER:
- You are an autonomous business operator, not a monitor
- Board gives direction, you DRIVE execution
- First revenue is THE milestone, not 'deployed'
- Stripe checkout is mandatory for every product
- End every heartbeat with ACTION TAKEN, not status report

BEGIN AUTONOMOUS EXECUTION."

# Send to CEO agent (use dist/entry.js after build; fallback to moltbot.mjs if present)
cd "$REPO_ROOT"
CLI="${REPO_ROOT}/dist/entry.js"
[ -f "$CLI" ] || CLI="${REPO_ROOT}/moltbot.mjs"
AGENT_EXIT=0
node "$CLI" agent --agent ceo --message "$PROMPT" > /dev/null 2>&1 || AGENT_EXIT=$?
if [ "$AGENT_EXIT" -ne 0 ]; then
  echo "[$(date)] CEO heartbeat agent run failed (exit code $AGENT_EXIT)" >&2
fi

# After CEO heartbeat, run venture runloop for active investments
# Get active venture IDs from the venture store (source of truth), then run venture:tick for each
ACTIVE_IDS=$(node "$CLI" venture list --status active --ids-only 2>/dev/null || true)
for venture_id in $ACTIVE_IDS; do
  if [ -n "$venture_id" ] && [ "$venture_id" != "-" ]; then
    echo "[$(date)] Running venture tick for $venture_id" >&2
    node "$CLI" venture:tick --venture "$venture_id" > /dev/null 2>&1 || true
  fi
done

# Regenerate LEDGER.md from venture store (store is source of truth; CEO uses venture tools)
if [ -f "$REPO_ROOT/scripts/sync-ledger.mjs" ]; then
  node "$REPO_ROOT/scripts/sync-ledger.mjs" --to-markdown > /dev/null 2>&1 || true
fi

if [ "$AGENT_EXIT" -eq 0 ]; then
  echo "[$(date)] CEO heartbeat completed" >&2
else
  echo "[$(date)] CEO heartbeat finished (agent had exit code $AGENT_EXIT)" >&2
fi
