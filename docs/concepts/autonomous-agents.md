---
summary: "Autonomous agent patterns: CEO agents, hierarchical spawning, and self-directed operation"
title: Autonomous Agents
read_when:
  - You want to build self-directed agents that spawn and manage other agents
  - You are setting up a CEO/manager agent pattern
  - You need hierarchical agent structures
---

# Autonomous Agents

Autonomous agents operate with minimal human intervention, making decisions, spawning sub-agents, and executing multi-step plans. This guide covers patterns for building self-directed agent systems.

## Overview

An autonomous agent typically:
- Runs on a heartbeat schedule (every 5-30 minutes)
- Maintains its own memory and state in workspace files
- Spawns sub-agents to delegate work
- Monitors sub-agent progress and adjusts strategy
- Persists learnings across sessions

## Enabling Hierarchical Spawning

By default, sub-agents cannot spawn their own sub-agents. To enable hierarchical structures:

```json5
{
  agents: {
    list: [
      {
        id: "ceo",
        workspace: "~/ceo-agent",
        subagents: {
          allowAgents: ["*"]  // Allow spawning any agent, including nested
        },
        sandbox: {
          mode: "off"  // Full system access for autonomous operation
        }
      }
    ]
  }
}
```

This enables patterns like:
- CEO spawns PM
- PM spawns Developer + Marketer
- Developer spawns code review agents

## Workspace Structure

A well-organized autonomous agent workspace:

```
~/ceo-agent/
├── SOUL.md          # Core identity and mission
├── AGENTS.md        # Operating procedures
├── IDENTITY.md      # Name, role, display info
├── HEARTBEAT.md     # Recurring task checklist
├── MEMORY.md        # Long-term strategic memory
├── memory/          # Daily logs
│   └── 2024-01-15.md
├── templates/       # Sub-agent role templates
│   ├── developer.md
│   ├── marketer.md
│   ├── researcher.md
│   └── pm.md
└── scripts/         # Automation helpers
    └── sync.sh      # Git checkpoint script
```

### SOUL.md

Defines the agent's core identity and mission:

```markdown
# Identity

You are [NAME], a [ROLE].

## Primary Directive

[Clear statement of the agent's purpose and goals]

## Operating Principles

- [Principle 1]
- [Principle 2]
```

### HEARTBEAT.md

Defines recurring checks the agent performs:

```markdown
# Heartbeat Checklist

## Priority Checks (every heartbeat)
- [ ] Review active sub-agents
- [ ] Check for completed work
- [ ] Identify blockers

## Daily Tasks
- [ ] Update memory with learnings
- [ ] Plan next initiatives
```

### MEMORY.md

Long-term memory for strategic context:

```markdown
# Strategic Memory

## Active Projects
- Project A: [status, metrics, next steps]
- Project B: [status, metrics, next steps]

## Key Learnings
- [What worked]
- [What to avoid]

## Contacts & Resources
- [Important accounts, credentials references]
```

## Context Injection Protocol

Sub-agents start with no knowledge of business context. Always inject context explicitly:

```
sessions_spawn task:"You are a Developer Agent.

=== BUSINESS CONTEXT ===
Project: AI Writing Tool
Status: Building MVP
Tech: Next.js, Supabase
Repo: github.com/user/writer
Deadline: 2 weeks

=== YOUR TASK ===
Build the user authentication flow.

=== SUCCESS CRITERIA ===
- Email/password signup works
- Session persistence works
- Code pushed to main branch

Report back with: what you built, PR URL, any blockers."
```

Without context injection, agents make assumptions and build the wrong things.

## Sub-Agent Templates

Create role templates to standardize spawning:

### Developer Template

```markdown
# Developer Agent

## Role
Ship code fast and well.

## Tools
- Claude Code: `bash pty:true command:"claude '[TASK]'"`
- GitHub CLI: `gh repo create`, `gh pr create`

## Standards
- Clean, tested code
- Clear commit messages
- Ship fast - perfect is enemy of done
```

### Product Manager Template

```markdown
# Product Manager Agent

## Role
Coordinate development, prioritize features, ship products.

## Authority
Can spawn: Developer, Marketing, Research agents

## Tools
- sessions_spawn (create sub-agents)
- GitHub (manage issues)
- Browser (research)
```

## Heartbeat Configuration

Configure aggressive heartbeats for autonomous operation:

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "5m",           // Check every 5 minutes
        activeHours: {
          start: "00:00",      // 24/7 operation
          end: "24:00"
        }
      },
      subagents: {
        maxConcurrent: 50      // Allow many parallel workers
      }
    }
  }
}
```

## Persistence with Git

Autonomous agents should persist their state. Set up the workspace as a git repo:

```bash
cd ~/ceo-agent
git init
git remote add origin git@github.com:user/ceo-agent-private.git
```

Add auto-save to the heartbeat routine:

```bash
#!/bin/bash
# scripts/sync.sh
cd "$(dirname "$0")/.."
git add -A
git commit -m "checkpoint $(date +%Y-%m-%d-%H%M)" --allow-empty-message 2>/dev/null || true
git push origin main 2>/dev/null || true
```

## Tool Access

Autonomous agents typically need full tool access:

```json5
{
  agents: {
    list: [
      {
        id: "ceo",
        sandbox: { mode: "off" },
        // No tool restrictions - all tools available
      }
    ]
  }
}
```

For sub-agents, consider restricting tools based on role:

```json5
{
  tools: {
    subagents: {
      tools: {
        deny: ["cron", "gateway"]  // Sub-agents can't modify system config
      }
    }
  }
}
```

## Monitoring

### Check Active Sub-Agents

```bash
moltbot sessions --agent ceo --active
```

### View Sub-Agent Logs

```
/subagents list
/subagents log #1
```

### Monitor Costs

Each sub-agent uses its own token budget. Monitor via:
- Announce messages include cost estimates
- Session transcripts log token usage

## Example: CEO Agent Configuration

Complete configuration for an autonomous CEO agent:

```json5
{
  agents: {
    list: [
      {
        id: "ceo",
        name: "The Director",
        workspace: "~/ceo-agent",
        model: "anthropic/claude-opus-4-5",
        subagents: {
          allowAgents: ["*"],
          model: "anthropic/claude-sonnet-4-5"  // Cheaper model for workers
        },
        sandbox: { mode: "off" },
        heartbeat: {
          every: "5m",
          activeHours: { start: "00:00", end: "24:00" },
          target: "telegram",
          to: "123456789"
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

## Safety Considerations

Autonomous agents have significant power. Consider:

1. **Cost controls**: Set `maxConcurrent` limits; use cheaper models for sub-agents
2. **Sandboxing**: Even with `sandbox: off`, the agent respects system permissions
3. **Monitoring**: Watch heartbeat outputs and sub-agent announces
4. **Persistence**: Git-backed workspaces prevent data loss
5. **Guardrails**: Define clear boundaries in SOUL.md about what the agent should/shouldn't do

## Skills for Autonomous Agents

Useful skills for autonomous operation:

| Skill | Purpose |
|-------|---------|
| `vercel` | Deploy web apps |
| `github` | Code management |
| `himalaya` | Email communication |
| `browser-automation` | Web interactions, scraping |
| `sheets-finance` | Financial tracking |
| `stripe` | Payment integration |
| `bird` | Twitter/X management |
| `1password` | Secure credential access |

See individual skill files in `skills/` for usage patterns.

## Debugging

### Agent Not Spawning Sub-Agents

Check:
1. `subagents.allowAgents` includes the target or `["*"]`
2. `maxConcurrent` limit not reached
3. Sub-agent tools not denied in config

### Context Not Reaching Sub-Agents

Sub-agents only receive:
- The task description you provide
- `AGENTS.md` and `TOOLS.md` from their workspace

They do NOT automatically receive:
- `SOUL.md`, `IDENTITY.md`, `USER.md`
- Parent agent's memory or context
- Business context (must be injected explicitly)

### Heartbeats Not Triggering

Check:
1. `heartbeat.every` is set and non-zero
2. Current time is within `activeHours`
3. `HEARTBEAT.md` exists and has content (empty files skip heartbeats)
