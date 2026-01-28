---
title: AgentForge Dashboard
tags: [dashboard, overview]
cssclasses: [dashboard]
---

# 🏢 AgentForge Dashboard

*Your AI business building command center*

---

## 📊 Portfolio at a Glance

### Active Ventures
> Check `02-Ventures/Active/` for details

*No active ventures yet - waiting for first board meeting*

### Financial Summary
- **Total Deployed:** $0
- **Total Revenue:** $0
- **Portfolio ROI:** N/A
- **Success Rate:** N/A
- **Current Runway:** Check with CFO

---

## 🎯 Recent Board Meetings

*No meetings yet - run `./scripts/board-meeting.sh` to start*

**Next Meeting:** Daily at 9am (automated via cron)

---

## 🤖 Agent Performance

| Agent | Role | Status | Accuracy | Notes |
|-------|------|--------|----------|-------|
| [[03-Agents/Market-Analyst/Agent Profile\|Market Analyst]] | Market Research | Active | Baseline | Web research specialist |
| [[03-Agents/CFO/Agent Profile\|CFO]] | Financial Analysis | Active | Baseline | ROI predictions |
| [[03-Agents/CTO/Agent Profile\|CTO]] | Technical Assessment | Active | Baseline | Timeline estimates |
| [[03-Agents/CMO/Agent Profile\|CMO]] | Marketing Strategy | Active | Baseline | CAC predictions |
| [[03-Agents/COO/Agent Profile\|COO]] | Operations | Active | Baseline | Execution planning |
| [[03-Agents/Risk-Manager/Agent Profile\|Risk Manager]] | Risk Assessment | Active | Baseline | Kill thresholds |
| [[03-Agents/Innovation-Lead/Agent Profile\|Innovation Lead]] | Innovation | Active | Baseline | Moonshot opportunities |
| [[03-Agents/Coordinator/Agent Profile\|Coordinator]] | Decision Synthesis | Active | - | Board synthesizer |
| [[03-Agents/CEO/Agent Profile\|CEO]] | Execution | Active | - | Strategy implementer |

*All agents have persistent memory and will improve over time!*

---

## 📈 Learning Progress

### Intelligence Database
- **Market Patterns:** 0 patterns (will grow)
- **Technical Knowledge:** 0 build patterns (will grow)
- **Marketing Intelligence:** 0 channel insights (will grow)
- **Financial Models:** 0 ROI models (will grow)

*Intelligence compounds over time as agents learn!*

### Recent Learnings
*Check back after first ventures complete*

---

## 🔴 Human Oversight

### Active Requests
*Check `06-Human-Requests/Active/` for agent escalations*

### How to Respond
```bash
# View requests
node moltbot.mjs tui --session agent:human:main

# Or check this folder for new .md files
```

---

## 🎓 Quick Insights

### System Status
- ✅ Memory system active (all agents have MEMORY.md)
- ✅ Learning cycles scheduled (weekly/monthly)
- ✅ Human interface ready
- ✅ Obsidian sync configured

### What to Expect
1. **First board meeting** → Opportunity selected
2. **CEO execution** → Workers spawned, building starts
3. **Ongoing updates** → Venture progress synced here
4. **Learning accumulation** → Patterns emerge over time

---

## 🔗 Quick Navigation

### By Category
- [[01-Board-Meetings/2026/01-January/|Board Meetings]] - All strategic decisions
- [[02-Ventures/Active/|Active Ventures]] - Currently building
- [[03-Agents/CEO/Agent Profile|Agents]] - Performance and intelligence
- [[05-Learnings/What-Worked/|Learnings]] - What works, what doesn't

### By Intelligence Type
- [[04-Intelligence/Market-Research/|Market Research]] - Opportunities & validation
- [[04-Intelligence/Technical-Knowledge/|Technical Knowledge]] - Build patterns
- [[04-Intelligence/Marketing-Intelligence/|Marketing Intelligence]] - Channel performance
- [[04-Intelligence/Financial-Intelligence/|Financial Intelligence]] - ROI models

### Meta
- [[07-Meta/System Evolution|System Evolution]] - How AgentForge improves
- [[07-Meta/Board Dynamics|Board Dynamics]] - Decision-making patterns
- [[07-Meta/Strategic Wisdom|Strategic Wisdom]] - Accumulated meta-learnings

---

## 📖 How to Use This Vault

### Daily Audit
1. Check this dashboard for portfolio status
2. Review recent board meetings for new decisions
3. Check active ventures for progress updates
4. Review human requests if any

### Weekly Review
1. Review agent performance trends
2. Check learning accumulation
3. Identify patterns in successes/failures
4. Review financial performance

### Deep Dives
1. Use **Graph View** to see connections between ventures
2. Use **Search** to find patterns (e.g., "all SaaS ventures")
3. Use **Tags** to filter by category
4. Use **Dataview** queries (if plugin installed) for analytics

### Examples
```dataview
TABLE budget, revenue, roi
FROM "02-Ventures"
WHERE status = "active"
SORT roi DESC
```

---

## 🚀 Getting Started

**First time here?**
1. Read this dashboard
2. Wait for first board meeting (9am daily)
3. Watch `01-Board-Meetings/` for new notes
4. Track venture execution in `02-Ventures/`
5. See agents improve in `03-Agents/`

**Want to see agent memory directly?**
- Agent MEMORY.md files: `~/.moltbot/agents/<agent-name>/MEMORY.md`
- This vault syncs from there automatically

**Want to interact?**
```bash
# Trigger board meeting manually
./scripts/board-meeting.sh

# Monitor in real-time
node moltbot.mjs tui --session agent:coordinator:main

# View CEO execution
node moltbot.mjs tui --session agent:ceo:main
```

---

*This vault automatically syncs with AgentForge agent memory. All intelligence, decisions, and learnings will appear here for easy human auditing.*
