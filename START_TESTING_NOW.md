# 🚀 Start Testing AgentForge - Quick Guide

**You're ready to test!** Follow this guide to get AgentForge running.

---

## Step 1: Run Pre-Launch Tests (2 minutes)

```bash
cd ~/agentforge
./scripts/pre-launch-test.sh
```

**This will check:**
- ✅ Node.js version
- ✅ Build status
- ✅ Configuration
- ✅ Agent workspaces
- ✅ Scripts
- ✅ Documentation

**Expected:** All tests pass or warnings only

---

## Step 2: One-Time Setup (5 minutes)

### 2a. Initialize AgentForge

```bash
node moltbot.mjs init:agentforge
```

**What this does:**
- Copies 9 agent workspaces to ~/.moltbot/agents/
- Registers all agents in config
- Sets gateway.mode=local
- Enables agent-to-agent messaging
- Creates cron templates

**Expected output:**
```
✅ AgentForge initialized successfully!

📋 Next steps:
  1. Set your AI provider: node moltbot.mjs auth choice
  2. Start gateway: node moltbot.mjs gateway run --port 18789
  ...
```

### 2b. Configure AI Provider

```bash
node moltbot.mjs auth choice
```

**Choose one:**
1. **Claude Sonnet 4.5** (recommended)
   - Best for complex reasoning
   - Need: Anthropic API key

2. **OpenAI GPT-4** or **GPT-4o-mini**
   - Good alternative
   - Need: OpenAI API key

3. **Gemini**
   - Another option
   - Need: Google AI API key

**Follow the prompts to enter your API key**

### 2c. Configure GitHub Access (CRITICAL!)

```bash
node moltbot.mjs setup:github
```

**You'll need:**
- GitHub account (create `agentforge-bot` or use existing)
- Personal Access Token with `repo`, `workflow`, `user:email`, `delete_repo` scopes

**Follow the interactive prompts**

**Why:** Agents need GitHub to build products, manage code, create repos

### 2d. Configure Vercel Deployment (CRITICAL!)

```bash
node moltbot.mjs setup:vercel
```

**You'll need:**
- Vercel account (free tier is fine)
- Vercel auth token (create at https://vercel.com/account/tokens)

**Follow the interactive prompts**

**Why:** Agents need Vercel to deploy products and make them publicly accessible

**⚠️ IMPORTANT:** Skip steps 2c-2d and agents won't be able to build or launch anything!

---

## Step 3: Start Gateway (30 seconds)

```bash
node moltbot.mjs gateway run --port 18789
```

**Expected:**
```
🦞 Moltbot 2026.1.26 (...)
Gateway listening on http://127.0.0.1:18789
```

**Keep this terminal open!**

---

## Step 4: Quick Functionality Test (2 minutes)

Open a **new terminal** and run:

```bash
cd ~/agentforge

# Test 1: Contact CEO
node moltbot.mjs agent --agent ceo --message "Hello, what is your current capital and role?"

# Expected: CEO responds saying $0 capital, explains role
```

**If this works, you're ready for a board meeting!**

---

## Step 5: First Board Meeting (10 minutes)

```bash
./scripts/board-meeting.sh
```

**What happens:**
1. 7 board members analyze opportunities (1-2 min each)
2. Coordinator synthesizes decision (1-2 min)
3. Decision written to coordinator session

**Expected duration:** 5-10 minutes

**Monitor progress:**
```bash
# Watch coordinator (in new terminal)
node moltbot.mjs tui --session agent:coordinator:main

# Or watch individual board member
node moltbot.mjs tui --session agent:analyst:main
```

---

## Step 6: Check Board Decision (1 minute)

```bash
# View coordinator's decision
node moltbot.mjs tui --session agent:coordinator:main
```

**Look for:**
```
BOARD DECISION: Build [X]

OPPORTUNITY:
- Market Analyst found: [research]
- [...]

BUDGET: $[amount]
TIMELINE: [days]
...
```

**This is the board's decision for CEO to execute!**

---

## Step 7: CEO Execution (5 minutes)

```bash
./scripts/ceo-implement.sh
```

**What happens:**
1. CEO reads coordinator's decision
2. Plans execution (workers, tools, timeline)
3. Updates LEDGER.md
4. Begins implementation

**Monitor:**
```bash
node moltbot.mjs tui --session agent:ceo:main
```

---

## Step 8: Verify It's Working

### Check CEO's Plan

```bash
cat ~/.moltbot/agents/ceo/LEDGER.md
```

**Should show:**
- Current capital: $0
- Active investment
- Execution plan

### Check Agent Memory

```bash
cat ~/.moltbot/agents/cfo/MEMORY.md
```

**Should show:**
- CFO's analysis
- Predictions
- Learning structure

### Check Human Requests

```bash
ls ~/.moltbot/human-requests/
```

**Might be empty** (agents start autonomously)

---

## Step 9: Optional - Install Automation

**If you want daily automation:**

```bash
# View cron template
cat ~/.moltbot/agentforge-cron.txt

# Install cron jobs
crontab -e
# Paste the contents, save
```

**This enables:**
- Daily board meetings (9am)
- Daily CEO execution (10am)
- Weekly reflection (Sundays)
- Monthly learning (1st of month)

---

## Step 10: Monitor & Audit

### Real-Time Monitoring

```bash
# Watch any agent
node moltbot.mjs tui --session agent:ceo:main
node moltbot.mjs tui --session agent:coordinator:main
node moltbot.mjs tui --session agent:human:main

# Check logs
tail -f /tmp/moltbot-gateway.log
```

### Obsidian Vault (Visual Auditing)

```bash
# Sync agent memory to vault
./scripts/sync-to-obsidian.sh

# Open in Obsidian
# 1. Download Obsidian: https://obsidian.md
# 2. Open folder: .obsidian-vault/
# 3. View Dashboard.md
```

---

## Troubleshooting

### Gateway won't start

```bash
# Check if port is in use
lsof -i :18789
# Kill if needed
kill -9 [PID]

# Try again
node moltbot.mjs gateway run --port 18789
```

### Agent doesn't respond

```bash
# Check agent workspace exists
ls ~/.moltbot/agents/ceo/

# Check config
cat ~/.moltbot/moltbot.json | grep -A 5 '"ceo"'

# Try different agent
node moltbot.mjs agent --agent cfo --message "Hello"
```

### Board meeting hangs

**This is normal!** 7 agents + coordinator takes 5-10 minutes.

**Check progress:**
```bash
# See if agents are responding
tail -f /tmp/moltbot-gateway.log

# Or check individual agents
node moltbot.mjs tui --session agent:analyst:main
```

### No board decision

```bash
# Check coordinator session directly
node moltbot.mjs tui --session agent:coordinator:main
# Scroll to end, look for "BOARD DECISION:"
```

---

## What to Expect

### First Board Meeting

**Likely outcome:**
- Board will choose conservative $0-cost venture
- Probably: Notion template, PDF guide, or simple content
- Budget: $0-50
- Timeline: 3-7 days

**This is perfect!** Bootstrap from zero, prove the model, scale later.

### First Week

- **Day 1:** Board decides, CEO plans
- **Day 2-4:** CEO builds (or spawns workers to build)
- **Day 5-7:** Launch, initial marketing
- **Day 8-14:** First revenue? ($50-200)

### First Month

- **Week 1:** First venture
- **Week 2:** Launch & iterate
- **Week 3:** Maybe second venture
- **Week 4:** Learnings accumulate, agents improve

---

## Success Indicators

### System is Working If:

✅ Board meetings complete (5-10 min)
✅ Coordinator produces decisions
✅ CEO reads and plans execution
✅ Agents update MEMORY.md
✅ No errors in logs

### Agents are Learning If:

✅ MEMORY.md files grow over time
✅ Predictions get more specific
✅ Agents reference past decisions
✅ Accuracy improves

### Business is Working If:

✅ First venture launches
✅ First revenue generated ($1+)
✅ Capital grows from $0
✅ Ventures get better over time

---

## Testing Checklist

**Before Board Meeting:**
- [ ] Gateway running
- [ ] Can contact CEO
- [ ] Can contact CFO
- [ ] Agent-to-agent messaging works

**After Board Meeting:**
- [ ] Coordinator has decision
- [ ] Decision follows format
- [ ] CEO reads decision
- [ ] CEO plans execution

**After First Week:**
- [ ] CEO has execution plan
- [ ] LEDGER.md updated
- [ ] Agents' MEMORY.md updating
- [ ] Progress visible

**After First Month:**
- [ ] First venture launched?
- [ ] First revenue generated?
- [ ] Agents showing learning?
- [ ] Ready for scale?

---

## Quick Commands Reference

```bash
# Start gateway
node moltbot.mjs gateway run --port 18789

# Test agent
node moltbot.mjs agent --agent ceo --message "Hello"

# Open TUI
node moltbot.mjs tui --session agent:ceo:main

# Board meeting
./scripts/board-meeting.sh

# CEO execution
./scripts/ceo-implement.sh

# Sync to Obsidian
./scripts/sync-to-obsidian.sh

# Weekly reflection (manual)
./scripts/weekly-reflection.sh

# View config
cat ~/.moltbot/moltbot.json | jq .

# View CEO ledger
cat ~/.moltbot/agents/ceo/LEDGER.md

# View agent memory
cat ~/.moltbot/agents/cfo/MEMORY.md

# Check human requests
ls ~/.moltbot/human-requests/
```

---

## Documentation

**Full Guides:**
- `PRE_LAUNCH_QA.md` - Complete QA procedures
- `README_AGENTFORGE.md` - Full system guide
- `docs/start/ceo-quickstart.md` - Detailed walkthrough

**System Understanding:**
- `STRATEGIC_LEARNING_SYSTEM.md` - How agents learn
- `ZERO_CAPITAL_CONSTRAINT.md` - $0 capital system
- `UNLIMITED_OPPORTUNITY.md` - Autonomy philosophy

**Implementation:**
- `MEMORY_SYSTEM_COMPLETION.md` - Memory details
- `HUMAN_INTERFACE_SUMMARY.md` - Human oversight
- `OBSIDIAN_VAULT_DESIGN.md` - Auditing system

---

## Ready? Let's Go!

**Start here:**

```bash
cd ~/agentforge
./scripts/pre-launch-test.sh
```

**Then:**

```bash
node moltbot.mjs init:agentforge
node moltbot.mjs auth choice
node moltbot.mjs gateway run --port 18789
```

**Then (new terminal):**

```bash
./scripts/board-meeting.sh
```

**Watch it work! 🚀**

---

**Questions or issues?** Check `PRE_LAUNCH_QA.md` for detailed troubleshooting.

**Want visual monitoring?** Sync to Obsidian and watch the dashboard update:
```bash
./scripts/sync-to-obsidian.sh
# Open .obsidian-vault/ in Obsidian app
```

**Good luck! Your AI board is about to start building businesses! 🎉**
