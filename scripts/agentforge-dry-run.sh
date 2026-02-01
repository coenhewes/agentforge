#!/usr/bin/env bash
#
# AgentForge dry-run: validate crontab, config path, and optionally gateway + one CEO run.
# Run after deployment to confirm cron, config, and gateway are set up correctly.
#
# Usage:
#   ./scripts/agentforge-dry-run.sh           # Check crontab, config, gateway
#   ./scripts/agentforge-dry-run.sh --probe    # Also run one short CEO message (can be slow)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

CLI="${REPO_ROOT}/dist/entry.js"
[[ -f "$CLI" ]] || CLI="${REPO_ROOT}/moltbot.mjs"

GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
STORE_DIR="${OPENCLAW_STATE_DIR:-${CLAWDBOT_STATE_DIR:-$HOME/.moltbot}}"
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${CLAWDBOT_CONFIG_PATH:-$STORE_DIR/moltbot.json}}"
if [[ -f "$STORE_DIR/clawdbot.json" ]]; then
  CONFIG_PATH="$STORE_DIR/clawdbot.json"
fi
if [[ -f "$STORE_DIR/openclaw.json" ]]; then
  CONFIG_PATH="$STORE_DIR/openclaw.json"
fi

OK=0
WARN=0

echo "AgentForge dry-run checks"
echo "------------------------"

# 1. Config path
if [[ -f "$CONFIG_PATH" ]]; then
  echo "  [OK] Config found: $CONFIG_PATH"
  ((OK++)) || true
else
  echo "  [WARN] Config not found at $CONFIG_PATH (set OPENCLAW_STATE_DIR or CLAWDBOT_STATE_DIR if using another path)"
  ((WARN++)) || true
fi

# 2. Crontab contains CEO heartbeat
if crontab -l 2>/dev/null | grep -q "ceo-heartbeat"; then
  echo "  [OK] Crontab contains CEO heartbeat"
  ((OK++)) || true
else
  echo "  [WARN] Crontab does not contain ceo-heartbeat (see ~/.moltbot/agentforge-cron.txt)"
  ((WARN++)) || true
fi

# 3. Gateway reachable
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${GATEWAY_PORT}/" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "302" ]]; then
  echo "  [OK] Gateway reachable at http://127.0.0.1:${GATEWAY_PORT}/ (HTTP $HTTP_CODE)"
  ((OK++)) || true
else
  echo "  [WARN] Gateway not reachable at http://127.0.0.1:${GATEWAY_PORT}/ (HTTP $HTTP_CODE). Start gateway or set OPENCLAW_GATEWAY_PORT."
  ((WARN++)) || true
fi

# 4. Optional: one short CEO run
if [[ "${1:-}" == "--probe" ]]; then
  echo "  Running short CEO probe (timeout 60s)..."
  if timeout 60 node "$CLI" agent --agent ceo --message "Dry run: reply with OK." 2>/dev/null; then
    echo "  [OK] CEO probe completed"
    ((OK++)) || true
  else
    echo "  [WARN] CEO probe failed or timed out (gateway down, config, or model)"
    ((WARN++)) || true
  fi
fi

echo "------------------------"
echo "Passed: $OK, Warnings: $WARN"
if [[ $WARN -gt 0 ]]; then
  exit 1
fi
