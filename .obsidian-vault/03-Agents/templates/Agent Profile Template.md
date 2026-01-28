---
agent: {{agent_name}}
role: {{role}}
status: active
joined: {{date}}
tags: [agent, {{role_tag}}]
---

# {{Agent Name}} - {{Role}}

> **Status:** 🟢 Active | **Decisions Made:** {{decision_count}} | **Current Accuracy:** {{accuracy}}%

---

## Role & Responsibilities

{{role_description}}

**Key Skills:**
- {{skill_1}}
- {{skill_2}}
- {{skill_3}}

---

## Current Performance

### Prediction Accuracy

**Overall Accuracy:** {{overall_accuracy}}%

| Timeframe | Accuracy | Trend |
|-----------|----------|-------|
| Month 1 | {{month1_accuracy}}% | Baseline |
| Month 3 | {{month3_accuracy}}% | {{trend_3}} |
| Month 6 | {{month6_accuracy}}% | {{trend_6}} |
| Current | {{current_accuracy}}% | {{trend_current}} |

**Improvement Rate:** {{improvement_rate}}% per month

### Key Metrics

| Metric | Value | All-Time Best | Trend |
|--------|-------|---------------|-------|
| Predictions Made | {{predictions}} | - | {{trend}} |
| Average Accuracy | {{accuracy}}% | {{best_accuracy}}% | {{trend}} |
| Patterns Learned | {{patterns}} | - | {{trend}} |
| Ventures Evaluated | {{ventures}} | - | {{trend}} |

---

## Skill Evolution

### 📈 Improving
{{#each improving_skills}}
- **{{name}}** - {{description}} ({{improvement}}% improvement)
{{/each}}

### 📚 Still Learning
{{#each learning_skills}}
- **{{name}}** - {{description}} ({{status}})
{{/each}}

### 🎯 Mastered
{{#each mastered_skills}}
- **{{name}}** - {{description}}
{{/each}}

---

## Memorable Moments

### 🎯 Most Accurate Prediction
**Venture:** [[02-Ventures/{{most_accurate_venture}}|{{most_accurate_name}}]]
**Prediction:** {{most_accurate_prediction}}
**Actual:** {{most_accurate_actual}}
**Accuracy:** {{most_accurate_accuracy}}%

**Why it worked:** {{most_accurate_reason}}

### 🤔 Biggest Miss
**Venture:** [[02-Ventures/{{biggest_miss_venture}}|{{biggest_miss_name}}]]
**Prediction:** {{biggest_miss_prediction}}
**Actual:** {{biggest_miss_actual}}
**Accuracy:** {{biggest_miss_accuracy}}%

**What was learned:** {{biggest_miss_learning}}

### 💡 Key Learning Moment
**Date:** {{learning_moment_date}}
**Context:** {{learning_moment_context}}
**Insight:** {{learning_moment_insight}}
**Applied to:** [[02-Ventures/{{applied_venture}}|{{applied_name}}]]

---

## Intelligence Database

### Patterns Recognized
Total: {{total_patterns}}

**Top Patterns:**
{{#each top_patterns}}
- [[04-Intelligence/{{folder}}/{{file}}|{{pattern_name}}]] ({{applications}} applications)
{{/each}}

### Recent Learnings
{{#each recent_learnings}}
- [[05-Learnings/{{folder}}/{{file}}|{{learning_title}}]] ({{date}})
{{/each}}

---

## Board Collaboration

### Contribution Quality

| Metric | Score | Notes |
|--------|-------|-------|
| Insight Depth | {{insight_score}}/10 | {{insight_notes}} |
| Data Quality | {{data_score}}/10 | {{data_notes}} |
| Decision Impact | {{impact_score}}/10 | {{impact_notes}} |

### Influence on Decisions
- **Strong Influence:** {{strong_influence_count}} decisions
- **Moderate Influence:** {{moderate_influence_count}} decisions
- **Dissenting Opinion:** {{dissent_count}} decisions

**Most Influential Decision:** [[01-Board-Meetings/{{influential_meeting}}|{{influential_date}}]]

---

## Recent Activity

### Last 10 Board Meetings
{{#each recent_meetings}}
- [[01-Board-Meetings/{{path}}|{{date}}]] - {{contribution}}
{{/each}}

### Current Focus
{{current_focus}}

---

## Memory Snapshot

**Direct Memory Access:** `~/.moltbot/agents/{{agent_dir}}/MEMORY.md`

### Memory Statistics
- **Total Entries:** {{memory_entries}}
- **Last Updated:** {{memory_updated}}
- **Memory Size:** {{memory_size}}

### Top Memory Sections
{{#each memory_sections}}
- **{{section_name}}** - {{entry_count}} entries
{{/each}}

---

## Performance Trends

### Accuracy Over Time

```chart
type: line
labels: [Month 1, Month 2, Month 3, Month 4, Month 5, Month 6]
series:
  - title: Prediction Accuracy
    data: [{{m1}}, {{m2}}, {{m3}}, {{m4}}, {{m5}}, {{m6}}]
```

### Predictions vs Actuals

| Venture | Your Prediction | Actual | Accuracy |
|---------|-----------------|--------|----------|
{{#each predictions}}
| [[02-Ventures/{{venture}}|{{name}}]] | {{prediction}} | {{actual}} | {{accuracy}}% |
{{/each}}

---

## Links & References

**Board Meetings:** [[01-Board-Meetings/2026/|All Meetings]]
**Ventures Evaluated:** [[02-Ventures/|All Ventures]]
**Your Intelligence:** [[04-Intelligence/{{intelligence_folder}}/|Your Knowledge Base]]
**Your Learnings:** [[05-Learnings/Predictions-vs-Actuals/{{name}} Accuracy|Your Accuracy Tracking]]

**Other Agents:**
{{#each other_agents}}
- [[03-Agents/{{agent}}/Agent Profile|{{name}}]]
{{/each}}

---

## Meta-Insights

### Your Evolution
{{evolution_summary}}

### Strategic Value
{{strategic_value}}

### Future Goals
{{#each future_goals}}
- {{goal}}
{{/each}}

---

*This agent profile is auto-generated from MEMORY.md and session history. Updates reflect real-time learning and improvement.*
