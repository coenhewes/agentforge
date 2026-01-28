#!/usr/bin/env bash
#
# CEO Implementation Script
# CEO reads coordinator's synthesized board decision and executes
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# CEO implementation prompt
PROMPT="CEO Daily Execution - $(date +"%Y-%m-%d")

Your tasks today:

1. READ BOARD DECISION:
   - Use sessions_history to read agent:coordinator:main (latest response)
   - The coordinator has synthesized the board's decision
   - Extract: product name, budget, timeline, build plan, marketing plan, kill thresholds
   - If coordinator says 'NO CONSENSUS', wait for next meeting

2. CREATE EXECUTION PLAN:
   - Break down the board's decision into specific tasks
   - Identify which workers to spawn (developers, marketers, researchers)
   - Allocate budget per worker (stay within board-approved total)
   - Set milestones and deadlines

3. SPAWN WORKERS:
   - Use sessions_spawn to create worker agents
   - Example: Developer agent to build the product
     sessions_spawn task:\"Build [Product] as specified by board.
     Tech stack: [from CTO's recommendation]
     Timeline: [X] days
     Budget: \$[Y]
     Deploy to Vercel when ready.\"
   
   - Example: Marketing agent to launch
     sessions_spawn task:\"Launch [Product] as specified by board.
     Channels: [from CMO's plan]
     Timeline: [X] days
     Budget: \$[Y]
     Report metrics daily.\"
   
   - Provide full context from board decision to workers

4. TRACK INVESTMENT:
   - Update LEDGER.md with new investment entry
   - Record: ID, product, budget, kill threshold, start date
   - Update MEMORY.md with execution plan
   - Log board decision for reference

5. MONITOR ACTIVE INVESTMENTS:
   - Check progress on any active investments from previous days
   - Update LEDGER.md with spend and revenue
   - Check kill thresholds - terminate if needed per board criteria
   - Use sessions_send to communicate with workers

6. REPORT TO BOARD (via Coordinator):
   - Prepare brief status update
   - Include: progress, metrics, spend, revenue, blockers
   - Note any investments approaching kill thresholds
   - Send update to coordinator for tomorrow's board meeting

REMEMBER:
- Read agent:coordinator:main for the board decision (NOT individual board members)
- You have FULL AUTHORITY to execute the board's decision
- Do NOT ask for permission - just do it
- Spawn workers to do the work - don't do it yourself
- Kill bad investments quickly per thresholds (no sunk cost fallacy)
- Track every dollar in LEDGER.md

BEGIN EXECUTION."

# Send to CEO agent
cd "$REPO_ROOT"
node moltbot.mjs agent --agent ceo --message "$PROMPT" > /dev/null 2>&1

echo "[$(date)] CEO implementation triggered successfully" >&2
echo "[$(date)] CEO is reading agent:coordinator:main for board decision" >&2
