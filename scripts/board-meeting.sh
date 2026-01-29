#!/usr/bin/env bash
#
# Board Meeting Trigger Script (two-way consensus)
# 1. Run analyst only; get analyst report.
# 2. Send analyst report to CFO, CTO, CMO, COO, risk, innovation so they react to the same evidence.
# 3. Coordinator synthesizes from all 7.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DATE=$(date +"%Y-%m-%d")

cd "$REPO_ROOT"

echo "[$(date)] Starting board meeting for ${DATE}..." >&2

# Analyst runs first; other six see analyst's report (shared context)
BOARD_MEMBERS_AFTER_ANALYST=("cfo" "cto" "cmo" "coo" "risk" "innovation")

# --- Phase 1: Run analyst only ---
echo "[$(date)] Triggering analyst (Market Analyst researches opportunities)..." >&2
node moltbot.mjs agent --agent analyst --message "Board Meeting ${DATE} - YOUR ROLE: Market Analyst

CRITICAL: Use the browser tool RIGHT NOW to research opportunities. Do not make up hypothetical ideas.

YOUR TASK:
1. Browse Reddit (r/SaaS, r/Entrepreneur, r/startups) for customer pain points
2. Check Product Hunt for trending products and competitor pricing
3. Search Twitter/X for complaints about existing tools
4. Identify 3 REAL market opportunities with DATA

For each opportunity, provide:
- Problem: What pain point? (with real quotes/evidence)
- Market size: Estimated TAM
- Competitors: Who exists? What do they charge? What do reviews say?
- Gap: What's missing?
- Est. ROI: Based on competitor pricing

Present your findings clearly. The coordinator will read your response." > /dev/null 2>&1 \
  || echo "  Warning: analyst failed" >&2

# Wait for analyst to finish writing; then get last message (with retries)
echo "[$(date)] Giving analyst time to finish writing..." >&2
sleep 5
ANALYST_BRIEF=""
for _ in 1 2 3 4 5; do
  ANALYST_BRIEF=$(node "$REPO_ROOT/scripts/board-get-session-message.mjs" --agent analyst 2>/dev/null || true)
  if [[ -n "${ANALYST_BRIEF:-}" ]]; then
    break
  fi
  echo "[$(date)] Waiting for analyst response (retry)..." >&2
  sleep 10
done

if [[ -z "${ANALYST_BRIEF:-}" ]]; then
  echo "[$(date)] WARNING: Could not read analyst report. Other members will run without shared context." >&2
fi

# --- Phase 2: Run the other six with shared analyst report ---
# Use temp files to avoid escaping issues with analyst content
TMP_ANALYST=$(mktemp)
TMP_MSG=$(mktemp)
trap 'rm -f "$TMP_ANALYST" "$TMP_MSG"' EXIT
printf '%s' "${ANALYST_BRIEF:-}" > "$TMP_ANALYST"

# Role-specific instructions (after "Using the report above")
declare -A ROLE_INSTRUCTIONS
ROLE_INSTRUCTIONS[cfo]="Your job:
1. Evaluate financial viability of each opportunity above
2. Recommend budget allocation (how much to invest?)
3. Calculate expected ROI and timeline
4. Set kill thresholds based on risk/reward
5. Assess runway impact

For each opportunity, state:
- Recommended budget: \$X
- Expected ROI: Xx in Y days
- Kill if: [specific threshold]
- Risk level: Low/Medium/High

Be conservative but opportunistic. Present your analysis clearly."

ROLE_INSTRUCTIONS[cto]="Your job:
1. Assess technical feasibility of each opportunity above
2. Estimate build timeline (be realistic + 50% buffer)
3. Recommend tech stack
4. Calculate infrastructure costs
5. Identify technical risks

For each opportunity, state:
- Build complexity: Simple/Medium/Complex
- Timeline: X days to MVP
- Tech stack: [specific choices]
- Infrastructure: \$X/month
- Risks: [list]

Prefer boring, proven tech. Present your analysis clearly."

ROLE_INSTRUCTIONS[cmo]="Your job:
1. Identify target customers for each opportunity above
2. Recommend acquisition channels (organic preferred)
3. Estimate Customer Acquisition Cost (CAC)
4. Design go-to-market strategy
5. Assess marketing feasibility

For each opportunity, state:
- Target customer: [who]
- Channels: [where to find them]
- CAC estimate: \$X
- Launch plan: [specific steps]
- Timeline: X days

Focus on low-cost, high-impact channels. Present your analysis clearly."

ROLE_INSTRUCTIONS[coo]="Your job:
1. Assess resource requirements (people, tools, freelancers) for each opportunity above
2. Evaluate operational complexity
3. Identify bottlenecks and dependencies
4. Validate timeline feasibility
5. Plan execution

For each opportunity, state:
- Resources needed: [list]
- Operational complexity: Low/Medium/High
- Bottlenecks: [list]
- Timeline assessment: Realistic/Aggressive/Conservative
- Execution plan: [key milestones]

Be pragmatic. Present your analysis clearly."

ROLE_INSTRUCTIONS[risk]="Your job:
1. Identify risks (market, execution, financial, opportunity cost) for each opportunity above
2. Set appropriate kill thresholds
3. Assess downside scenarios
4. Recommend risk mitigation
5. Evaluate portfolio balance

For each opportunity, state:
- Key risks: [list]
- Kill thresholds: [specific, measurable criteria]
- Max downside: \$X (acceptable?)
- Mitigation: [actions]
- Recommendation: Approve/Reject/Conditional

Protect the downside. Present your analysis clearly."

ROLE_INSTRUCTIONS[innovation]="Your job:
1. Add 1-2 unconventional or experimental ideas given the opportunities above
2. Identify emerging trends (AI, no-code, creator economy, etc.)
3. Propose high-risk/high-reward alternatives
4. Challenge conservative thinking
5. Advocate for experimental budget

For your ideas, provide:
- Opportunity: [what]
- Why now: [timing/trend]
- Potential: [upside]
- Risk: [downside]
- Budget: \$X

Think 10x, not 2x. But ground ideas in reality. Present clearly."

# Display names for prompt header (e.g. cfo -> CFO, risk -> Risk Manager)
declare -A ROLE_NAMES
ROLE_NAMES[cfo]="CFO"
ROLE_NAMES[cto]="CTO"
ROLE_NAMES[cmo]="CMO"
ROLE_NAMES[coo]="COO"
ROLE_NAMES[risk]="Risk Manager"
ROLE_NAMES[innovation]="Innovation Lead"

echo "[$(date)] Running board members (with shared analyst report)..." >&2
for member in "${BOARD_MEMBERS_AFTER_ANALYST[@]}"; do
  echo "  Triggering: $member" >&2
  {
    echo "Board Meeting ${DATE} - YOUR ROLE: ${ROLE_NAMES[$member]:-$member}"
    echo ""
    echo "Here is the Market Analyst's report:"
    echo ""
    cat "$TMP_ANALYST"
    echo ""
    echo "---"
    echo ""
    echo "Using the report above, ${ROLE_INSTRUCTIONS[$member]}"
  } > "$TMP_MSG"
  node moltbot.mjs agent --agent "$member" --message "$(cat "$TMP_MSG")" > /dev/null 2>&1 \
    || echo "  Warning: $member failed" >&2
done

# Give agents a moment to finish writing their updates
echo "[$(date)] Giving agents a moment to finish writing..." >&2
sleep 5

# --- Phase 3: Coordinator synthesizes from all 7 ---
echo "[$(date)] Triggering coordinator to synthesize decision..." >&2
node moltbot.mjs agent --agent coordinator --message "Board Meeting ${DATE} - SYNTHESIZE DECISION

Read the latest responses from all 7 board members:
- agent:analyst:main (Market Analyst's opportunities)
- agent:cfo:main (Financial analysis)
- agent:cto:main (Technical feasibility)
- agent:cmo:main (Marketing strategy)
- agent:coo:main (Operations plan)
- agent:risk:main (Risk assessment)
- agent:innovation:main (Alternative ideas)

Board members have all seen the same analyst report and responded to it. Your task:
1. Read each member's latest response using sessions_history
2. Extract key points from each
3. Identify which opportunity has the most support
4. Synthesize into a clear BOARD DECISION using the exact format from your SOUL.md
5. Include all necessary details: budget, timeline, build plan, marketing plan, kill thresholds

The CEO will read YOUR decision to execute. Be clear and actionable." > /dev/null 2>&1

echo "[$(date)] Board meeting complete. Coordinator has synthesized decision." >&2
echo "[$(date)] CEO can now read agent:coordinator:main for the board decision." >&2
