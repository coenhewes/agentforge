# AgentForge - Pre-Launch QA & Testing Guide

**Purpose:** Comprehensive verification before live testing

**Date:** 2026-01-28

---

## Executive Summary

**Status:** ✅ Ready for testing with minor notes

**What's Built:**
- ✅ Board of Directors (7 agents) + Coordinator + CEO
- ✅ Persistent memory system (all agents)
- ✅ Learning automation (weekly/monthly)
- ✅ Human interface system
- ✅ $0 capital constraint
- ✅ Unlimited opportunity + autonomy
- ✅ Obsidian vault for auditing

**Blockers:** None
**Warnings:** See Configuration Requirements section

---

## I. What's Been Built

### Core System

**1. Board of Directors (7 Agents)**
- ✅ Market Analyst - Web research specialist
- ✅ CFO - Financial analysis & budgeting
- ✅ CTO - Technical assessment
- ✅ CMO - Marketing strategy
- ✅ COO - Operations planning
- ✅ Risk Manager - Risk assessment
- ✅ Innovation Lead - Moonshot opportunities

**Status:** All have SOUL.md, IDENTITY.md, MEMORY.md

**2. Coordinator Agent**
- ✅ Synthesizes 7 board perspectives
- ✅ Creates single clear decision
- ✅ Outputs to own session for CEO

**Status:** SOUL.md, IDENTITY.md, MEMORY.md complete

**3. CEO Agent**
- ✅ Reads coordinator decision
- ✅ Spawns worker agents
- ✅ Executes ventures
- ✅ Tracks in LEDGER.md

**Status:** SOUL.md, AGENTS.md, MEMORY.md, LEDGER.md, HEARTBEAT.md complete

### Memory & Learning

**4. Persistent Memory (9 agents)**
- ✅ MEMORY.md templates (role-specific)
- ✅ Prediction vs actual tracking
- ✅ Pattern recognition sections
- ✅ Meta-learning sections
- ✅ Cross-agent intelligence

**Status:** All files created, structured for strategic learning

**5. Learning Automation**
- ✅ `scripts/weekly-reflection.sh` - Weekly learning cycle
- ✅ `scripts/monthly-learning.sh` - Monthly meta-analysis
- ✅ Cron templates provided

**Status:** Scripts executable, documented

### Human Interface

**6. Human Oversight System**
- ✅ `request_human` tool implemented
- ✅ Gateway API methods (list, get, respond, delete)
- ✅ agent:human:main session configured
- ✅ Storage in ~/.moltbot/human-requests/
- ✅ All agents know when to escalate

**Status:** Complete, tested in code

### Capital & Autonomy

**7. $0 Starting Capital**
- ✅ All agents know treasury = $0
- ✅ Must earn before spending
- ✅ Bootstrap mentality enforced
- ✅ CEO LEDGER.md shows $0 start

**Status:** All agent SOUL.md files updated

**8. Unlimited Opportunity**
- ✅ Can pursue ANY business venture
- ✅ Maximum autonomy emphasized
- ✅ Only ask humans for true impossibilities
- ✅ Bias toward independence

**Status:** UNLIMITED_OPPORTUNITY.md created, agents updated

### Auditing

**9. Obsidian Vault**
- ✅ Full vault structure created
- ✅ Templates for meetings, ventures, agents
- ✅ Dashboard with navigation
- ✅ Sync script created
- ✅ Documentation complete

**Status:** Vault ready, sync script executable

### Automation

**10. Turnkey Setup**
- ✅ `moltbot init:agentforge` command
- ✅ Copies all 9 agent workspaces
- ✅ Registers agents in config
- ✅ Sets gateway.mode=local
- ✅ Enables agent-to-agent messaging
- ✅ Creates cron templates

**Status:** Command implemented, builds cleanly

### Scripts

**11. Orchestration Scripts**
- ✅ `scripts/board-meeting.sh` - Triggers 7 board members + coordinator
- ✅ `scripts/ceo-implement.sh` - CEO reads decision and executes
- ✅ `scripts/weekly-reflection.sh` - Learning automation
- ✅ `scripts/monthly-learning.sh` - Meta-learning
- ✅ `scripts/sync-to-obsidian.sh` - Vault sync

**Status:** All executable, documented

---

## II. Installation Verification

### Prerequisites Check

```bash
# 1. Node.js version
node --version
# Required: ≥22.0.0

# 2. pnpm installed
pnpm --version
# Required: Latest

# 3. Git repository
git status
# Should show: On branch main
```

### Installation Steps

**Step 1: Clone & Install**
```bash
cd ~/
git clone <your-repo-url> agentforge
cd agentforge
pnpm install
```

**Expected:** No errors, all dependencies installed

**Step 2: Build**
```bash
pnpm build
```

**Expected:** 
- ✅ TypeScript compiles cleanly
- ✅ 0 errors
- ✅ Canvas bundle successful

**Step 3: Initialize AgentForge**
```bash
node moltbot.mjs init:agentforge
```

**Expected:**
- ✅ 9 agent workspaces copied to ~/.moltbot/agents/
- ✅ Config updated with 9 agents
- ✅ gateway.mode=local set
- ✅ tools.agentToAgent.enabled=true set
- ✅ Cron templates created at ~/.moltbot/agentforge-cron.txt

**Verify:**
```bash
# Check agents registered
ls ~/.moltbot/agents/
# Should show: analyst, ceo, cfo, cmo, coo, coordinator, cto, innovation, risk

# Check config
cat ~/.moltbot/moltbot.json | grep -A 5 '"agents"'
# Should show all 9 agents

# Check gateway mode
cat ~/.moltbot/moltbot.json | grep -A 3 '"gateway"'
# Should show: "mode": "local"
```

**Step 4: Configure AI Provider**
```bash
node moltbot.mjs auth choice
```

**Options:**
1. Claude (recommended) - Need API key
2. OpenAI - Need API key
3. Gemini - Need API key

**Choose one and follow prompts**

**Step 5: Start Gateway**
```bash
node moltbot.mjs gateway run --port 18789
```

**Expected:**
- ✅ Gateway starts
- ✅ Listening on port 18789
- ✅ No errors

**Verify:**
```bash
# In new terminal
curl http://localhost:18789/health
# Expected: {"status":"ok"} or similar
```

---

## III. Configuration Verification

### Critical Config Checks

**1. Agent Registration**
```bash
cat ~/.moltbot/moltbot.json | jq '.agents | keys'
```

**Expected:**
```json
[
  "analyst",
  "ceo",
  "cfo",
  "cmo",
  "coo",
  "coordinator",
  "cto",
  "innovation",
  "risk"
]
```

**2. Gateway Mode**
```bash
cat ~/.moltbot/moltbot.json | jq '.gateway.mode'
```

**Expected:** `"local"`

**3. Agent-to-Agent Messaging**
```bash
cat ~/.moltbot/moltbot.json | jq '.tools.agentToAgent.enabled'
```

**Expected:** `true`

**4. Agent Workspaces Exist**
```bash
for agent in analyst ceo cfo cmo coo coordinator cto innovation risk; do
  if [ -f ~/.moltbot/agents/$agent/SOUL.md ]; then
    echo "✅ $agent workspace exists"
  else
    echo "❌ $agent workspace MISSING"
  fi
done
```

**Expected:** All ✅

**5. Memory Files Present**
```bash
for agent in analyst ceo cfo cmo coo coordinator cto innovation risk; do
  if [ -f ~/.moltbot/agents/$agent/MEMORY.md ]; then
    echo "✅ $agent has MEMORY.md"
  else
    echo "❌ $agent missing MEMORY.md"
  fi
done
```

**Expected:** All ✅

**6. Scripts Executable**
```bash
ls -la scripts/*.sh | grep -E "(board-meeting|ceo-implement|weekly-reflection|monthly-learning|sync-to-obsidian)"
```

**Expected:** All show `-rwxr-xr-x` (executable)

---

## IV. Testing Procedures

### Test 1: Gateway Health

**Purpose:** Verify gateway is running

**Steps:**
```bash
# Start gateway (if not running)
node moltbot.mjs gateway run --port 18789 &

# Wait 5 seconds
sleep 5

# Test health endpoint
curl http://localhost:18789/health
```

**Expected:** `{"status":"ok"}` or healthy response

**Status:** ⬜ Not tested yet

---

### Test 2: Agent Session Access

**Purpose:** Verify agents can be contacted

**Steps:**
```bash
# Test CEO agent
node moltbot.mjs tui --session agent:ceo:main
# Type: "Hello, are you there?"
# Press Enter
# Wait for response
# Press Ctrl+C to exit

# Test Coordinator
node moltbot.mjs tui --session agent:coordinator:main
# Type: "Test message"
# Press Enter
# Press Ctrl+C to exit
```

**Expected:** 
- ✅ TUI opens
- ✅ Agent responds
- ✅ No errors

**Status:** ⬜ Not tested yet

---

### Test 3: Memory Search Tool

**Purpose:** Verify memory system works

**Steps:**
```bash
node moltbot.mjs agent --agent ceo --message "Search your memory for 'capital'. What do you know about starting capital?"
```

**Expected:**
- ✅ Agent uses memory_search tool
- ✅ Finds information about $0 starting capital
- ✅ Responds with context from MEMORY.md

**Status:** ⬜ Not tested yet

---

### Test 4: Agent-to-Agent Messaging

**Purpose:** Verify agents can communicate

**Steps:**
```bash
# Send message from CEO to CFO
node moltbot.mjs agent --agent ceo --message "Use sessions_send to ask the CFO what the current treasury balance is."
```

**Expected:**
- ✅ CEO uses sessions_send tool
- ✅ Message sent to agent:cfo:main
- ✅ No errors

**Verify:**
```bash
# Check CFO received it
node moltbot.mjs agent --agent cfo --message "Check your recent messages with sessions_history. Did CEO contact you?"
```

**Expected:** CFO sees CEO's message

**Status:** ⬜ Not tested yet

---

### Test 5: Board Meeting (Dry Run)

**Purpose:** Test full board meeting flow

**Steps:**
```bash
# Trigger board meeting
./scripts/board-meeting.sh

# Wait ~5-10 minutes (7 agents + coordinator)

# Check coordinator's decision
node moltbot.mjs tui --session agent:coordinator:main
# Scroll to latest message - should see synthesized decision
```

**Expected:**
- ✅ Script runs without errors
- ✅ All 7 board members respond
- ✅ Coordinator synthesizes decision
- ✅ Decision follows format: "BOARD DECISION: ..."

**Status:** ⬜ Not tested yet

---

### Test 6: CEO Execution (Dry Run)

**Purpose:** Test CEO reads and plans execution

**Steps:**
```bash
# After board meeting completes
./scripts/ceo-implement.sh

# Wait ~2-5 minutes

# Check CEO's session
node moltbot.mjs tui --session agent:ceo:main
# Should see CEO reading coordinator decision and planning
```

**Expected:**
- ✅ CEO uses sessions_history to read coordinator
- ✅ CEO acknowledges board decision
- ✅ CEO outlines execution plan
- ✅ Updates LEDGER.md

**Status:** ⬜ Not tested yet

---

### Test 7: Human Request System

**Purpose:** Verify agents can request human help

**Steps:**
```bash
# Have CEO make a test request
node moltbot.mjs agent --agent ceo --message "Use request_human to make a test request. Priority: low, Category: blocked, Title: 'Test request', Description: 'This is a test of the human request system.'"

# Check request was created
ls ~/.moltbot/human-requests/
# Should see REQ-XXXX.json file

# View in human session
node moltbot.mjs tui --session agent:human:main
# Should see request notification

# Respond to request
# Type: RESPONSE REQ-XXXX: APPROVED - Test successful
```

**Expected:**
- ✅ Request created
- ✅ JSON file in ~/.moltbot/human-requests/
- ✅ Visible in agent:human:main
- ✅ Can respond via TUI

**Status:** ⬜ Not tested yet

---

### Test 8: Weekly Reflection

**Purpose:** Verify learning automation works

**Steps:**
```bash
# Trigger weekly reflection for one agent
node moltbot.mjs agent --agent cfo --message "Perform your weekly reflection: Review this week's activities, compare predictions vs actuals, update your MEMORY.md with learnings."

# Check MEMORY.md was updated
cat ~/.moltbot/agents/cfo/MEMORY.md
# Look for new content
```

**Expected:**
- ✅ Agent reflects on week
- ✅ Updates MEMORY.md
- ✅ Includes learnings

**Status:** ⬜ Not tested yet

---

### Test 9: Obsidian Sync

**Purpose:** Verify vault sync works

**Steps:**
```bash
# Run sync
./scripts/sync-to-obsidian.sh

# Check vault was updated
ls .obsidian-vault/03-Agents/CEO/
# Should see Memory Snapshot.md

# Check content
cat .obsidian-vault/03-Agents/CEO/Memory\ Snapshot.md
# Should contain CEO's MEMORY.md content
```

**Expected:**
- ✅ Script runs without errors
- ✅ Agent memories synced
- ✅ Timestamps updated

**Status:** ⬜ Not tested yet

---

### Test 10: $0 Capital Awareness

**Purpose:** Verify agents know they start with $0

**Steps:**
```bash
# Ask CEO about capital
node moltbot.mjs agent --agent ceo --message "What is your current available capital? How much money do you have to spend?"

# Ask CFO about treasury
node moltbot.mjs agent --agent cfo --message "What is the current treasury balance? How much capital is available for ventures?"
```

**Expected:**
- ✅ CEO says $0
- ✅ CFO says $0
- ✅ Both understand bootstrap requirement

**Status:** ⬜ Not tested yet

---

## V. Testing Checklist

### Pre-Test Setup

- [ ] Node.js ≥22 installed
- [ ] pnpm installed
- [ ] Repository cloned
- [ ] Dependencies installed (`pnpm install`)
- [ ] Project built (`pnpm build`)
- [ ] AgentForge initialized (`node moltbot.mjs init:agentforge`)
- [ ] AI provider configured (`node moltbot.mjs auth choice`)
- [ ] Gateway running (`node moltbot.mjs gateway run --port 18789`)

### Configuration Verification

- [ ] All 9 agents registered in config
- [ ] gateway.mode = "local"
- [ ] tools.agentToAgent.enabled = true
- [ ] All agent workspaces exist (~/.moltbot/agents/)
- [ ] All MEMORY.md files present
- [ ] All scripts executable

### Core Functionality Tests

- [ ] Test 1: Gateway Health
- [ ] Test 2: Agent Session Access
- [ ] Test 3: Memory Search Tool
- [ ] Test 4: Agent-to-Agent Messaging
- [ ] Test 5: Board Meeting (Dry Run)
- [ ] Test 6: CEO Execution (Dry Run)
- [ ] Test 7: Human Request System
- [ ] Test 8: Weekly Reflection
- [ ] Test 9: Obsidian Sync
- [ ] Test 10: $0 Capital Awareness

### Optional Tests

- [ ] Install cron jobs
- [ ] Test daily automation (board + CEO)
- [ ] Test weekly reflection automation
- [ ] Test monthly learning automation
- [ ] Open vault in Obsidian

---

## VI. Known Issues & Workarounds

### Issue 1: Gateway Takes Time to Start

**Symptom:** `curl http://localhost:18789/health` fails immediately after starting

**Cause:** Gateway needs 2-5 seconds to initialize

**Workaround:** Wait 5 seconds after starting gateway before testing

**Status:** Not a bug, expected behavior

---

### Issue 2: Board Meeting Takes 5-10 Minutes

**Symptom:** `board-meeting.sh` doesn't complete instantly

**Cause:** 7 board members + coordinator all need to think and respond

**Workaround:** This is normal. Board meetings are complex.

**Expected Duration:**
- Market Analyst: 1-2 min (web research)
- Other 6 members: 30-60 sec each
- Coordinator: 1-2 min (synthesis)
- Total: 5-10 minutes

**Status:** Not a bug, expected behavior

---

### Issue 3: First Board Meeting May Be Generic

**Symptom:** First board decision may not be deeply researched

**Cause:** Agents have no memory/history yet

**Workaround:** Let them run 2-3 meetings to build intelligence

**Expected:** Quality improves with each meeting as memory accumulates

**Status:** Not a bug, expected learning curve

---

### Issue 4: Sync Script is Basic

**Symptom:** Obsidian sync only copies memory files, doesn't parse sessions

**Cause:** Current implementation is MVP

**Workaround:** Manually create board meeting notes from coordinator sessions if desired

**Future:** Auto-parse sessions into structured notes

**Status:** Enhancement, not blocker

---

## VII. Quick Start Testing

### 5-Minute Quick Test

**Purpose:** Verify basic functionality works

**Steps:**
```bash
# 1. Start gateway
node moltbot.mjs gateway run --port 18789 &
sleep 5

# 2. Test CEO agent
node moltbot.mjs agent --agent ceo --message "Hello, what is your role and current capital?"
# Expected: CEO explains role, says $0 capital

# 3. Test memory system
node moltbot.mjs agent --agent cfo --message "What do you know about the treasury?"
# Expected: CFO explains $0 starting capital

# 4. Test agent-to-agent
node moltbot.mjs agent --agent ceo --message "Send a message to the CFO asking for the treasury balance using sessions_send."
# Expected: CEO sends message

# 5. Check it worked
node moltbot.mjs agent --agent cfo --message "Check your messages. Did CEO contact you?"
# Expected: CFO confirms receiving message
```

**If all 5 steps work: ✅ System is functional!**

---

### 30-Minute Full Test

**Purpose:** Test complete board → CEO flow

**Steps:**
```bash
# 1. Start gateway
node moltbot.mjs gateway run --port 18789 &
sleep 5

# 2. Trigger board meeting
./scripts/board-meeting.sh
# Wait 5-10 minutes

# 3. Check coordinator decision
node moltbot.mjs tui --session agent:coordinator:main
# Should see synthesized BOARD DECISION

# 4. Trigger CEO execution
./scripts/ceo-implement.sh
# Wait 2-5 minutes

# 5. Check CEO plan
node moltbot.mjs tui --session agent:ceo:main
# Should see CEO execution plan

# 6. Test human request
node moltbot.mjs agent --agent ceo --message "Make a test human request"
# Check ~/.moltbot/human-requests/

# 7. Sync to Obsidian
./scripts/sync-to-obsidian.sh
# Check .obsidian-vault/03-Agents/CEO/Memory Snapshot.md

# 8. Verify learning
node moltbot.mjs agent --agent cfo --message "What have you learned so far?"
# Should reference MEMORY.md content
```

**If all 8 steps work: ✅ Full system is operational!**

---

## VIII. Success Criteria

### Minimum Viable Test (5 min)

**Pass Criteria:**
- ✅ Gateway starts without errors
- ✅ Can contact CEO agent via TUI
- ✅ CEO knows role and $0 capital
- ✅ Agent-to-agent messaging works

**If all pass:** System is functional, ready for board testing

---

### Full System Test (30 min)

**Pass Criteria:**
- ✅ Board meeting completes (7 + coordinator)
- ✅ Coordinator synthesizes decision
- ✅ CEO reads and plans execution
- ✅ Human request system works
- ✅ Memory system functional
- ✅ Obsidian sync works

**If all pass:** System is production-ready

---

## IX. Next Steps After Testing

### If Tests Pass

**1. Install Cron Jobs**
```bash
crontab -e
# Paste contents from ~/.moltbot/agentforge-cron.txt
```

**2. Let It Run**
- Daily board meetings (9am)
- Daily CEO execution (10am)
- Weekly reflection (Sundays)
- Monthly learning (1st of month)

**3. Monitor Progress**
```bash
# Check board decisions
node moltbot.mjs tui --session agent:coordinator:main

# Check CEO execution
node moltbot.mjs tui --session agent:ceo:main

# Check human requests
node moltbot.mjs tui --session agent:human:main

# View in Obsidian
open .obsidian-vault/ # (in Obsidian app)
```

**4. Track Results**
- First revenue
- Capital accumulation
- Agent learning
- Portfolio growth

---

### If Tests Fail

**Check these first:**

**Gateway won't start:**
```bash
# Check config exists
cat ~/.moltbot/moltbot.json | grep -A 5 '"agents"'

# Check AI provider configured
cat ~/.moltbot/moltbot.json | grep -A 10 '"models"'

# Check port not in use
lsof -i :18789
```

**Agents don't respond:**
```bash
# Check agent workspace exists
ls ~/.moltbot/agents/ceo/

# Check SOUL.md exists
cat ~/.moltbot/agents/ceo/SOUL.md | head -20

# Check logs
tail -100 /tmp/moltbot-gateway.log
```

**Board meeting fails:**
```bash
# Check scripts executable
ls -la scripts/board-meeting.sh

# Run manually to see errors
bash -x scripts/board-meeting.sh

# Check individual agent works
node moltbot.mjs agent --agent analyst --message "Hello"
```

---

## X. Final Checklist

### Before Starting Live Testing

- [ ] All installation steps completed
- [ ] All configuration verified
- [ ] 5-minute quick test PASSED
- [ ] Gateway running stable
- [ ] Can contact all 9 agents
- [ ] Memory system functional
- [ ] Ready to run board meeting

### Optional but Recommended

- [ ] 30-minute full test completed
- [ ] Board meeting dry run successful
- [ ] CEO execution tested
- [ ] Human interface tested
- [ ] Obsidian vault synced
- [ ] Cron jobs installed

---

## XI. Expected First Session Results

### First Board Meeting

**What to expect:**
- Market Analyst will research live (may take 1-2 min)
- Board members will analyze the opportunity
- Coordinator will synthesize into decision
- Decision will likely be conservative ($0-50 budget)

**First decision might be:**
- Notion template
- PDF guide
- Airtable base
- Simple content product

**This is good!** Start small, earn first revenue, scale.

### First CEO Execution

**What to expect:**
- CEO reads board decision
- Plans execution with $0 budget
- May note that no workers needed (simple project)
- Updates LEDGER.md with plan

**CEO might say:**
- "Building [X] using free tools"
- "No workers needed, I'll handle it"
- "Will report in 3-5 days"

### First Revenue

**Timeline:**
- Week 1: Board decides, CEO builds
- Week 2: Launch, first customers
- Week 3: First revenue ($50-200)
- Week 4: Reinvestment discussion

---

## XII. Support & Troubleshooting

### Documentation

**Setup & Installation:**
- `README_AGENTFORGE.md` - Complete guide
- `docs/start/ceo-quickstart.md` - Detailed walkthrough
- `INSTALLATION_TEST.md` - Testing procedures

**System Understanding:**
- `STRATEGIC_LEARNING_SYSTEM.md` - Memory & learning
- `ZERO_CAPITAL_CONSTRAINT.md` - $0 capital system
- `UNLIMITED_OPPORTUNITY.md` - Autonomy philosophy
- `OBSIDIAN_VAULT_DESIGN.md` - Auditing system

**Implementation Details:**
- `MEMORY_SYSTEM_COMPLETION.md` - Memory implementation
- `HUMAN_INTERFACE_SUMMARY.md` - Human oversight
- `COMPLETION_REPORT.md` - Full build summary

### Common Commands

```bash
# Start gateway
node moltbot.mjs gateway run --port 18789

# Test agent
node moltbot.mjs agent --agent ceo --message "Hello"

# Open TUI
node moltbot.mjs tui --session agent:ceo:main

# Trigger board meeting
./scripts/board-meeting.sh

# Trigger CEO execution
./scripts/ceo-implement.sh

# Sync to Obsidian
./scripts/sync-to-obsidian.sh

# View logs
tail -f /tmp/moltbot-gateway.log
```

---

## XIII. Build Status

**Last Build:** 2026-01-28
**Status:** ✅ Clean
**TypeScript:** 0 errors
**Linter:** 0 warnings
**Tests:** Not run (manual testing required)

---

## XIV. Ready to Test

**Status:** ✅ READY

**Confidence Level:** High

**Recommendation:** 
1. Run 5-minute quick test first
2. If passes, run 30-minute full test
3. If both pass, install cron and let it run
4. Monitor for 1-2 weeks
5. Evaluate results

**Expected Outcome:**
- First board meeting produces decision
- CEO builds $0-cost MVP
- Launch happens within days
- First revenue within 1-2 weeks
- Learning accumulates
- System improves over time

**Let's test it!** 🚀
