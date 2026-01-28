#!/bin/bash
# Weekly reflection for all AgentForge agents

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

AGENTS=("analyst" "cfo" "cto" "cmo" "coo" "risk" "innovation" "coordinator" "ceo")

echo "[$(date)] Starting weekly reflection for all agents..." >&2

for agent in "${AGENTS[@]}"; do
  (
    echo "  Reflecting: $agent" >&2
    node moltbot.mjs agent --agent "$agent" --message "
WEEKLY REFLECTION - $(date +%Y-%m-%d)

Please review your work this week and update your MEMORY.md:

1. Search your memory for this week's activities:
   \`memory_search 'this week decisions outcomes'\`

2. Compare predictions vs actuals:
   - What did you predict correctly?
   - What did you miss?
   - What patterns emerged?

3. Update MEMORY.md sections:
   - Add this week's learnings to relevant sections
   - Update accuracy tracking
   - Note process improvements
   - Add any new principles learned

4. Identify one specific improvement for next week

Use bash tool to update your MEMORY.md file directly.
Reply NO_REPLY when done.
    " > /tmp/agentforge-reflection-$agent.log 2>&1
  ) &
done

wait

echo "[$(date)] Weekly reflection complete for all agents" >&2
echo "[$(date)] Logs saved to /tmp/agentforge-reflection-*.log" >&2
