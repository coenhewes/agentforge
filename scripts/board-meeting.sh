#!/usr/bin/env bash
#
# Board Meeting Trigger Script
# Sends prompt to all 7 board members, then coordinator synthesizes
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DATE=$(date +"%Y-%m-%d")

cd "$REPO_ROOT"

echo "[$(date)] Starting board meeting for ${DATE}..." >&2

# Define board members
BOARD_MEMBERS=("analyst" "cfo" "cto" "cmo" "coo" "risk" "innovation")

# Role-specific prompts for each board member
declare -A PROMPTS

PROMPTS[analyst]="Board Meeting ${DATE} - YOUR ROLE: Market Analyst

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

Present your findings clearly. The coordinator will read your response."

PROMPTS[cfo]="Board Meeting ${DATE} - YOUR ROLE: CFO

The Market Analyst will present opportunities. Your job:

1. Evaluate financial viability of each opportunity
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

PROMPTS[cto]="Board Meeting ${DATE} - YOUR ROLE: CTO

The Market Analyst will present opportunities. Your job:

1. Assess technical feasibility
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

PROMPTS[cmo]="Board Meeting ${DATE} - YOUR ROLE: CMO

The Market Analyst will present opportunities. Your job:

1. Identify target customers
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

PROMPTS[coo]="Board Meeting ${DATE} - YOUR ROLE: COO

The Market Analyst will present opportunities. Your job:

1. Assess resource requirements (people, tools, freelancers)
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

PROMPTS[risk]="Board Meeting ${DATE} - YOUR ROLE: Risk Manager

The Market Analyst will present opportunities. Your job:

1. Identify risks (market, execution, financial, opportunity cost)
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

PROMPTS[innovation]="Board Meeting ${DATE} - YOUR ROLE: Innovation Lead

The Market Analyst will present opportunities. Your job:

1. Add 1-2 unconventional or experimental ideas
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

# Send prompts to all board members SEQUENTIALLY
echo "[$(date)] Running board members sequentially..." >&2
for member in "${BOARD_MEMBERS[@]}"; do
  echo "  Triggering: $member" >&2
  node moltbot.mjs agent --agent "$member" --message "${PROMPTS[$member]}" > /dev/null 2>&1 \
    || echo "  Warning: $member failed" >&2
done

# Give agents a moment to finish writing their updates
echo "[$(date)] Giving agents a moment to finish writing..." >&2
sleep 5

# Now trigger coordinator to synthesize
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

Your task:
1. Read each member's latest response using sessions_history
2. Extract key points from each
3. Identify which opportunity has the most support
4. Synthesize into a clear BOARD DECISION using the exact format from your SOUL.md
5. Include all necessary details: budget, timeline, build plan, marketing plan, kill thresholds

The CEO will read YOUR decision to execute. Be clear and actionable." > /dev/null 2>&1

echo "[$(date)] Board meeting complete. Coordinator has synthesized decision." >&2
echo "[$(date)] CEO can now read agent:coordinator:main for the board decision." >&2
