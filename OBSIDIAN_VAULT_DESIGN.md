# Obsidian Vault Integration - Design

## Overview

Sync all AgentForge intelligence to an Obsidian vault for human auditing, exploration, and oversight.

---

## Vault Structure

```
.obsidian-vault/
├── 00-Dashboard/
│   ├── Dashboard.md                 # Main entry point
│   ├── Portfolio Overview.md        # Active ventures
│   ├── Financial Summary.md         # Money in/out
│   └── Learning Progress.md         # Agent improvement tracking
│
├── 01-Board-Meetings/
│   ├── 2026/
│   │   ├── 01-January/
│   │   │   ├── 2026-01-28 Board Meeting.md
│   │   │   └── 2026-01-29 Board Meeting.md
│   │   └── 02-February/
│   └── templates/
│       └── Board Meeting Template.md
│
├── 02-Ventures/
│   ├── Active/
│   │   ├── EmailTemplates.md
│   │   └── TaskTracker.md
│   ├── Completed/
│   │   └── FirstVenture.md
│   ├── Killed/
│   │   └── FailedIdea.md
│   └── templates/
│       └── Venture Template.md
│
├── 03-Agents/
│   ├── CEO/
│   │   ├── Agent Profile.md
│   │   ├── Memory Snapshot.md
│   │   └── Performance Metrics.md
│   ├── Coordinator/
│   ├── Market-Analyst/
│   ├── CFO/
│   ├── CTO/
│   ├── CMO/
│   ├── COO/
│   ├── Risk-Manager/
│   └── Innovation-Lead/
│
├── 04-Intelligence/
│   ├── Market-Research/
│   │   ├── SaaS Market.md
│   │   ├── Marketplace Trends.md
│   │   └── Research Sources.md
│   ├── Technical-Knowledge/
│   │   ├── Tech Stack Patterns.md
│   │   ├── Timeline Estimates.md
│   │   └── Build Complexity.md
│   ├── Marketing-Intelligence/
│   │   ├── Channel Performance.md
│   │   ├── CAC by Channel.md
│   │   └── Messaging Patterns.md
│   └── Financial-Intelligence/
│       ├── ROI Patterns.md
│       ├── Cost Intelligence.md
│       └── Kill Thresholds.md
│
├── 05-Learnings/
│   ├── What-Worked/
│   │   ├── Successful Patterns.md
│   │   └── Best Practices.md
│   ├── What-Failed/
│   │   ├── Failure Patterns.md
│   │   └── Mistakes to Avoid.md
│   └── Predictions-vs-Actuals/
│       ├── CFO Accuracy.md
│       ├── CTO Accuracy.md
│       └── CMO Accuracy.md
│
├── 06-Human-Requests/
│   ├── Active/
│   │   └── REQ-ABC123.md
│   ├── Resolved/
│   │   └── REQ-XYZ789.md
│   └── templates/
│       └── Human Request Template.md
│
└── 07-Meta/
    ├── System Evolution.md
    ├── Board Dynamics.md
    ├── Process Improvements.md
    └── Strategic Wisdom.md
```

---

## Document Templates

### Board Meeting Template

```markdown
---
date: {{date}}
meeting_number: {{number}}
duration: {{duration}}
status: completed
tags: [board-meeting, {{year}}, {{month}}]
---

# Board Meeting - {{date}}

## Meeting Summary

**Opportunity Selected:** [[Venture Name]]
**Budget:** ${{budget}}
**Expected Timeline:** {{timeline}}
**Expected ROI:** {{roi}}%

## Board Member Input

### Market Analyst
- **Market Size:** {{market_size}}
- **Competition:** {{competition}}
- **Customer Pain:** {{pain_points}}
- **Validation:** [[Research Source]]

### CFO
- **Budget:** ${{budget}}
- **Expected Revenue:** ${{revenue}}
- **ROI:** {{roi}}%
- **Kill Threshold:** {{threshold}}

### CTO
- **Timeline:** {{timeline}} days
- **Complexity:** {{complexity}}
- **Tech Stack:** {{stack}}
- **Risk:** {{tech_risk}}

### CMO
- **Primary Channel:** {{channel}}
- **Expected CAC:** ${{cac}}
- **Marketing Plan:** {{plan}}

### COO
- **Execution Plan:** {{exec_plan}}
- **Resources Needed:** {{resources}}
- **Bottlenecks:** {{bottlenecks}}

### Risk Manager
- **Risk Level:** {{risk_level}}
- **Key Risks:** {{risks}}
- **Kill Switch:** {{kill_switch}}

### Innovation Lead
- **Innovation Score:** {{innovation}}/10
- **Trend Alignment:** {{trend}}
- **Moonshot Potential:** {{moonshot}}

## Coordinator Decision

[[Coordinator's synthesized decision]]

## Links
- Venture: [[{{venture_name}}]]
- Previous Meeting: [[{{prev_meeting}}]]
- Next Meeting: [[{{next_meeting}}]]
```

### Venture Template

```markdown
---
venture: {{name}}
status: active|completed|killed
board_decision_date: {{date}}
launch_date: {{launch}}
budget: {{budget}}
spent: {{spent}}
revenue: {{revenue}}
roi: {{roi}}
tags: [venture, {{category}}, {{status}}]
---

# {{Venture Name}}

## Overview

**Elevator Pitch:** {{pitch}}
**Target Customer:** {{customer}}
**Problem Solved:** {{problem}}
**Solution:** {{solution}}

## Board Decision

**Approved:** [[{{board_meeting_date}}]]
**Budget:** ${{budget}}
**Timeline:** {{timeline}} days
**Expected ROI:** {{expected_roi}}%

### Why This Venture?
[[Board's rationale from meeting notes]]

## Execution Timeline

### Planning Phase
- **Start:** {{date}}
- **Completed:** {{date}}
- **Key Decisions:** {{decisions}}

### Development Phase
- **Start:** {{date}}
- **Developers:** [[Agent1]], [[Agent2]]
- **Tech Stack:** {{stack}}
- **Completed:** {{date}}
- **Actual vs Predicted:** {{variance}}

### Launch Phase
- **Launch Date:** {{date}}
- **Marketing Channel:** {{channel}}
- **Initial Results:** {{results}}

## Financial Performance

| Metric | Predicted | Actual | Variance |
|--------|-----------|--------|----------|
| Budget | ${{pred_budget}} | ${{act_budget}} | {{variance}}% |
| Revenue (30d) | ${{pred_rev_30}} | ${{act_rev_30}} | {{variance}}% |
| Revenue (60d) | ${{pred_rev_60}} | ${{act_rev_60}} | {{variance}}% |
| CAC | ${{pred_cac}} | ${{act_cac}} | {{variance}}% |
| ROI | {{pred_roi}}% | {{act_roi}}% | {{variance}}% |

## Learnings

### What Worked
- {{learning1}}
- {{learning2}}

### What Didn't Work
- {{learning1}}
- {{learning2}}

### Predictions vs Actuals
- **Market Analyst:** {{analyst_accuracy}}
- **CFO:** {{cfo_accuracy}}
- **CTO:** {{cto_accuracy}}
- **CMO:** {{cmo_accuracy}}
- **COO:** {{coo_accuracy}}

### Applied to Future Ventures
- [[Next Similar Venture]]
- [[Pattern Recognized]]

## Links
- Board Meeting: [[{{meeting}}]]
- Similar Ventures: [[{{similar1}}]], [[{{similar2}}]]
- Key Learnings: [[{{learning_doc}}]]
```

### Agent Profile Template

```markdown
---
agent: {{agent_name}}
role: {{role}}
joined: {{date}}
tags: [agent, {{role}}]
---

# {{Agent Name}} - {{Role}}

## Role & Responsibilities

{{description}}

## Current Performance

### Prediction Accuracy
- **Current:** {{current_accuracy}}%
- **Month 1:** {{month1_accuracy}}%
- **Trend:** {{trend}}

### Key Metrics
| Metric | Value | Trend |
|--------|-------|-------|
| Decisions Made | {{count}} | {{trend}} |
| Accuracy | {{accuracy}}% | {{trend}} |
| Patterns Learned | {{patterns}} | {{trend}} |

## Skill Evolution

### Improving
- {{skill1}}
- {{skill2}}

### Still Learning
- {{skill1}}
- {{skill2}}

## Memorable Predictions

### Most Accurate
[[Link to venture with best prediction]]

### Biggest Miss
[[Link to venture with worst prediction]]

### Key Learning Moment
[[Link to pivotal learning]]

## Intelligence Database

[[Link to agent's memory file]]

## Recent Activity
- [[Recent Decision 1]]
- [[Recent Decision 2]]
- [[Recent Decision 3]]
```

---

## Dashboard Template

```markdown
---
title: AgentForge Dashboard
tags: [dashboard, overview]
---

# 🏢 AgentForge Dashboard

*Last Updated: {{timestamp}}*

---

## 📊 Portfolio at a Glance

### Active Ventures: {{active_count}}
{{#each active_ventures}}
- [[{{name}}]] - Day {{days_active}} - ${{spent}}/${{budget}} spent - ${{revenue}} revenue
{{/each}}

### Financial Summary
- **Total Deployed:** ${{total_deployed}}
- **Total Revenue:** ${{total_revenue}}
- **Portfolio ROI:** {{portfolio_roi}}%
- **Success Rate:** {{success_rate}}%
- **Current Runway:** {{runway}} days

---

## 🎯 Recent Board Meetings

{{#each recent_meetings}}
- [[{{date}} Board Meeting]] → [[{{venture}}]] (Budget: ${{budget}})
{{/each}}

---

## 🤖 Agent Performance

| Agent | Predictions | Accuracy | Trend |
|-------|-------------|----------|-------|
| [[Market Analyst]] | {{count}} | {{accuracy}}% | {{trend}} |
| [[CFO]] | {{count}} | {{accuracy}}% | {{trend}} |
| [[CTO]] | {{count}} | {{accuracy}}% | {{trend}} |
| [[CMO]] | {{count}} | {{accuracy}}% | {{trend}} |
| [[COO]] | {{count}} | {{accuracy}}% | {{trend}} |
| [[Risk Manager]] | {{count}} | {{accuracy}}% | {{trend}} |
| [[Innovation Lead]] | {{count}} | {{accuracy}}% | {{trend}} |

---

## 📈 Learning Progress

### Intelligence Growth
- **Market Patterns:** {{market_patterns}} patterns learned
- **Technical Knowledge:** {{tech_patterns}} build patterns
- **Marketing Intelligence:** {{marketing_patterns}} channel insights
- **Financial Models:** {{financial_patterns}} ROI models

### Recent Learnings
{{#each recent_learnings}}
- [[{{title}}]] - {{date}}
{{/each}}

---

## 🔴 Recent Human Requests

{{#each human_requests}}
- [[{{id}}]] - {{priority}} - {{category}} - {{status}}
{{/each}}

---

## 🎓 Top Insights

### What's Working
{{#each working_patterns}}
- [[{{pattern}}]]
{{/each}}

### What's Not Working
{{#each failing_patterns}}
- [[{{pattern}}]]
{{/each}}

---

## 🔗 Quick Links

### By Category
- [[All Board Meetings]]
- [[All Ventures]]
- [[All Agents]]
- [[All Learnings]]

### By Status
- [[Active Ventures]]
- [[Completed Ventures]]
- [[Killed Ventures]]

### Intelligence
- [[Market Research]]
- [[Technical Knowledge]]
- [[Marketing Intelligence]]
- [[Financial Intelligence]]
```

---

## Sync Strategy

### What Gets Synced

**After Every Board Meeting:**
- New board meeting note
- Updated agent profiles
- Updated intelligence docs
- Dashboard refresh

**After Every Venture Update:**
- Venture status update
- Financial metrics update
- Learning extractions
- Dashboard refresh

**After Every Week:**
- Agent reflection summaries
- Performance metrics update
- Learning consolidation

**After Every Month:**
- Meta-learning summaries
- Trend analysis
- Strategic wisdom updates

### Sync Script

```bash
#!/bin/bash
# scripts/sync-to-obsidian.sh

# Syncs agent memory to Obsidian vault for human auditing
```

---

## Benefits for Humans

### Easy Auditing
- See all board decisions in chronological order
- Track ventures from idea → launch → outcome
- Compare predictions vs actuals visually

### Pattern Recognition
- Graph view shows connections between similar ventures
- Tag-based filtering (e.g., all SaaS ventures)
- Search across all knowledge

### Performance Tracking
- Agent accuracy trends over time
- Portfolio performance visualization
- Learning curve tracking

### Strategic Insights
- What patterns lead to success?
- Which agent predictions are most accurate?
- Where is the board improving?

---

## Obsidian Features We'll Use

### Linking
- `[[Board Meeting - 2026-01-28]]` → Jump to meeting
- `[[EmailTemplates]]` → Jump to venture
- `[[CFO]]` → See agent profile

### Tags
- `#venture #active` → Filter active ventures
- `#board-meeting #2026` → All 2026 meetings
- `#learning #success` → Success patterns

### Dataview (Plugin)
```dataview
TABLE budget, revenue, roi
FROM #venture
WHERE status = "active"
SORT roi DESC
```

### Graph View
- Visualize connections between decisions
- See clusters of related ventures
- Identify knowledge gaps

### Search
- Find all mentions of "SaaS"
- Find all ventures with >100% ROI
- Find CFO's accuracy improvements

---

## Implementation Plan

1. **Create vault structure** - Folders and templates
2. **Build sync script** - Extract from agent memory
3. **Initial population** - Backfill existing data
4. **Automation** - Sync after board meetings, updates
5. **Dashboard setup** - Dynamic queries via Dataview

---

## Example: Tracking a Venture Journey

**Human opens Obsidian:**
1. Sees dashboard → 3 active ventures
2. Clicks `[[EmailTemplates]]`
3. Sees: Budget $500, spent $450, revenue $1200 (ROI 167%!)
4. Clicks `[[2026-01-28 Board Meeting]]` → See original decision
5. Reads Market Analyst's research, CFO's prediction (ROI 200%)
6. Sees "CFO predicted 200%, actual 167% - only 16% off!"
7. Clicks `[[CFO]]` → See CFO is improving (was ±50% month 1, now ±20%)
8. Clicks `[[SaaS ROI Patterns]]` → See accumulated intelligence
9. Graph view shows: EmailTemplates → Similar to → TaskTracker → Both succeeded

**Result:** Human understands entire venture history in 2 minutes!

---

## Next Steps

1. Create vault structure
2. Build sync automation
3. Create templates
4. Set up dashboard with Dataview queries
5. Test with first board meeting
