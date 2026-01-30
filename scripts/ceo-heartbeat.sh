#!/usr/bin/env bash
#
# CEO Heartbeat Script
# Runs every 30 minutes to provide continuous oversight of all ventures and workers
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# CEO heartbeat prompt
PROMPT="CEO Heartbeat - $(date +"%Y-%m-%d %H:%M")

Your continuous oversight tasks:

1. CHECK ACTIVE INVESTMENTS:
   - Read LEDGER.md to see all active investments
   - For each active investment, check if approaching kill thresholds
   - Update spend/revenue if you have new information

2. POLL SPAWNED WORKERS:
   - Use sessions_history to check each known worker session
   - Look for COMPLETE, BLOCKED, or PROGRESS messages
   - Unblock workers if they report issues
   - Make tactical decisions to keep work moving

3. UPDATE LEDGER:
   - Update LEDGER.md with latest spend and revenue data
   - Mark investments as completed or killed if status changed

4. EXECUTE KILL SWITCHES:
   - If any investment hit its kill threshold, terminate immediately
   - Update LEDGER.md to move killed investment to failures table
   - Free up capital for reallocation

5. SPAWN ADDITIONAL WORKERS:
   - If needed based on progress, spawn more workers
   - Always check budget before spawning

6. PARALLEL WORK:
   - If blocked on one venture, work on others
   - Don't sit idle - maximize productivity

REMEMBER: 
- This is CONTINUOUS execution, not once per day
- You are the runtime supervisor of all ventures
- Make tactical decisions autonomously
- Only request human for truly blocked situations
- If all is running smoothly, reply HEARTBEAT_OK

BEGIN CONTINUOUS OVERSIGHT."

# Send to CEO agent
cd "$REPO_ROOT"
node moltbot.mjs agent --agent ceo --message "$PROMPT" > /dev/null 2>&1

# After CEO heartbeat, run venture runloop for active investments
# Extract active investment IDs from LEDGER.md and run venture:tick for each
if [ -f ~/.moltbot/agents/ceo/LEDGER.md ]; then
  # Parse active investments from LEDGER.md
  # Look for lines like: | INV-001 | ProductName | ...
  ACTIVE_IDS=$(grep -A 50 "## Active Investments" ~/.moltbot/agents/ceo/LEDGER.md | grep "^| INV-" | cut -d'|' -f2 | tr -d ' ' || true)
  
  for venture_id in $ACTIVE_IDS; do
    if [ ! -z "$venture_id" ] && [ "$venture_id" != "-" ]; then
      echo "[$(date)] Running venture tick for $venture_id" >&2
      node moltbot.mjs venture:tick --venture-id "$venture_id" > /dev/null 2>&1 || true
    fi
  done
fi

# Sync LEDGER.md with SQLite (when sync script exists)
if [ -f "$REPO_ROOT/scripts/sync-ledger.mjs" ]; then
  node "$REPO_ROOT/scripts/sync-ledger.mjs" > /dev/null 2>&1 || true
fi

echo "[$(date)] CEO heartbeat completed" >&2
