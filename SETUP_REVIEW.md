# AgentForge Setup & Installation Review

## Issues Found

### 🔴 Critical Issues

#### 1. Invalid Session References (`agent:board:main` doesn't exist)

**Locations:**
- `src/commands/init-agentforge.ts` line 39
- `agents/ceo/SOUL.md` line 19
- `agents/ceo/AGENTS.md` line 167
- `agents/ceo/HEARTBEAT.md` lines 13, 176
- `docs/start/ceo-quickstart.md` line 95
- README.md (if any)

**Problem:** References to `agent:board:main` but this session doesn't exist. Should be `agent:coordinator:main`.

**Impact:** CEO won't be able to read board decisions, monitoring commands will fail.

**Fix Required:** Replace all `agent:board:main` with `agent:coordinator:main`.

---

### 🟡 Medium Issues

#### 2. Missing `gateway.mode` Configuration

**Problem:** After running `init:agentforge`, config doesn't set `gateway.mode=local`.

**Impact:** Gateway may refuse to start without this setting.

**Fix Required:** Add to `updateConfig()`:
```typescript
gateway: {
  ...cfg.gateway,
  mode: "local",
},
```

#### 3. Missing `tools.agentToAgent.enabled` Configuration

**Problem:** Agent-to-agent messaging requires `tools.agentToAgent.enabled=true`.

**Impact:** Coordinator can't read board member sessions, CEO can't communicate with workers.

**Fix Required:** Add to `updateConfig()`:
```typescript
tools: {
  ...cfg.tools,
  agentToAgent: {
    enabled: true,
  },
},
```

#### 4. Script Paths Hardcoded to Repo Root

**Problem:** Cron jobs use absolute paths to current working directory:
```bash
0 9 * * * cd /Users/user/agentforge && /Users/user/agentforge/scripts/board-meeting.sh
```

**Impact:** If repo is moved or cloned to different location, cron jobs break.

**Fix:** Document that users should edit paths in cron template, or use `~` expansion.

---

### 🟢 Minor Issues

#### 5. No Build Step in Quick Start

**Problem:** README says `pnpm install` then `node moltbot.mjs init:agentforge`.

**Missing:** Need to run `pnpm build` first to compile TypeScript.

**Fix:** Update README to include build step.

#### 6. Scripts Not in PATH

**Problem:** Scripts use `./scripts/board-meeting.sh` requiring user to be in repo root.

**Impact:** Can't trigger board meetings from arbitrary locations.

**Fix:** Document this requirement or update scripts to use absolute paths.

---

## Corrected Installation Steps

### From Fresh Clone

```bash
# 1. Clone repository
git clone https://github.com/moltbot/moltbot.git agentforge
cd agentforge

# 2. Install dependencies
pnpm install

# 3. Build TypeScript
pnpm build

# 4. Initialize AgentForge (copies workspaces, registers agents)
node moltbot.mjs init:agentforge

# 5. Set AI provider
node moltbot.mjs auth choice
# Choose Claude Sonnet 4.5 or OpenAI

# 6. Verify configuration
node moltbot.mjs config get agents.list
# Should show 9 agents: cfo, cto, cmo, coo, analyst, risk, innovation, coordinator, ceo

node moltbot.mjs config get tools.agentToAgent.enabled
# Should return true

node moltbot.mjs config get gateway.mode
# Should return "local"

# 7. Start gateway
node moltbot.mjs gateway run --port 18789 --verbose
# Leave running in terminal or background

# 8. Test board meeting (in new terminal)
cd /path/to/agentforge
./scripts/board-meeting.sh

# 9. Monitor coordinator (wait ~5 minutes for board to respond)
node moltbot.mjs tui --session agent:coordinator:main

# 10. Trigger CEO execution
./scripts/ceo-implement.sh

# 11. Monitor CEO
node moltbot.mjs tui --session agent:ceo:main

# 12. Install cron jobs (optional, for autonomous operation)
crontab -e
# Add lines from ~/.moltbot/agentforge-cron.txt
```

---

## What Works ✅

1. **Agent workspace structure** - All 9 agents created correctly
2. **File copying** - `init:agentforge` copies agents to `~/.moltbot/agents/`
3. **Agent registration** - All agents added to config
4. **Budget defaults** - $50/day, $500/month set correctly
5. **Scripts exist** - Both board-meeting.sh and ceo-implement.sh present and executable
6. **Coordinator pattern** - Hub-and-spoke architecture is sound
7. **Build system** - TypeScript compiles without errors
8. **Linter** - No linting errors

---

## What Needs Fixing ❌

### High Priority

1. Replace `agent:board:main` → `agent:coordinator:main` in:
   - CEO persona files
   - Init command output
   - Documentation

2. Add missing config in `init:agentforge`:
   - `gateway.mode = "local"`
   - `tools.agentToAgent.enabled = true`

### Medium Priority

3. Update README to include `pnpm build` step

4. Add config verification to init command:
   ```typescript
   runtime.log("\n🔍 Verifying configuration...");
   runtime.log(`  ✓ Gateway mode: ${cfg.gateway?.mode || 'local'}`);
   runtime.log(`  ✓ Agent-to-agent: ${cfg.tools?.agentToAgent?.enabled ? 'enabled' : 'disabled'}`);
   ```

### Low Priority

5. Document cron path requirements

6. Add troubleshooting section to README

---

## Testing Checklist

After fixes, test this flow:

```bash
# Fresh terminal, from repo root
pnpm install
pnpm build
node moltbot.mjs init:agentforge

# Check config
node moltbot.mjs config get agents.list | grep -c "id"
# Should output: 9

node moltbot.mjs config get tools.agentToAgent
# Should show: enabled: true

# Start gateway (background)
node moltbot.mjs gateway run --port 18789 > /tmp/gateway.log 2>&1 &

# Wait 5 seconds for gateway to start
sleep 5

# Trigger board meeting
./scripts/board-meeting.sh

# Wait 3 minutes for board to analyze
sleep 180

# Check coordinator output
node moltbot.mjs agent --agent coordinator --message "/history" | grep "BOARD DECISION"
# Should show synthesized decision

# Trigger CEO
./scripts/ceo-implement.sh

# Wait 30 seconds
sleep 30

# Check CEO output
node moltbot.mjs agent --agent ceo --message "/history" | grep -A 5 "board decision"
# Should show CEO read coordinator and started execution
```

If all these pass, installation is smooth and working.

---

## Recommendation

**Fix these 5 things before considering setup "smooth":**

1. ✅ Replace all `agent:board:main` references
2. ✅ Add `gateway.mode = "local"` to init config
3. ✅ Add `tools.agentToAgent.enabled = true` to init config
4. ✅ Add `pnpm build` to README install steps
5. ✅ Add config verification output to init command

With these fixes, the installation will be:
- **Turnkey** - One command sets up everything
- **Verified** - Init command confirms correct configuration
- **Documented** - Clear steps with no missing pieces
- **Tested** - All components work together
