---
venture: {{venture_name}}
status: active
board_decision_date: {{decision_date}}
budget: {{budget}}
spent: 0
revenue: 0
roi: 0
tags: [venture, {{category}}, {{status}}]
---

# {{Venture Name}}

> **Status:** 🟢 Active | **Day:** {{days_active}} | **Budget:** ${{spent}}/${{budget}} | **Revenue:** ${{revenue}}

---

## Overview

**Elevator Pitch:**
{{elevator_pitch}}

**Target Customer:**
{{target_customer}}

**Problem:**
{{problem}}

**Solution:**
{{solution}}

**Why Now:**
{{why_now}}

---

## Board Approval

**Approved:** [[01-Board-Meetings/{{year}}/{{month}}/{{date}} Board Meeting|{{date}} Board Meeting]]

### Board Predictions

| Board Member | Prediction | Confidence |
|--------------|------------|------------|
| **Market Analyst** | {{analyst_prediction}} | {{analyst_confidence}} |
| **CFO** | ROI: {{cfo_roi_prediction}}% | {{cfo_confidence}} |
| **CTO** | Timeline: {{cto_timeline_prediction}} days | {{cto_confidence}} |
| **CMO** | CAC: ${{cmo_cac_prediction}} | {{cmo_confidence}} |
| **COO** | {{coo_prediction}} | {{coo_confidence}} |
| **Risk Manager** | Risk: {{risk_level}}/10 | {{risk_confidence}} |
| **Innovation Lead** | Innovation: {{innovation_score}}/10 | {{innovation_confidence}} |

**Budget Allocated:** ${{budget}}
**Kill Threshold:** {{kill_threshold}}

---

## Execution Timeline

### Phase 1: Planning (Days 1-2)
- [ ] Requirements gathered
- [ ] Tech stack finalized
- [ ] Worker agents spawned

**CEO Notes:** {{ceo_planning_notes}}

### Phase 2: Development (Days 3-{{dev_end}})
- [ ] MVP built
- [ ] Testing completed
- [ ] Deployment configured

**Workers:**
- Developer 1: {{dev1_name}} ([[03-Agents/CEO/Agent Profile#Workers|View]])
- Developer 2: {{dev2_name}}
- Marketer: {{marketer_name}}

**Progress:** {{dev_progress}}

### Phase 3: Launch (Day {{launch_day}})
- [ ] Product live
- [ ] Marketing launched
- [ ] First customers acquired

**Launch Date:** {{launch_date}}
**Launch Notes:** {{launch_notes}}

### Phase 4: Validation (Days {{val_start}}-{{val_end}})
- [ ] Revenue tracking active
- [ ] Kill threshold monitoring
- [ ] Performance analysis

**Current Status:** {{validation_status}}

---

## Financial Performance

### Budget Tracking

| Category | Budgeted | Spent | Remaining |
|----------|----------|-------|-----------|
| Development | ${{dev_budget}} | ${{dev_spent}} | ${{dev_remaining}} |
| Marketing | ${{marketing_budget}} | ${{marketing_spent}} | ${{marketing_remaining}} |
| Infrastructure | ${{infra_budget}} | ${{infra_spent}} | ${{infra_remaining}} |
| **Total** | **${{budget}}** | **${{spent}}** | **${{remaining}}** |

### Revenue Tracking

| Timeframe | Predicted | Actual | Variance |
|-----------|-----------|--------|----------|
| Day 7 | ${{pred_7d}} | ${{actual_7d}} | {{variance_7d}}% |
| Day 14 | ${{pred_14d}} | ${{actual_14d}} | {{variance_14d}}% |
| Day 30 | ${{pred_30d}} | ${{actual_30d}} | {{variance_30d}}% |
| Day 60 | ${{pred_60d}} | ${{actual_60d}} | {{variance_60d}}% |

**Current ROI:** {{current_roi}}% (Predicted: {{predicted_roi}}%)

---

## Marketing Performance

### Channel Strategy
**Primary Channel:** {{primary_channel}}
**Secondary Channels:** {{secondary_channels}}

### Metrics

| Metric | Predicted | Actual | Variance |
|--------|-----------|--------|----------|
| CAC | ${{pred_cac}} | ${{actual_cac}} | {{variance_cac}}% |
| Conversion Rate | {{pred_conv}}% | {{actual_conv}}% | {{variance_conv}}% |
| Customer LTV | ${{pred_ltv}} | ${{actual_ltv}} | {{variance_ltv}}% |

---

## Technical Details

**Tech Stack:**
- {{tech_stack}}

**Timeline:**
- **Predicted:** {{predicted_timeline}} days
- **Actual:** {{actual_timeline}} days
- **Variance:** {{timeline_variance}}%

**Complexity Assessment:**
- **Predicted:** {{predicted_complexity}}
- **Actual:** {{actual_complexity}}

**Technical Challenges:**
{{technical_challenges}}

---

## Kill Threshold Monitoring

**Criteria:**
- Revenue < ${{kill_threshold_revenue}} by Day {{kill_day}}
- OR CAC > ${{kill_threshold_cac}}
- OR No traction after {{kill_threshold_days}} days

**Current Status:**
- ✅ Above kill threshold (safe)
- ⚠️ Approaching kill threshold (monitor)
- ❌ Below kill threshold (kill recommended)

**Last Check:** {{last_threshold_check}}

---

## Learnings

### What Worked ✅
{{#each working}}
- {{this}}
{{/each}}

### What Didn't Work ❌
{{#each not_working}}
- {{this}}
{{/each}}

### Predictions vs Actuals

**Most Accurate:**
- {{most_accurate_prediction}}

**Biggest Miss:**
- {{biggest_miss}}

### Apply to Future Ventures
{{#each future_applications}}
- [[05-Learnings/{{this}}|{{this}}]]
{{/each}}

---

## Agent Performance Analysis

### Prediction Accuracy

| Agent | Metric | Predicted | Actual | Accuracy |
|-------|--------|-----------|--------|----------|
| Market Analyst | Market Size | {{pred_market}} | {{actual_market}} | {{analyst_accuracy}}% |
| CFO | ROI | {{pred_roi}}% | {{actual_roi}}% | {{cfo_accuracy}}% |
| CTO | Timeline | {{pred_timeline}}d | {{actual_timeline}}d | {{cto_accuracy}}% |
| CMO | CAC | ${{pred_cac}} | ${{actual_cac}} | {{cmo_accuracy}}% |
| COO | Resources | {{pred_resources}} | {{actual_resources}} | {{coo_accuracy}}% |

**Updated Agent Intelligence:**
- [[03-Agents/CFO/Memory Snapshot|CFO Memory]] ← Updated with this venture's ROI patterns
- [[03-Agents/CTO/Memory Snapshot|CTO Memory]] ← Updated with timeline accuracy
- [[03-Agents/CMO/Memory Snapshot|CMO Memory]] ← Updated with channel performance

---

## Links & References

**Board Decision:** [[01-Board-Meetings/{{year}}/{{month}}/{{decision_date}} Board Meeting|Board Meeting]]

**Similar Ventures:**
- [[02-Ventures/{{similar_1}}|{{similar_1_name}}]]
- [[02-Ventures/{{similar_2}}|{{similar_2_name}}]]

**Intelligence:**
- [[04-Intelligence/Market-Research/{{market_doc}}|Market Research Used]]
- [[04-Intelligence/Financial-Intelligence/{{financial_doc}}|Financial Model Used]]

**Agent Sessions:**
- CEO: `~/.moltbot/agents/ceo/sessions/*.jsonl`
- Workers: `~/.moltbot/agents/workers/`

---

## Timeline

```timeline
{{decision_date}}: Board approves venture
{{planning_complete}}: Planning complete
{{dev_start}}: Development starts
{{launch_date}}: Product launches
{{milestone_1}}: {{milestone_1_desc}}
{{current_date}}: Current status
```

---

## Updates Log

### {{date_1}}
{{update_1}}

### {{date_2}}
{{update_2}}

---

*This venture note is auto-updated as CEO and workers make progress. All data synced from agent sessions and financial tracking.*
