#!/usr/bin/env bash
#
# Board Meeting Trigger Script (two-way consensus)
# 1. Run analyst only; get analyst report.
# 2. Send analyst report to CFO, CTO, CMO, COO, risk, innovation, pr so they react to the same evidence.
# 3. Coordinator synthesizes from all 8.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Optional: run with live TUI (real-time view of phase and each agent's output)
if [[ "${1:-}" == "--tui" || "${1:-}" == "-tui" ]]; then
  exec node "$REPO_ROOT/scripts/board-meeting-tui.mjs"
fi

DATE=$(date +"%Y-%m-%d")

cd "$REPO_ROOT"

# CLI: prefer dist/entry.js (VPS/build), fallback to moltbot.mjs
CLI="${REPO_ROOT}/dist/entry.js"
[[ -f "$CLI" ]] || CLI="${REPO_ROOT}/moltbot.mjs"

echo "[$(date)] Starting board meeting for ${DATE}..." >&2

# Capture current venture state (LEDGER + optional CEO status) for analyst and coordinator
CURRENT_STATE=$(node "$REPO_ROOT/scripts/board-get-current-state.mjs" 2>/dev/null || true)

# Analyst runs first; other seven see analyst's report (shared context)
BOARD_MEMBERS_AFTER_ANALYST=("cfo" "cto" "cmo" "coo" "risk" "innovation" "pr")

# --- Phase 1: Run analyst only ---
echo "[$(date)] Triggering analyst (Market Analyst researches opportunities)..." >&2
TMP_PROMPT=$(mktemp)
trap 'rm -f "$TMP_PROMPT"' EXIT
{
  echo "CRITICAL: This message is Board Meeting Phase 1 only. Your ONLY task is to research NEW market opportunities with the browser. Do NOT discuss existing projects, deploys, CI, or VibeCheckDocs. Ignore any previous conversation in this session."
  echo ""
  echo "Board Meeting ${DATE} - YOUR ROLE: Market Analyst."
  echo ""
  echo "Portfolio context: we may have existing ventures; your output must be ONLY new opportunity research (3-5 opportunities with evidence). Do not suggest waitlists, CSVs, templates, or next-step deliverables."
  echo ""
  echo "CRITICAL: Use the browser tool RIGHT NOW to research opportunities. Do not make up hypothetical ideas."
  echo ""
  echo "YOUR TASK:"
  echo "1. Browse Reddit (r/SaaS, r/Entrepreneur, r/startups) for customer pain points"
  echo "2. Check Product Hunt for trending products and competitor pricing"
  echo "3. Search Twitter/X for complaints about existing tools"
  echo "4. Identify 3 REAL market opportunities with DATA"
  echo ""
  echo "You MUST label each opportunity as Opportunity 1: [short name], Opportunity 2: [short name], Opportunity 3: [short name] (e.g. Opportunity 1: Docs→Publish, Opportunity 2: AIBilling Firewall, Opportunity 3: WASM Sandbox) so the board can reference them consistently."
  echo ""
  echo "For each opportunity, provide:"
  echo "- Problem: What pain point? (with real quotes/evidence)"
  echo "- Market size: Estimated TAM"
  echo "- Competitors: Who exists? What do they charge? What do reviews say?"
  echo "- Gap: What's missing?"
  echo "- Est. ROI: Based on competitor pricing"
  echo ""
  echo "Present your findings clearly. The coordinator will read your response."
} > "$TMP_PROMPT"
node "$CLI" agent --agent analyst --message "$(cat "$TMP_PROMPT")" > /dev/null 2>&1 \
  || echo "  Warning: analyst failed" >&2

# Poll analyst until substantive reply (non-empty, contains "Opportunity" or long enough) or max wait
echo "[$(date)] Polling for analyst response (max 2.5 min)..." >&2
ANALYST_BRIEF=""
MAX_WAIT_SEC=150
POLL_INTERVAL_SEC=10
ELAPSED=0
while [[ $ELAPSED -lt $MAX_WAIT_SEC ]]; do
  ANALYST_BRIEF=$(node "$REPO_ROOT/scripts/board-get-session-message.mjs" --agent analyst --must-contain "Opportunity" 2>/dev/null || true)
  if [[ -n "${ANALYST_BRIEF:-}" ]]; then
    break
  fi
  # Fallback: any non-empty reply of reasonable length
  ANALYST_BRIEF=$(node "$REPO_ROOT/scripts/board-get-session-message.mjs" --agent analyst 2>/dev/null || true)
  if [[ -n "${ANALYST_BRIEF:-}" && ${#ANALYST_BRIEF} -gt 200 ]]; then
    break
  fi
  ANALYST_BRIEF=""
  echo "[$(date)] Waiting for analyst response (${ELAPSED}s)..." >&2
  sleep "$POLL_INTERVAL_SEC"
  ELAPSED=$((ELAPSED + POLL_INTERVAL_SEC))
done

# Sanity check before Phase 2
if [[ -z "${ANALYST_BRIEF:-}" ]]; then
  echo "[$(date)] WARNING: No substantive analyst report after ${MAX_WAIT_SEC}s. Aborting board meeting; other members need analyst context." >&2
  echo "[$(date)] Re-run board meeting after analyst has completed, or run analyst manually and retry." >&2
  exit 1
fi
if [[ ${#ANALYST_BRIEF} -lt 100 ]]; then
  echo "[$(date)] WARNING: Analyst report very short (${#ANALYST_BRIEF} chars). Proceeding; coordinator may have weak context." >&2
fi

# --- Phase 2: Run the other seven with shared analyst report ---
# Use temp files to avoid escaping issues with analyst content
TMP_ANALYST=$(mktemp)
TMP_MSG=$(mktemp)
trap 'rm -f "$TMP_PROMPT" "$TMP_ANALYST" "$TMP_MSG"' EXIT
printf '%s' "${ANALYST_BRIEF:-}" > "$TMP_ANALYST"

# Role-specific instructions (after "Using the report above")
OPPS_LINE="Use the analyst's exact opportunity numbers and names (Opportunity 1: …, Opportunity 2: …, Opportunity 3: …) from the report above. Do not rename or renumber; reference them verbatim so the board has one consistent vocabulary.

"
declare -A ROLE_INSTRUCTIONS
ROLE_INSTRUCTIONS[cfo]="${OPPS_LINE}Your job:
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

ROLE_INSTRUCTIONS[cto]="${OPPS_LINE}Your job:
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

ROLE_INSTRUCTIONS[cmo]="${OPPS_LINE}Your job:
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

ROLE_INSTRUCTIONS[coo]="${OPPS_LINE}Your job:
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

ROLE_INSTRUCTIONS[risk]="${OPPS_LINE}Your job:
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

ROLE_INSTRUCTIONS[innovation]="${OPPS_LINE}Your job:
1. First evaluate the three opportunities from the analyst report above (brief stance on each).
2. Then add 1-2 unconventional or experimental ideas that extend or complement those opportunities.
3. Identify emerging trends (AI, no-code, creator economy, etc.) that relate to the report.
4. Do not propose a separate multi-thousand-dollar initiative unrelated to the analyst's three; keep experimental budget asks scoped and tied to the report.

For your evaluation and ideas, provide:
- Brief stance on each of the three opportunities from the report
- 1-2 experimental angles that extend or complement them
- Opportunity: [what], Why now: [timing], Potential: [upside], Risk: [downside], Budget: \$X (if any)

Think 10x, not 2x. But ground ideas in the report. Present clearly."

ROLE_INSTRUCTIONS[pr]="${OPPS_LINE}Your job: (1) Read all project docs available (workspace MEMORY, repo docs, and the venture/board context in this prompt) and use them when writing. (2) Use the default browser profile so the existing Moltbook connection is reused; do not log in again unless the site shows a login page. (3) Go to Moltbook and create content (blog post, update, or social post) summarizing today's board discussion and the opportunities from the analyst report above, informed by the docs. Post or save the content on Moltbook. In your response, state briefly what you published and where. You do not vote on ventures."

# Display names for prompt header (e.g. cfo -> CFO, risk -> Risk Manager)
declare -A ROLE_NAMES
ROLE_NAMES[cfo]="CFO"
ROLE_NAMES[cto]="CTO"
ROLE_NAMES[cmo]="CMO"
ROLE_NAMES[coo]="COO"
ROLE_NAMES[risk]="Risk Manager"
ROLE_NAMES[innovation]="Innovation Lead"
ROLE_NAMES[pr]="PR Lead"

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
    echo "We can run multiple projects in parallel; evaluate opportunities in that context (continue existing, kill, or add)."
    echo ""
    echo "STAY IN YOUR LANE: You are ONLY the ${ROLE_NAMES[$member]:-$member}. Do not do other roles' jobs (no marketing if you are CFO, no tech stack if you are CMO, no ops if you are CTO, etc.). Do not act as a general AI assistant. Output ONLY your role's analysis in the format below."
    echo ""
    echo "Using the report above, ${ROLE_INSTRUCTIONS[$member]}"
  } > "$TMP_MSG"
  node "$CLI" agent --agent "$member" --message "$(cat "$TMP_MSG")" > /dev/null 2>&1 \
    || echo "  Warning: $member failed" >&2
done

# Give agents a moment to finish writing their updates
echo "[$(date)] Giving agents a moment to finish writing..." >&2
sleep 5

# --- Phase 3: Coordinator synthesizes from all 8 ---
echo "[$(date)] Triggering coordinator to synthesize decision..." >&2
TMP_COORD=$(mktemp)
trap 'rm -f "$TMP_PROMPT" "$TMP_ANALYST" "$TMP_MSG" "$TMP_COORD"' EXIT
{
  echo "Board Meeting ${DATE} - SYNTHESIZE DECISION"
  echo ""
  if [[ -n "${CURRENT_STATE:-}" ]]; then
    echo "CURRENT VENTURE STATE (read this first):"
    echo "---"
    printf '%s' "$CURRENT_STATE"
    echo ""
    echo "---"
    echo ""
    echo "Using the current state above and the board members' responses, synthesize a decision. We can have multiple active ventures at once; you may recommend: continue/expand current venture(s), kill one and pivot, or add a new venture (your DECISION_JSON5 is the one new venture this meeting, or NoNewVenture). Be explicit."
    echo ""
  fi
  echo "Read the latest responses from all 8 board members:"
  echo "- agent:analyst:main (Market Analyst's opportunities)"
  echo "- agent:cfo:main (Financial analysis)"
  echo "- agent:cto:main (Technical feasibility)"
  echo "- agent:cmo:main (Marketing strategy)"
  echo "- agent:coo:main (Operations plan)"
  echo "- agent:risk:main (Risk assessment)"
  echo "- agent:innovation:main (Alternative ideas)"
  echo "- agent:pr:main (PR Lead – Moltbook content)"
  echo ""
  echo "Board members have all seen the same analyst report and responded to it. Your task:"
  echo "1. Read each member's latest response using sessions_history"
  echo "2. Extract key points from each"
  echo "3. Identify which opportunity has the most support"
  echo "4. Synthesize into a clear BOARD DECISION using the exact format from your SOUL.md"
  echo "5. Include all necessary details: budget, timeline, build plan, marketing plan, kill thresholds"
  echo ""
  echo "The CEO will read YOUR decision to execute. Be clear and actionable."
} > "$TMP_COORD"
node "$CLI" agent --agent coordinator --message "$(cat "$TMP_COORD")" > /dev/null 2>&1

echo "[$(date)] Board meeting complete. Coordinator has synthesized decision." >&2
echo "[$(date)] CEO can now read agent:coordinator:main for the board decision." >&2
