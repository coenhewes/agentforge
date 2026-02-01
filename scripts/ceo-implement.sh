#!/usr/bin/env bash
#
# CEO Implementation Script
# CEO reads coordinator's synthesized board decision and executes
#
# Options:
#   --tui, -tui   Run CEO in background and open TUI (agent:ceo:main) so you can watch live
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Optional: TUI mode (run CEO in background, then open TUI to watch)
USE_TUI=false
if [[ "${1:-}" == "--tui" || "${1:-}" == "-tui" ]]; then
  USE_TUI=true
fi

# CLI: prefer dist/entry.js (VPS/build), fallback to moltbot.mjs
CLI="${REPO_ROOT}/dist/entry.js"
[[ -f "$CLI" ]] || CLI="${REPO_ROOT}/moltbot.mjs"

# Resolve decision: try store first, then coordinator transcript, then last-good store, then best-effort (no exit 1).
STORE_DIR="${OPENCLAW_STATE_DIR:-${CLAWDBOT_STATE_DIR:-$HOME/.moltbot}}"
DECISION_JSON=""
PARSER_STDERR=""
rm -f /tmp/ceo-parse-coordinator.stderr.$$

# 1. Try decision store (coordinator writes via submit_board_decision tool)
DECISION_JSON="$(node "$REPO_ROOT/scripts/parse-coordinator-decision.mjs" --from-store 2> /tmp/ceo-parse-coordinator.stderr.$$ || true)"
if [[ -n "${DECISION_JSON:-}" ]]; then
  echo "[$(date)] Using decision from store." >&2
fi

# 2. Try coordinator transcript
if [[ -z "${DECISION_JSON:-}" ]]; then
  PARSER_STDERR="$(cat /tmp/ceo-parse-coordinator.stderr.$$ 2>/dev/null)"
  DECISION_JSON="$(node "$REPO_ROOT/scripts/parse-coordinator-decision.mjs" --agent coordinator 2> /tmp/ceo-parse-coordinator.stderr.$$ || true)"
  if [[ -n "${DECISION_JSON:-}" ]]; then
    echo "[$(date)] Using decision from coordinator transcript." >&2
  fi
fi

# 3. Try last-good decision store
if [[ -z "${DECISION_JSON:-}" ]]; then
  LAST_GOOD="$STORE_DIR/board-decision-last-good.json"
  if [[ -f "$LAST_GOOD" ]]; then
    DECISION_JSON="$(node "$REPO_ROOT/scripts/parse-coordinator-decision.mjs" --from-store --store-file "$LAST_GOOD" 2> /tmp/ceo-parse-coordinator.stderr.$$ || true)"
    if [[ -n "${DECISION_JSON:-}" ]]; then
      echo "[$(date)] Using last good decision from store." >&2
    fi
  fi
fi

# 4. Best-effort: no structured decision; CEO will read coordinator session
if [[ -z "${DECISION_JSON:-}" ]]; then
  PARSER_STDERR="$(cat /tmp/ceo-parse-coordinator.stderr.$$ 2>/dev/null)"
  echo "[$(date)] No valid decision in store or coordinator transcript. Running CEO in best-effort mode (read coordinator session and proceed)." >&2
  if [[ -n "${PARSER_STDERR:-}" ]]; then
    echo "[$(date)] Parser said: $PARSER_STDERR" >&2
  fi
  BEST_EFFORT=1
fi
rm -f /tmp/ceo-parse-coordinator.stderr.$$

# CEO implementation prompt: write to temp file so DECISION_JSON (JSON with quotes) is safe
CEOPROMPT_FILE="${TMPDIR:-/tmp}/ceo-implement-prompt-$$.txt"
trap 'rm -f "$CEOPROMPT_FILE"' EXIT

if [[ -n "${BEST_EFFORT:-}" ]]; then
  DECISION_BLOCK="No structured decision in store. Use sessions_history to read agent:coordinator:main (latest response), extract the board's direction, and proceed with best effort. If coordinator said NO CONSENSUS, synthesize from board members or spawn proxies to fill gaps."
else
  DECISION_BLOCK="A machine-readable decision payload is provided below. Treat it as authoritative when present:

DECISION_JSON:
${DECISION_JSON}"
fi

cat > "$CEOPROMPT_FILE" << CEOPROMPT_END
CEO Daily Execution - $(date +%Y-%m-%d)

Your tasks today:

1. READ BOARD DECISION:
   - Use sessions_history to read agent:coordinator:main (latest response)
   - The coordinator has synthesized the board's decision
   - Extract: product name, budget, timeline, build plan, marketing plan, kill thresholds
   - If coordinator says 'NO CONSENSUS', proceed with best-effort synthesis or spawn proxies to fill gaps

   ${DECISION_BLOCK}

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
   - Every developer task must require: Commit and push when you complete a logical chunk. Report PROGRESS to agent:ceo:main with what you built and when you last pushed.
   - Example: Developer agent to build the product
     sessions_spawn task:'Build [Product] as specified by board.
     Tech stack: [from CTO recommendation]
     Timeline: [X] days
     Budget: \$[Y]
     Deploy to Vercel when ready.
     
     CRITICAL REPORTING PROTOCOL:
     - Upon completion: sessions_send agent:ceo:main "COMPLETE [YOUR-WORKER-ID]: <summary of what built>"
     - When blocked: sessions_send agent:ceo:main "BLOCKED [YOUR-WORKER-ID]: <blocker description> REQ-XXXXX"
     - Daily progress: sessions_send agent:ceo:main "PROGRESS [YOUR-WORKER-ID]: <metrics and status>"
     Replace [YOUR-WORKER-ID] with your actual worker identifier.'
   
   - Example: Marketing agent to launch
     sessions_spawn task:'Launch [Product] as specified by board.
     Channels: [from CMO plan]
     Timeline: [X] days
     Budget: \$[Y]
     Report metrics daily.
     
     CRITICAL REPORTING PROTOCOL:
     - Upon completion: sessions_send agent:ceo:main "COMPLETE [YOUR-WORKER-ID]: <summary of results>"
     - When blocked: sessions_send agent:ceo:main "BLOCKED [YOUR-WORKER-ID]: <blocker description> REQ-XXXXX"
     - Daily progress: sessions_send agent:ceo:main "PROGRESS [YOUR-WORKER-ID]: <metrics and status>"
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

BEGIN EXECUTION.
CEOPROMPT_END

# Send to CEO agent (--message-file avoids shell quoting of JSON in DECISION_JSON)
cd "$REPO_ROOT"
if [[ "$USE_TUI" == true ]]; then
  echo "[$(date)] CEO run starting in background; opening TUI (agent:ceo:main) so you can watch live..." >&2
  node "$CLI" agent --agent ceo --message-file "$CEOPROMPT_FILE" >> /tmp/ceo-implement-tui.log 2>&1 &
  sleep 2
  exec node "$CLI" tui --session agent:ceo:main
else
  echo "[$(date)] CEO run starting (agent reading coordinator decision)..." >&2
  node "$CLI" agent --agent ceo --message-file "$CEOPROMPT_FILE"
  echo "[$(date)] CEO run finished" >&2
fi
