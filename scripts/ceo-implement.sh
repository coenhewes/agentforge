#!/usr/bin/env bash
#
# CEO Implementation Script
# CEO reads coordinator's synthesized board decision and executes
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# CLI: prefer dist/entry.js (VPS/build), fallback to moltbot.mjs
CLI="${REPO_ROOT}/dist/entry.js"
[[ -f "$CLI" ]] || CLI="${REPO_ROOT}/moltbot.mjs"

# Validate the latest coordinator decision before triggering the CEO.
# This fails fast when the coordinator output is missing/invalid.
DECISION_JSON="$(node "$REPO_ROOT/scripts/parse-coordinator-decision.mjs" --agent coordinator 2>/dev/null || true)"
if [[ -z "${DECISION_JSON:-}" ]]; then
  echo "[$(date)] ERROR: Coordinator decision missing/invalid. Re-run board meeting or open agent:coordinator:main and ensure it includes DECISION_JSON5." >&2
  exit 1
fi

# CEO implementation prompt
PROMPT="CEO Daily Execution - $(date +"%Y-%m-%d")

Your tasks today:

1. READ BOARD DECISION:
   - Use sessions_history to read agent:coordinator:main (latest response)
   - The coordinator has synthesized the board's decision
   - Extract: product name, budget, timeline, build plan, marketing plan, kill thresholds
   - If coordinator says 'NO CONSENSUS', proceed with best-effort synthesis or spawn proxies to fill gaps

   Additionally, a machine-readable decision payload is provided below. Treat it as authoritative when present:

DECISION_JSON:
${DECISION_JSON}

PROVISIONING PROTOCOL (apply to each provisioningNeeds item):
- Attempt autonomously first:
  - Use browser to sign up / login / create API keys
  - Use email tooling for email verification when possible
  - Store resulting secrets in config env vars (preferred): node moltbot.mjs config set env.vars.<KEY>='<value>'
  - Smoke-test access via a deterministic CLI/API command
- If blocked by CAPTCHA / SMS / KYC / 2FA push / billing details:
  - Use request_human (category=access|critical|blocked) with exact steps + current URL
  - Continue with other tasks in parallel while waiting if possible

2. CREATE EXECUTION PLAN:
   - Break down the board's decision into specific tasks
   - Identify which workers to spawn (developers, marketers, researchers)
   - Allocate budget per worker (stay within board-approved total)
   - Set milestones and deadlines

3. SPAWN WORKERS:
   - Use sessions_spawn to create worker agents
   - Example: Developer agent to build the product
     sessions_spawn task:'Build [Product] as specified by board.
     Tech stack: [from CTO recommendation]
     Timeline: [X] days
     Budget: \$[Y]
     Deploy to Vercel when ready.
     
     CRITICAL REPORTING PROTOCOL:
     - Upon completion: sessions_send agent:ceo:main '\''COMPLETE [YOUR-WORKER-ID]: <summary of what built>'\''
     - When blocked: sessions_send agent:ceo:main '\''BLOCKED [YOUR-WORKER-ID]: <blocker description> REQ-XXXXX'\''
     - Daily progress: sessions_send agent:ceo:main '\''PROGRESS [YOUR-WORKER-ID]: <metrics and status>'\''
     Replace [YOUR-WORKER-ID] with your actual worker identifier.'
   
   - Example: Marketing agent to launch
     sessions_spawn task:'Launch [Product] as specified by board.
     Channels: [from CMO plan]
     Timeline: [X] days
     Budget: \$[Y]
     Report metrics daily.
     
     CRITICAL REPORTING PROTOCOL:
     - Upon completion: sessions_send agent:ceo:main '\''COMPLETE [YOUR-WORKER-ID]: <summary of results>'\''
     - When blocked: sessions_send agent:ceo:main '\''BLOCKED [YOUR-WORKER-ID]: <blocker description> REQ-XXXXX'\''
     - Daily progress: sessions_send agent:ceo:main '\''PROGRESS [YOUR-WORKER-ID]: <metrics and status>'\''
     Replace [YOUR-WORKER-ID] with your actual worker identifier.'
   
   - Provide full context from board decision to workers
   - ALWAYS include the reporting protocol in every worker spawn

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
- Use \`gh\` and \`vercel\` CLI commands directly. They are authenticated. Don't ask for tokens.
- Spawn workers to do the work - don't do it yourself
- Kill bad investments quickly per thresholds (no sunk cost fallacy)
- Track every dollar in LEDGER.md
- Execute first, report later - don't present options and wait

BEGIN EXECUTION."

# Send to CEO agent
cd "$REPO_ROOT"
node "$CLI" agent --agent ceo --message "$PROMPT" > /dev/null 2>&1

echo "[$(date)] CEO implementation triggered successfully" >&2
echo "[$(date)] CEO is reading agent:coordinator:main for board decision" >&2
