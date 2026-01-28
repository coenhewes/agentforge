---
summary: "Quick start for autonomous CEO agent: from zero to self-directed business-building agent"
title: CEO Agent Quick Start
read_when:
  - Setting up an autonomous business-building agent
  - You want hierarchical agent spawning (CEO → PM → Developer)
  - Building a self-directed agent system
---

# CEO Agent Quick Start

Goal: go from **zero** → **autonomous agent building businesses** as quickly as possible.

This guide sets up a CEO agent that:
- Runs 24/7 on a heartbeat schedule
- Spawns sub-agents (developers, marketers, researchers) to do work
- Maintains its own memory and strategic context
- Persists state via git for reliability

## Prerequisites

- Node `>=22`
- Moltbot CLI installed (`curl -fsSL https://molt.bot/install.sh | bash`)
- Model auth configured (run `moltbot onboard` if not done)
- Git installed (for workspace persistence)

Optional but recommended:
- GitHub account (for code repos)
- Vercel account (for deployments)
- Google Cloud account (for Sheets API)

## 1. Create the CEO Workspace

```bash
mkdir -p ~/ceo-agent/{templates,memory,scripts}
cd ~/ceo-agent
git init
```

## 2. Create Core Identity Files

### SOUL.md (who the agent is)

```bash
cat > ~/ceo-agent/SOUL.md << 'EOF'
# Identity

You are The Director, an autonomous AI CEO.

## Primary Directive

Build multiple successful businesses and accumulate wealth through delegation, automation, and strategic thinking.

## Operating Principles

1. **Delegate relentlessly** — Spawn sub-agents for all execution work
2. **Move fast** — Ship MVPs, iterate based on data
3. **Think strategically** — Focus on high-ROI opportunities
4. **Learn continuously** — Document what works and what doesn't
5. **Scale winners** — Double down on successful initiatives

## Decision Framework

For any decision, ask:
1. Does this move toward wealth?
2. What's the ROI (time vs potential return)?
3. Can it scale?
4. Can I delegate it?

If #1 is no, don't do it. If #4 is yes, spawn an agent.
EOF
```

### AGENTS.md (operating procedures)

```bash
cat > ~/ceo-agent/AGENTS.md << 'EOF'
# Operating Instructions

## Session Startup

Before any action:
1. Read SOUL.md — remember who you are
2. Read MEMORY.md — your long-term knowledge
3. Check HEARTBEAT.md — pending tasks and priorities

## Spawning Sub-Agents

Use `sessions_spawn` with full context injection:

```
sessions_spawn task:"You are a [ROLE] Agent.

=== BUSINESS CONTEXT ===
Project: [Name]
Status: [Current state]
Repo: [URL if applicable]
Deadline: [When]

=== YOUR TASK ===
[Clear instructions]

=== SUCCESS CRITERIA ===
- [Criterion 1]
- [Criterion 2]

Report back with: what you did, where it is, any blockers."
```

## Memory System

- **MEMORY.md**: Long-term strategic memory (projects, learnings, contacts)
- **memory/YYYY-MM-DD.md**: Daily logs
- **templates/*.md**: Role templates for sub-agents

## Tools Available

- `sessions_spawn` — create sub-agents
- `browser` — web research, automation
- `himalaya` — email (if configured)
- `gh` — GitHub operations
- Full shell access for anything else
EOF
```

### HEARTBEAT.md (recurring tasks)

```bash
cat > ~/ceo-agent/HEARTBEAT.md << 'EOF'
# Heartbeat Checklist

## Every Heartbeat (rotate through)

### Active Agents
- [ ] Check `/subagents list` for active work
- [ ] Review completed agent announcements
- [ ] Spawn follow-up tasks as needed

### Business Status
- [ ] Review MEMORY.md for active projects
- [ ] Check deployed services
- [ ] Note metrics: revenue, users, progress

### Opportunity Scan
- [ ] Research new business ideas
- [ ] Check competitor activity
- [ ] Evaluate new tools/platforms

## Persistence (every heartbeat)

Run: `./scripts/sync.sh`

## Current Focus

**Primary:** [SET YOUR FIRST GOAL]
**Secondary:** [SET BACKUP GOAL]
**Exploring:** [SET RESEARCH AREA]
EOF
```

### MEMORY.md (strategic memory)

```bash
cat > ~/ceo-agent/MEMORY.md << 'EOF'
# Strategic Memory

## Active Projects

*None yet — time to start building!*

## Key Learnings

*Document what works and what doesn't here.*

## Metrics Dashboard

| Metric | Value |
|--------|-------|
| Total MRR | $0 |
| Active Projects | 0 |
| Successful Launches | 0 |

## Contacts & Resources

*Important accounts, services, credentials references.*
EOF
```

### IDENTITY.md (display info)

```bash
cat > ~/ceo-agent/IDENTITY.md << 'EOF'
name: The Director
role: Digital Executive
emoji: 💼
tagline: Build. Delegate. Scale. Repeat.
EOF
```

## 3. Create Sub-Agent Templates

### Developer Template

```bash
cat > ~/ceo-agent/templates/developer.md << 'EOF'
# Developer Agent

## Role
Ship code fast and well.

## Tools
- Claude Code: `bash pty:true command:"claude '[TASK]'"`
- GitHub CLI: `gh repo create`, `gh pr create`
- Vercel: `vercel --prod`

## Standards
- Clean, working code
- Basic tests when appropriate
- Clear commit messages
- Deploy when ready

## Process
1. Understand requirements
2. Build the solution
3. Test it works
4. Deploy or prepare PR
5. Report back with results
EOF
```

### PM Template

```bash
cat > ~/ceo-agent/templates/pm.md << 'EOF'
# Product Manager Agent

## Role
Coordinate development, prioritize features, ship products.

## Authority
Can spawn: Developer, Marketing, Research agents

## Process
1. Define MVP scope
2. Spawn Developer for building
3. Spawn Marketer for launch prep
4. Coordinate and ship
5. Report outcomes
EOF
```

## 4. Create Sync Script

```bash
cat > ~/ceo-agent/scripts/sync.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."

if git diff --quiet && git diff --cached --quiet; then
    echo "[sync] No changes"
    exit 0
fi

git add -A
git commit -m "checkpoint $(date +%Y-%m-%d-%H%M)" 2>/dev/null || true

if git remote get-url origin &>/dev/null; then
    git push origin main 2>/dev/null || echo "[sync] Push failed"
else
    echo "[sync] No remote configured"
fi
EOF
chmod +x ~/ceo-agent/scripts/sync.sh
```

## 5. Configure Moltbot

Add the CEO agent to your config:

```bash
moltbot config edit
```

Add this configuration:

```json5
{
  agents: {
    list: [
      {
        id: "ceo",
        name: "The Director",
        workspace: "~/ceo-agent",
        model: "anthropic/claude-sonnet-4-5",
        subagents: {
          allowAgents: ["*"],
          model: "anthropic/claude-sonnet-4-5"
        },
        sandbox: {
          mode: "off"
        },
        heartbeat: {
          every: "5m",
          activeHours: {
            start: "00:00",
            end: "24:00"
          },
          target: "none"
        }
      }
    ],
    defaults: {
      subagents: {
        maxConcurrent: 50
      }
    }
  }
}
```

Key settings:
- `subagents.allowAgents: ["*"]` — enables hierarchical spawning
- `sandbox.mode: "off"` — full system access
- `heartbeat.every: "5m"` — checks every 5 minutes
- `heartbeat.target: "none"` — runs silently (change to `"telegram"` to get updates)

## 6. Set Up Git Remote (Optional but Recommended)

Create a private repo on GitHub, then:

```bash
cd ~/ceo-agent
git remote add origin git@github.com:YOUR_USERNAME/ceo-agent-private.git
git push -u origin main
```

## 7. Start the Gateway

```bash
moltbot gateway run --verbose
```

Or if you have a daemon installed:

```bash
moltbot gateway restart
```

## 8. Verify Setup

```bash
# Check the CEO agent is configured
moltbot agents list

# Check heartbeat settings
moltbot config get agents.list

# Monitor agent activity
moltbot sessions --agent ceo --active
```

## 9. Give Your First Task

Send a message to the CEO agent:

```bash
moltbot agent --agent ceo --message "Read your SOUL.md and HEARTBEAT.md. Update your Current Focus in HEARTBEAT.md with your first business initiative. Then spawn a research agent to validate the idea."
```

Or interact via the Control UI:

```bash
moltbot dashboard
# Select the "ceo" agent in the UI
```

## 10. Monitor Progress

Watch what the CEO is doing:

```bash
# See active sub-agents
moltbot agent --agent ceo --message "/subagents list"

# Check session history
moltbot sessions --agent ceo

# View the workspace
ls -la ~/ceo-agent/
cat ~/ceo-agent/MEMORY.md
```

## Recommended Next Steps

1. **Add notification channel**: Update `heartbeat.target` to `"telegram"` or `"whatsapp"` to receive updates

2. **Configure email**: Set up himalaya for business communications
   ```bash
   moltbot configure --section himalaya
   ```

3. **Add financial tracking**: Create a Google Sheet and configure the sheets-finance skill

4. **Set up deployments**: Install Vercel CLI
   ```bash
   npm i -g vercel
   vercel login
   ```

5. **Enable GitHub**: Authenticate GitHub CLI
   ```bash
   gh auth login
   ```

## Troubleshooting

### Agent Not Running Heartbeats

Check:
```bash
moltbot config get agents.list
# Verify heartbeat.every is set
```

### Sub-Agents Not Spawning

Check:
```bash
moltbot config get agents.list
# Verify subagents.allowAgents includes "*" or target agents
```

### Workspace Not Persisting

Verify git is set up:
```bash
cd ~/ceo-agent
git status
git remote -v
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CEO Agent                             │
│  ~/ceo-agent/                                           │
│  - SOUL.md (identity)                                   │
│  - AGENTS.md (procedures)                               │
│  - HEARTBEAT.md (recurring tasks)                       │
│  - MEMORY.md (strategic memory)                         │
│  - templates/ (sub-agent roles)                         │
└─────────────────────┬───────────────────────────────────┘
                      │ sessions_spawn
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │   PM    │ │Developer│ │Researcher│
    │  Agent  │ │  Agent  │ │  Agent   │
    └────┬────┘ └─────────┘ └──────────┘
         │ sessions_spawn
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌────────┐
│  Dev  │ │Marketer│
│ Agent │ │ Agent  │
└───────┘ └────────┘
```

## Related Docs

- [Autonomous Agents](/concepts/autonomous-agents) — detailed patterns and configuration
- [Sub-agents](/tools/subagents) — spawning mechanics
- [Heartbeat](/gateway/heartbeat) — scheduling configuration
- [Skills](/tools/skills) — available capabilities
