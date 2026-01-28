#!/bin/bash
# Pre-launch automated tests for AgentForge

set -e

echo "═══════════════════════════════════════════════════════"
echo "  AgentForge Pre-Launch Automated Tests"
echo "═══════════════════════════════════════════════════════"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

echo "TEST 1: Node.js Version"
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 22 ]; then
    pass "Node.js $NODE_VERSION (required: ≥22)"
else
    fail "Node.js $NODE_VERSION (required: ≥22)"
fi
echo ""

echo "TEST 2: Build Status"
if [ -d "dist" ] && [ -f "dist/cli.js" ]; then
    pass "Project built (dist/ exists)"
else
    fail "Project not built (run: pnpm build)"
fi
echo ""

echo "TEST 3: Configuration File"
if [ -f ~/.moltbot/moltbot.json ]; then
    pass "Config file exists (~/.moltbot/moltbot.json)"
    
    # Check gateway mode
    GATEWAY_MODE=$(cat ~/.moltbot/moltbot.json | grep -o '"mode"\s*:\s*"[^"]*"' | head -1 | cut -d'"' -f4 || echo "notset")
    if [ "$GATEWAY_MODE" = "local" ]; then
        pass "gateway.mode = local"
    else
        warn "gateway.mode = $GATEWAY_MODE (expected: local)"
    fi
    
    # Check agent count
    AGENT_COUNT=$(cat ~/.moltbot/moltbot.json | grep -o '"agents"\s*:\s*{' | wc -l | tr -d ' ')
    if [ "$AGENT_COUNT" -gt 0 ]; then
        pass "Agents section exists in config"
    else
        warn "Agents section not found (run: node moltbot.mjs init:agentforge)"
    fi
else
    warn "Config file not found (run: node moltbot.mjs init:agentforge)"
fi
echo ""

echo "TEST 4: Agent Workspaces"
AGENTS=("analyst" "ceo" "cfo" "cmo" "coo" "coordinator" "cto" "innovation" "risk")
MISSING_AGENTS=0
for agent in "${AGENTS[@]}"; do
    if [ -d ~/.moltbot/agents/$agent ]; then
        pass "Agent workspace: $agent"
    else
        fail "Agent workspace missing: $agent"
        ((MISSING_AGENTS++))
    fi
done
echo ""

echo "TEST 5: Agent MEMORY.md Files"
MISSING_MEMORY=0
for agent in "${AGENTS[@]}"; do
    if [ -f ~/.moltbot/agents/$agent/MEMORY.md ]; then
        pass "Memory file: $agent"
    else
        fail "MEMORY.md missing: $agent"
        ((MISSING_MEMORY++))
    fi
done
echo ""

echo "TEST 6: Agent SOUL.md Files"
MISSING_SOUL=0
for agent in "${AGENTS[@]}"; do
    if [ -f ~/.moltbot/agents/$agent/SOUL.md ]; then
        pass "SOUL.md file: $agent"
    else
        fail "SOUL.md missing: $agent"
        ((MISSING_SOUL++))
    fi
done
echo ""

echo "TEST 7: Orchestration Scripts"
SCRIPTS=("board-meeting.sh" "ceo-implement.sh" "weekly-reflection.sh" "monthly-learning.sh" "sync-to-obsidian.sh")
MISSING_SCRIPTS=0
for script in "${SCRIPTS[@]}"; do
    if [ -x "scripts/$script" ]; then
        pass "Script executable: $script"
    elif [ -f "scripts/$script" ]; then
        warn "Script exists but not executable: $script (run: chmod +x scripts/$script)"
    else
        fail "Script missing: $script"
        ((MISSING_SCRIPTS++))
    fi
done
echo ""

echo "TEST 8: Obsidian Vault"
if [ -d ".obsidian-vault" ]; then
    pass "Obsidian vault exists"
    
    if [ -f ".obsidian-vault/00-Dashboard/Dashboard.md" ]; then
        pass "Dashboard exists"
    else
        fail "Dashboard missing"
    fi
    
    if [ -d ".obsidian-vault/01-Board-Meetings" ]; then
        pass "Board Meetings folder exists"
    else
        fail "Board Meetings folder missing"
    fi
else
    fail "Obsidian vault missing (.obsidian-vault/)"
fi
echo ""

echo "TEST 9: Documentation"
DOCS=("README_AGENTFORGE.md" "PRE_LAUNCH_QA.md" "STRATEGIC_LEARNING_SYSTEM.md" "ZERO_CAPITAL_CONSTRAINT.md" "UNLIMITED_OPPORTUNITY.md")
MISSING_DOCS=0
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        pass "Documentation: $doc"
    else
        warn "Documentation missing: $doc"
        ((MISSING_DOCS++))
    fi
done
echo ""

echo "TEST 10: AI Provider Configuration"
if [ -f ~/.moltbot/moltbot.json ]; then
    # Check if any provider is configured
    HAS_ANTHROPIC=$(cat ~/.moltbot/moltbot.json | grep -c '"anthropic"' || echo 0)
    HAS_OPENAI=$(cat ~/.moltbot/moltbot.json | grep -c '"openai"' || echo 0)
    HAS_GOOGLE=$(cat ~/.moltbot/moltbot.json | grep -c '"google"' || echo 0)
    
    TOTAL_PROVIDERS=$((HAS_ANTHROPIC + HAS_OPENAI + HAS_GOOGLE))
    
    if [ $TOTAL_PROVIDERS -gt 0 ]; then
        pass "AI provider configured"
    else
        warn "No AI provider configured (run: node moltbot.mjs auth choice)"
    fi
else
    warn "Cannot check AI provider (config missing)"
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  Test Summary"
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}═══════════════════════════════════════════════════════"
        echo "  ✅ ALL TESTS PASSED - READY FOR LIVE TESTING!"
        echo "═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Configure AI provider: node moltbot.mjs auth choice"
        echo "2. Start gateway: node moltbot.mjs gateway run --port 18789"
        echo "3. Test board meeting: ./scripts/board-meeting.sh"
        echo ""
        exit 0
    else
        echo -e "${YELLOW}═══════════════════════════════════════════════════════"
        echo "  ⚠️  TESTS PASSED WITH WARNINGS"
        echo "═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Review warnings above before proceeding."
        echo ""
        exit 0
    fi
else
    echo -e "${RED}═══════════════════════════════════════════════════════"
    echo "  ❌ TESTS FAILED - FIX ISSUES BEFORE TESTING"
    echo "═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Fix the failed tests above, then run this script again."
    echo ""
    exit 1
fi
