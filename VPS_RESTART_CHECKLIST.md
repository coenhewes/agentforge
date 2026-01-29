# VPS Restart Checklist - Manual Startup Steps

**Use this checklist after restarting your VPS to add storage or perform maintenance.**

---

## Prerequisites

- SSH access to your VPS
- User: `agentforge` (or your configured user)
- Working directory: `~/agentforge`

---

## Step 1: Verify System is Ready (2 minutes)

### 1a. Connect to VPS

```bash
ssh agentforge@YOUR_VPS_IP
```

### 1b. Check System Status

```bash
# Verify system is up
uptime

# Check disk space (verify storage was added)
df -h

# Check network connectivity
ping -c 3 8.8.8.8
```

### 1c. Verify Working Directory Exists

```bash
cd ~/agentforge
pwd
# Should show: /home/agentforge/agentforge

# Verify Node.js is available
node --version
# Should show: v22.x.x

# Verify pnpm is available
pnpm --version
```

---

## Step 2: Start Gateway Service (3 minutes)

### 2a. Check Gateway Service Status

```bash
sudo systemctl status moltbot-gateway
```

**Expected states:**
- `inactive (dead)` - Service is stopped (normal after restart)
- `active (running)` - Service is already running (skip to Step 2c)

### 2b. Start Gateway Service

```bash
# Start the gateway service
sudo systemctl start moltbot-gateway

# Verify it started successfully
sudo systemctl status moltbot-gateway
```

**Expected output:**
```
● moltbot-gateway.service - Moltbot Gateway for AgentForge
     Loaded: loaded (/etc/systemd/system/moltbot-gateway.service; enabled)
     Active: active (running) since ...
```

### 2c. Verify Gateway is Listening

```bash
# Check if gateway is listening on port 18789
ss -ltnp | grep 18789

# Expected output:
# LISTEN 0      128          0.0.0.0:18789      0.0.0.0:*    users:(("node",pid=XXXX,...))
```

### 2d. Check Gateway Logs

```bash
# View recent logs
sudo journalctl -u moltbot-gateway -n 50 --no-pager

# Follow logs in real-time (Ctrl+C to exit)
sudo journalctl -u moltbot-gateway -f
```

**Look for:**
- ✅ "gateway started" or similar success messages
- ✅ No fatal errors
- ⚠️ If you see errors, check Step 6 (Troubleshooting)

### 2e. Test Gateway Health Endpoint

```bash
# Test gateway health endpoint
curl http://localhost:18789/health

# Expected: Some response (format depends on gateway implementation)
```

---

## Step 3: Verify Cron Service (1 minute)

### 3a. Check Cron Service Status

```bash
sudo systemctl status cron
```

**Expected:** `active (running)` - Cron should auto-start on boot

If not running:
```bash
sudo systemctl start cron
sudo systemctl enable cron
```

### 3b. Verify Cron Jobs are Installed

```bash
# List your cron jobs
crontab -l

# Expected output should include:
# - Daily board meeting (9am)
# - Daily CEO execution (10am)
# - Weekly reflection (Sunday 10pm)
# - Monthly meta-learning (1st of month 11pm)
# - Obsidian sync (every 6 hours)
```

**If cron jobs are missing**, reinstall them:

```bash
cd ~/agentforge
crontab -e

# Add these lines:
# Daily board meeting at 9am
0 9 * * * cd /home/agentforge/agentforge && ./scripts/board-meeting.sh >> /tmp/agentforge-board.log 2>&1

# Daily CEO execution at 10am
0 10 * * * cd /home/agentforge/agentforge && ./scripts/ceo-implement.sh >> /tmp/agentforge-ceo.log 2>&1

# Weekly reflection (Sundays at 10pm)
0 22 * * 0 cd /home/agentforge/agentforge && ./scripts/weekly-reflection.sh >> /tmp/agentforge-reflection.log 2>&1

# Monthly meta-learning (1st of month at 11pm)
0 23 1 * * cd /home/agentforge/agentforge && ./scripts/monthly-learning.sh >> /tmp/agentforge-metalearning.log 2>&1

# Obsidian sync (every 6 hours)
0 */6 * * * cd /home/agentforge/agentforge && ./scripts/sync-to-obsidian.sh >> /tmp/agentforge-sync.log 2>&1
```

---

## Step 4: Verify Agent Workspaces (2 minutes)

### 4a. Check Agent Directories Exist

```bash
ls -la ~/.moltbot/agents/

# Expected directories:
# analyst  ceo  cfo  cmo  coo  coordinator  cto  innovation  risk
```

### 4b. Verify Agent Configuration Files

```bash
# Check CEO workspace (most critical)
ls -la ~/.moltbot/agents/ceo/

# Should see:
# - SOUL.md
# - MEMORY.md
# - LEDGER.md
# - AGENTS.md (if exists)
```

### 4c. Test Agent Communication

```bash
cd ~/agentforge

# Test CEO agent
node moltbot.mjs agent --agent ceo --message "Status check: Are you operational?"

# Expected: CEO responds with status
```

---

## Step 5: Verify Configuration (2 minutes)

### 5a. Check API Provider Config

```bash
# Verify config file exists
cat ~/.clawdbot/moltbot.json | jq .models.providers

# Should show your configured provider (OpenAI, Anthropic, or Google)
```

### 5b. Verify GitHub Access (if configured)

```bash
# Check GitHub token is set
echo $GITHUB_TOKEN

# Test GitHub API access
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user 2>/dev/null | jq .login

# Expected: Your GitHub bot username
```

### 5c. Verify Vercel Access (if configured)

```bash
# Test Vercel CLI
vercel whoami

# Expected: Your Vercel account username
```

---

## Step 6: Test System End-to-End (5 minutes)

### 6a. Test Gateway → Agent Communication

```bash
cd ~/agentforge

# Send test message to CEO
node moltbot.mjs agent --agent ceo --message "Test: Can you read this message?"

# Expected: CEO responds
```

### 6b. Test Agent Memory Access

```bash
# Test CFO memory search
node moltbot.mjs agent --agent cfo --message "Search your memory for 'treasury'. What do you know about our capital?"

# Expected: CFO uses memory_search tool and responds
```

### 6c. Test Agent-to-Agent Messaging

```bash
# CEO sends message to CFO
node moltbot.mjs agent --agent ceo --message "Use sessions_send to send a test message to the CFO asking about treasury balance."

# Verify CFO received it
node moltbot.mjs agent --agent cfo --message "Check your message history with sessions_history. Did the CEO contact you?"
```

---

## Step 7: Monitor Initial Operation (Optional)

### 7a. Watch Gateway Logs

```bash
# In a separate terminal or tmux session
sudo journalctl -u moltbot-gateway -f
```

### 7b. Check Recent Activity Logs

```bash
# View recent board meeting logs (if any)
tail -50 /tmp/agentforge-board.log

# View recent CEO execution logs (if any)
tail -50 /tmp/agentforge-ceo.log
```

### 7c. Check Agent Sessions

```bash
# View CEO session
node moltbot.mjs tui --session agent:ceo:main

# Use arrow keys to scroll, press 'q' to exit
```

---

## Step 8: Verify Scheduled Jobs Will Run

### 8a. Check Next Cron Execution Times

```bash
# View cron schedule
crontab -l

# Calculate next execution times:
# - Board meeting: Next 9am
# - CEO execution: Next 10am
# - Weekly reflection: Next Sunday 10pm
# - Monthly learning: Next 1st of month 11pm
# - Obsidian sync: Next 6-hour mark (00:00, 06:00, 12:00, 18:00)
```

### 8b. Verify Scripts are Executable

```bash
cd ~/agentforge

# Check script permissions
ls -l scripts/*.sh

# Should show: -rwxr-xr-x (executable)

# If not executable, fix:
chmod +x scripts/*.sh
```

---

## Quick Verification Summary

Run this quick check to verify everything is operational:

```bash
#!/bin/bash
echo "=== AgentForge Status Check ==="
echo ""

echo "1. Gateway Service:"
sudo systemctl is-active moltbot-gateway && echo "  ✅ Running" || echo "  ❌ Stopped"

echo ""
echo "2. Gateway Port:"
ss -ltnp | grep 18789 > /dev/null && echo "  ✅ Listening on 18789" || echo "  ❌ Not listening"

echo ""
echo "3. Cron Service:"
sudo systemctl is-active cron && echo "  ✅ Running" || echo "  ❌ Stopped"

echo ""
echo "4. Cron Jobs:"
crontab -l | grep -q "board-meeting.sh" && echo "  ✅ Installed" || echo "  ❌ Missing"

echo ""
echo "5. Agent Workspaces:"
[ -d ~/.moltbot/agents/ceo ] && echo "  ✅ CEO workspace exists" || echo "  ❌ CEO workspace missing"

echo ""
echo "6. Config File:"
[ -f ~/.clawdbot/moltbot.json ] && echo "  ✅ Config exists" || echo "  ❌ Config missing"

echo ""
echo "=== Check Complete ==="
```

Save this as `~/check-status.sh`, make it executable (`chmod +x ~/check-status.sh`), and run it.

---

## Troubleshooting

### Gateway Won't Start

**Check logs:**
```bash
sudo journalctl -u moltbot-gateway -n 100 --no-pager
```

**Common issues:**

1. **Port in use:**
```bash
sudo lsof -i :18789
# Kill the process if needed
sudo kill -9 PID
sudo systemctl restart moltbot-gateway
```

2. **Config error:**
```bash
cat ~/.clawdbot/moltbot.json | jq .
# Fix any JSON syntax errors
```

3. **Missing dependencies:**
```bash
cd ~/agentforge
pnpm install
pnpm build
sudo systemctl restart moltbot-gateway
```

### Agents Not Responding

**Check gateway is running:**
```bash
sudo systemctl status moltbot-gateway
```

**Test API provider:**
```bash
cd ~/agentforge
node moltbot.mjs agent --agent ceo --message "test"
# If fails, check API key in ~/.clawdbot/moltbot.json
```

**Check agent workspace:**
```bash
ls ~/.moltbot/agents/ceo/
# Should see SOUL.md, MEMORY.md, etc.
```

### Cron Jobs Not Running

**Check cron service:**
```bash
sudo systemctl status cron
```

**Check cron logs:**
```bash
grep CRON /var/log/syslog | tail -20
```

**Test script manually:**
```bash
cd ~/agentforge
./scripts/board-meeting.sh
# Check for errors
```

---

## Expected Behavior After Restart

Once all steps are complete:

✅ **Gateway** runs 24/7 as a systemd service  
✅ **Cron jobs** execute automatically:
- Board meeting: Daily at 9am
- CEO execution: Daily at 10am  
- Weekly reflection: Sundays at 10pm
- Monthly learning: 1st of month at 11pm
- Obsidian sync: Every 6 hours

✅ **Agents** respond to manual commands immediately  
✅ **System** operates autonomously until next restart

---

## Quick Reference Commands

**Gateway:**
```bash
sudo systemctl start moltbot-gateway      # Start
sudo systemctl stop moltbot-gateway       # Stop
sudo systemctl restart moltbot-gateway    # Restart
sudo systemctl status moltbot-gateway     # Status
sudo journalctl -u moltbot-gateway -f     # Logs
```

**Cron:**
```bash
sudo systemctl status cron                # Status
crontab -l                                # List jobs
crontab -e                                # Edit jobs
```

**Agents:**
```bash
node moltbot.mjs agent --agent ceo --message "..."  # Send message
node moltbot.mjs tui --session agent:ceo:main        # View session
```

**Manual Triggers:**
```bash
./scripts/board-meeting.sh      # Trigger board meeting
./scripts/ceo-implement.sh      # Trigger CEO execution
./scripts/sync-to-obsidian.sh   # Sync vault
```

---

## Success Criteria

After completing all steps, verify:

- [ ] Gateway service is `active (running)`
- [ ] Gateway is listening on port 18789
- [ ] Cron service is `active (running)`
- [ ] Cron jobs are installed (`crontab -l` shows jobs)
- [ ] Agent workspaces exist (`ls ~/.moltbot/agents/`)
- [ ] Config file exists (`cat ~/.clawdbot/moltbot.json`)
- [ ] Test agent command works (`node moltbot.mjs agent --agent ceo --message "test"`)
- [ ] Gateway health endpoint responds (`curl http://localhost:18789/health`)

**If all checked: ✅ SYSTEM OPERATIONAL!**

---

**Last Updated:** 2026-01-29  
**Based on:** VPS_DEPLOYMENT_GUIDE.md and codebase review

