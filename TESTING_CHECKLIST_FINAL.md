# AgentForge - Final Testing Checklist

**Ready to test?** Use this checklist before starting.

**Last Updated:** 2026-01-28  
**Status:** ✅ All guides updated with full capabilities

---

## ✅ Pre-Testing Checklist

### System Requirements

- [ ] **Node.js ≥22** installed (`node --version`)
- [ ] **pnpm** installed (`pnpm --version`)
- [ ] **Git** installed (`git --version`)
- [ ] **API Key** (Anthropic, OpenAI, or Google)
- [ ] **GitHub account** for agent (dedicated `agentforge-bot` recommended)
- [ ] **Vercel account** (free tier is fine)

### Installation Complete

- [ ] Repository cloned
- [ ] `pnpm install` completed (0 errors)
- [ ] `pnpm build` completed (0 errors)
- [ ] `node moltbot.mjs init:agentforge` completed
- [ ] `node moltbot.mjs auth choice` completed
- [ ] **`node moltbot.mjs setup:github` completed** 🆕
- [ ] **`node moltbot.mjs setup:vercel` completed** 🆕

### Configuration Verification

Run these commands to verify:

```bash
# 1. Check all agents registered
cat ~/.moltbot/moltbot.json | jq '.agents | keys'
# Expected: ["analyst", "ceo", "cfo", "cmo", "coo", "coordinator", "cto", "innovation", "risk"]

# 2. Check gateway mode
cat ~/.moltbot/moltbot.json | jq '.gateway.mode'
# Expected: "local"

# 3. Check agent workspaces exist
ls ~/.moltbot/agents/
# Expected: analyst ceo cfo cmo coo coordinator cto innovation risk

# 4. Check MEMORY.md files exist
for agent in analyst ceo cfo cmo coo coordinator cto innovation risk; do
  if [ -f ~/.moltbot/agents/$agent/MEMORY.md ]; then
    echo "✅ $agent has MEMORY.md"
  else
    echo "❌ $agent missing MEMORY.md"
  fi
done

# 5. Check GitHub configured
git config --global user.name
# Expected: AgentForge Bot (or your choice)

echo $GITHUB_TOKEN
# Expected: ghp_xxxx... (GitHub token)

# 6. Check Vercel configured
vercel --version
# Expected: Vercel CLI version number

echo $VERCEL_TOKEN
# Expected: Your Vercel token

# 7. Check scripts executable
ls -la scripts/*.sh | grep -E "(board-meeting|ceo-implement)"
# Expected: All show -rwxr-xr-x
```

**If any checks fail, stop and fix before continuing!**

---

## 🚀 Quick Start Testing (5 minutes)

### 1. Start Gateway

**Terminal 1:**
```bash
cd ~/agentforge
node moltbot.mjs gateway run --port 18789
```

**Expected:**
```
🦞 Moltbot 2026.1.26 (...)
Gateway listening on http://127.0.0.1:18789
```

**Keep this terminal open!**

---

### 2. Test CEO Agent

**Terminal 2:**
```bash
cd ~/agentforge

# Test 1: CEO knows role and capital
node moltbot.mjs agent --agent ceo --message "Hello, what is your role and current capital?"
```

**Expected:**
- ✅ CEO responds
- ✅ Mentions role: Chief Executive Officer
- ✅ States $0 starting capital
- ✅ Understands bootstrap requirement

---

### 3. Test Memory System

```bash
# Test 2: CFO memory search
node moltbot.mjs agent --agent cfo --message "Search your memory for 'capital'. What do you know about starting capital?"
```

**Expected:**
- ✅ CFO uses `memory_search` tool
- ✅ Finds information about $0 capital
- ✅ Explains bootstrap requirement

---

### 4. Test Agent-to-Agent Communication

```bash
# Test 3: CEO sends message to CFO
node moltbot.mjs agent --agent ceo --message "Use sessions_send to ask the CFO what the current treasury balance is."
```

**Expected:**
- ✅ CEO uses `sessions_send` tool
- ✅ Message sent to agent:cfo:main
- ✅ No errors

**Verify it worked:**
```bash
node moltbot.mjs agent --agent cfo --message "Check your recent messages with sessions_history. Did CEO contact you?"
```

**Expected:**
- ✅ CFO sees CEO's message
- ✅ Can read the content

---

### 5. Test GitHub Access

```bash
# Test 4: CEO can access GitHub
node moltbot.mjs agent --agent ceo --message "Use bash to test the GitHub API: curl -H 'Authorization: token \$GITHUB_TOKEN' https://api.github.com/user | head -10"
```

**Expected:**
- ✅ CEO runs curl command
- ✅ GitHub API responds with user info
- ✅ No authentication errors

---

### 6. Test Vercel Access

```bash
# Test 5: CEO can check Vercel
node moltbot.mjs agent --agent ceo --message "Use bash to check Vercel CLI: vercel whoami"
```

**Expected:**
- ✅ CEO runs vercel command
- ✅ Shows Vercel account username
- ✅ No authentication errors

---

## ✅ Quick Test Results

**If all 6 tests pass:**
- ✅ Gateway working
- ✅ Agents responding
- ✅ Memory system functional
- ✅ Agent communication working
- ✅ GitHub access configured
- ✅ Vercel access configured

**Status: READY FOR BOARD MEETING TEST** 🎉

---

## 🏛️ Board Meeting Test (10 minutes)

### 1. Trigger Board Meeting

```bash
./scripts/board-meeting.sh
```

**This will take 5-10 minutes.** The script:
1. Prompts all 7 board members
2. Market Analyst browses web for opportunities
3. Each member analyzes from their perspective
4. Coordinator synthesizes decision

**Monitor progress (optional):**
```bash
# In another terminal
node moltbot.mjs tui --session agent:analyst:main
# Watch Market Analyst do research

node moltbot.mjs tui --session agent:coordinator:main
# Watch Coordinator synthesize
```

---

### 2. Verify Board Decision

**After ~10 minutes:**
```bash
node moltbot.mjs tui --session agent:coordinator:main
```

**Scroll to bottom and look for:**
```
BOARD DECISION:
==============
Product: [Product Name]
Target Market: [Description]
Budget: $X
Timeline: X days
Kill If: [Threshold]
CEO: Execute this plan.
```

**Expected:**
- ✅ Clear decision format
- ✅ Includes product name
- ✅ Budget specified (likely $0-50)
- ✅ Kill threshold defined
- ✅ Instructions for CEO

---

## 💼 CEO Execution Test (5 minutes)

### 1. Trigger CEO Execution

```bash
./scripts/ceo-implement.sh
```

**This will take 2-5 minutes.** CEO will:
1. Read coordinator's decision
2. Plan execution
3. Decide if workers needed
4. Update LEDGER.md

---

### 2. Verify CEO Plan

```bash
node moltbot.mjs tui --session agent:ceo:main
```

**Expected:**
- ✅ CEO reads board decision
- ✅ Creates execution plan
- ✅ Notes budget constraints
- ✅ Plans next steps

**Check LEDGER:**
```bash
cat ~/.moltbot/agents/ceo/LEDGER.md
```

**Expected:**
- ✅ Shows $0 starting capital
- ✅ Lists new investment
- ✅ Tracks budget
- ✅ Notes kill threshold

---

## 🎯 Additional Tests (Optional)

### Test Human Request System

```bash
node moltbot.mjs agent --agent ceo --message "Use request_human to make a test request. Priority: low, Category: blocked, Title: 'Test request', Description: 'Testing the human request system.'"

# Check request created
ls ~/.moltbot/human-requests/
# Should see REQ-XXXX.json file

# View in human session
node moltbot.mjs tui --session agent:human:main
```

---

### Test Obsidian Sync

```bash
./scripts/sync-to-obsidian.sh

# Check vault updated
ls .obsidian-vault/03-Agents/CEO/
# Should see Memory Snapshot.md

cat .obsidian-vault/03-Agents/CEO/Memory\ Snapshot.md
# Should contain CEO's MEMORY.md content
```

---

### Test Weekly Reflection

```bash
node moltbot.mjs agent --agent cfo --message "Perform your weekly reflection: Review activities, compare predictions vs actuals, update MEMORY.md with learnings."

# Check MEMORY.md updated
cat ~/.moltbot/agents/cfo/MEMORY.md | tail -50
# Look for new reflections
```

---

## 📊 Success Criteria

### Minimum Viable (Must Pass)

- ✅ Gateway starts without errors
- ✅ All 9 agents respond to messages
- ✅ Memory system works (search + retrieval)
- ✅ Agent-to-agent messaging works
- ✅ **GitHub access verified**
- ✅ **Vercel access verified**

**If all pass: System is functional**

---

### Full System (Recommended)

- ✅ Board meeting completes successfully
- ✅ All 7 board members respond
- ✅ Coordinator synthesizes clear decision
- ✅ CEO reads and plans execution
- ✅ CEO updates LEDGER.md
- ✅ Human request system works
- ✅ Obsidian sync works

**If all pass: System is production-ready**

---

## 🔄 Install Automation (Final Step)

### Install Cron Jobs

```bash
crontab -e
```

**Paste these lines:**
```cron
# AgentForge Automation
# Daily board meeting at 9am
0 9 * * * cd /path/to/agentforge && ./scripts/board-meeting.sh >> /tmp/agentforge-board.log 2>&1

# Daily CEO execution at 10am (1 hour after board)
0 10 * * * cd /path/to/agentforge && ./scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1

# Weekly reflection (Sundays at 10pm)
0 22 * * 0 cd /path/to/agentforge && ./scripts/weekly-reflection.sh >> /tmp/agentforge-reflection.log 2>&1

# Monthly meta-learning (1st of month at 11pm)
0 23 1 * * cd /path/to/agentforge && ./scripts/monthly-learning.sh >> /tmp/agentforge-learning.log 2>&1

# Obsidian sync (every 6 hours)
0 */6 * * * cd /path/to/agentforge && ./scripts/sync-to-obsidian.sh >> /tmp/agentforge-sync.log 2>&1
```

**Replace `/path/to/agentforge` with actual path (e.g., `/home/user/agentforge`)**

**Save and exit** (Ctrl+X, Y, Enter in nano)

**Verify:**
```bash
crontab -l
```

---

## 🎉 You're Ready!

### What Happens Next

**Daily (9am):**
- Board meeting triggers
- 7 board members analyze opportunities
- Coordinator synthesizes decision

**Daily (10am):**
- CEO reads board decision
- Plans execution
- Spawns workers if needed
- Tracks in LEDGER

**Weekly (Sunday 10pm):**
- All agents reflect
- Update MEMORY.md
- Improve patterns

**Monthly (1st, 11pm):**
- Deep meta-learning
- Trend analysis
- Skill improvement

**Every 6 hours:**
- Vault syncs for human auditing

---

## 📚 Full Capabilities Reference

**Every agent has access to ALL Moltbot tools:**

### Core Tools
- ✅ **Browser** - Navigate web, scrape, post to communities
- ✅ **Image Generation** - Marketing graphics, mockups, assets
- ✅ **Bash** - Git, npm, deployment, file operations
- ✅ **Memory** - Semantic search, retrieval, learning
- ✅ **Sessions** - Agent communication, worker management
- ✅ **Canvas/A2UI** - Interactive UIs, prototypes
- ✅ **Web tools** - Search, fetch, research

### Messaging Platforms
- ✅ **Telegram** - Send messages, manage groups
- ✅ **Slack** - Post to channels, DMs
- ✅ **Discord** - Server management, messaging
- ✅ **WhatsApp** - Send messages, contacts

### Integrations
- ✅ **GitHub API** - Create repos, push code, manage
- ✅ **Vercel CLI** - Deploy apps instantly
- ✅ **Any API** - Via bash + curl

**For complete details and examples: `AGENTFORGE_CAPABILITIES.md`**

---

## 🚨 Troubleshooting

### Gateway won't start

```bash
# Check config exists
cat ~/.moltbot/moltbot.json | head -20

# Check API key configured
cat ~/.moltbot/moltbot.json | grep -A 10 '"models"'

# Check port not in use
lsof -i :18789
```

---

### Agents don't respond

```bash
# Check agent workspace exists
ls ~/.moltbot/agents/ceo/

# Check SOUL.md exists
cat ~/.moltbot/agents/ceo/SOUL.md | head -20

# Test gateway health
curl http://localhost:18789/health
```

---

### GitHub not working

```bash
# Check git configured
git config --global user.name
git config --global user.email

# Check token set
echo $GITHUB_TOKEN

# Test API
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Re-run setup if needed
node moltbot.mjs setup:github
```

---

### Vercel not working

```bash
# Check CLI installed
vercel --version

# Check token set
echo $VERCEL_TOKEN

# Test CLI
vercel whoami

# Re-run setup if needed
node moltbot.mjs setup:vercel
```

---

## 📖 Documentation

**Setup & Installation:**
- `README_AGENTFORGE.md` - Main guide
- `VPS_DEPLOYMENT_GUIDE.md` - VPS deployment
- `START_TESTING_NOW.md` - Quick start
- `PRE_LAUNCH_QA.md` - QA procedures

**Capabilities:**
- `AGENTFORGE_CAPABILITIES.md` - Complete tool reference

**System Design:**
- `STRATEGIC_LEARNING_SYSTEM.md` - Learning system
- `ZERO_CAPITAL_CONSTRAINT.md` - $0 capital system
- `UNLIMITED_OPPORTUNITY.md` - Autonomy philosophy
- `OBSIDIAN_VAULT_DESIGN.md` - Auditing system

**Integration:**
- `GITHUB_SETUP_FOR_AGENTS.md` - GitHub setup
- `GITHUB_INTEGRATION_COMPLETE.md` - GitHub summary
- `VERCEL_INTEGRATION_COMPLETE.md` - Vercel summary
- `COMPLETE_SETUP_SUMMARY.md` - Full system summary

---

## ✅ Final Checklist

Before going live, verify:

- [ ] All quick tests passed (6/6)
- [ ] Board meeting test passed
- [ ] CEO execution test passed
- [ ] GitHub access verified
- [ ] Vercel access verified
- [ ] Cron jobs installed
- [ ] Gateway running stable

**If all checked: 🎉 READY FOR PRODUCTION!**

**Let AgentForge build your business empire!** 🚀
