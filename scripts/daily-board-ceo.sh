#!/usr/bin/env bash
#
# Single daily pipeline: board meeting → coordinator (writes decision to store) → CEO implement
# Run once per day (e.g. 9am cron). Replaces separate 9am board and 10am CEO implement entries.
# CEO heartbeat (every 30 min) remains separate (gateway or cron).
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Optional: pass --tui to board meeting (live view)
TUI_ARG=""
if [[ "${1:-}" == "--tui" || "${1:-}" == "-tui" ]]; then
  TUI_ARG="--tui"
fi

cd "$REPO_ROOT"

echo "[$(date)] Starting daily pipeline (board → coordinator → CEO implement)..." >&2

# 1. Board meeting: analyst → poll until substantive → other seven → coordinator
# Coordinator writes to decision store via submit_board_decision tool when it runs
"$SCRIPT_DIR/board-meeting.sh" $TUI_ARG

# 2. CEO implement: reads from store → coordinator transcript → last-good → best-effort
"$SCRIPT_DIR/ceo-implement.sh" $TUI_ARG

echo "[$(date)] Daily pipeline complete." >&2
