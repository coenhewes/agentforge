#!/bin/bash
# Monthly meta-learning for all AgentForge agents

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

AGENTS=("analyst" "cfo" "cto" "cmo" "coo" "risk" "innovation" "coordinator" "ceo")

echo "[$(date)] Starting monthly meta-learning for all agents..." >&2

for agent in "${AGENTS[@]}"; do
  (
    echo "  Meta-learning: $agent" >&2
    node moltbot.mjs agent --agent "$agent" --message "
MONTHLY META-LEARNING - $(date +%Y-%m-%d)

Please perform deep analysis of your performance this month:

1. Search for month-over-month trends:
   \`memory_search 'prediction accuracy trends'\`
   \`memory_search 'skill evolution patterns'\`
   \`memory_search 'successful strategies'\`

2. Analyze your effectiveness:
   - Are your predictions getting more accurate?
   - What are your persistent blind spots?
   - Which skills are improving?
   - What process improvements have you made?

3. Update META sections in MEMORY.md:
   - Meta-[Your Role] Wisdom section
   - Long-Term Learning section
   - Principles Learned section

4. Set 2-3 specific improvement goals for next month

Use bash tool to update your MEMORY.md file directly.
Reply NO_REPLY when done.
    " > /tmp/agentforge-metalearning-$agent.log 2>&1
  ) &
done

wait

echo "[$(date)] Monthly meta-learning complete for all agents" >&2
echo "[$(date)] Logs saved to /tmp/agentforge-metalearning-*.log" >&2
