#!/bin/bash
# test-installation.sh - Verify AgentForge installation

set -e

echo "=== Testing AgentForge Installation ==="
echo ""

echo "1. Checking agents registered..."
COUNT=$(node moltbot.mjs agents list 2>/dev/null | grep -c "^  -" || echo 0)
if [ "$COUNT" -eq 9 ]; then
  echo "   ✅ All 9 agents registered"
else
  echo "   ❌ Expected 9 agents, found $COUNT"
  exit 1
fi

echo "2. Checking gateway mode..."
MODE=$(node moltbot.mjs config get gateway.mode 2>/dev/null || echo "")
if [ "$MODE" = "local" ]; then
  echo "   ✅ Gateway mode: local"
else
  echo "   ⚠️  Gateway mode not set to 'local': $MODE (may need manual config)"
fi

echo "3. Checking agent-to-agent messaging..."
A2A=$(node moltbot.mjs config get tools.agentToAgent.enabled 2>/dev/null || echo "false")
if [ "$A2A" = "true" ]; then
  echo "   ✅ Agent-to-agent enabled"
else
  echo "   ⚠️  Agent-to-agent not enabled: $A2A (coordinator won't work)"
fi

echo "4. Checking agent workspaces exist..."
MISSING=0
for agent in coordinator ceo; do
  if [ -f "$HOME/.moltbot/agents/$agent/SOUL.md" ]; then
    echo "   ✅ $agent workspace exists"
  else
    echo "   ❌ $agent workspace missing"
    MISSING=$((MISSING + 1))
  fi
done

for agent in cfo cto cmo coo analyst risk innovation; do
  if [ -f "$HOME/.moltbot/agents/board/$agent/SOUL.md" ]; then
    echo "   ✅ board/$agent workspace exists"
  else
    echo "   ❌ board/$agent workspace missing"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -gt 0 ]; then
  exit 1
fi

echo "5. Checking scripts are executable..."
if [ -x "./scripts/board-meeting.sh" ] && [ -x "./scripts/ceo-implement.sh" ]; then
  echo "   ✅ Scripts are executable"
else
  echo "   ❌ Scripts not executable"
  exit 1
fi

echo ""
echo "=== All Tests Passed ✅ ==="
echo ""
echo "Ready to run:"
echo "  1. node moltbot.mjs gateway run --port 18789"
echo "  2. ./scripts/board-meeting.sh (wait 5 min)"
echo "  3. node moltbot.mjs tui --session agent:coordinator:main (verify decision)"
echo "  4. ./scripts/ceo-implement.sh"
echo "  5. node moltbot.mjs tui --session agent:ceo:main (watch execution)"
echo ""
