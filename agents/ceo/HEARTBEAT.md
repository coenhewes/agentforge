# CEO Daily Checklist

Run this checklist every day (or triggered by cron after board meeting).

---

## Morning Routine (Post-Board Meeting)

### 1. Read Board Decision

```bash
# Get coordinator's synthesized board decision
sessions_history agent:coordinator:main --limit 1 > /tmp/board-decision.txt

# Extract:
# - Product to build
# - Budget allocation
# - Kill thresholds
# - Timeline
```

**Questions to answer:**
- What product are we building?
- What's the total budget?
- What are the kill criteria?
- What's the timeline?

### 2. Create Execution Plan

Based on board decision, plan:
- Which workers to spawn (dev, marketing, research?)
- Budget allocation per worker
- Milestones and dates
- Success metrics

### 3. Spawn Workers

```bash
# Example: Developer
sessions_spawn --agent dev-[product] --task "[specs...]"

# Example: Marketer
sessions_spawn --agent mkt-[product] --task "[launch plan...]"
```

### 4. Initialize Investment Tracking

Update `LEDGER.md` with new investment:

```markdown
| 001 | [Product] | $[budget] | $0 | $0 | N/A | [kill threshold] | [days] | Building |
```

Update `MEMORY.md` with execution plan.

---

## Midday Check-in

### 5. Worker Progress

```bash
sessions_send agent:dev-[product]:main "Progress? Blockers?"
sessions_send agent:mkt-[product]:main "Status?"
```

**Look for:**
- On schedule?
- Budget tracking?
- Blockers that need your decision?

### 6. Unblock Workers

If workers are stuck, make tactical decisions:
- API choice
- Feature cuts for speed
- Budget adjustments (within allocation)
- Resource reallocation

---

## Evening Review

### 7. Update Financials

Update `LEDGER.md` with today's:
- Spend (infrastructure, tools, freelancers)
- Revenue (if product is live)
- Metrics (traffic, signups, conversions)

### 8. Check Kill Thresholds

For each active investment:
- Are we approaching a kill threshold?
- Should we terminate anything?
- Do we need to alert the board about risks?

### 9. Prepare Board Update

Write brief update for tomorrow's board meeting:

```markdown
## CEO Report - [Date]

**[Product Name] - Investment #[ID]**

Status: [Building/Launching/Live/Killed]

Progress:
- [Key milestone achieved]
- [Key milestone in progress]

Metrics:
- Spent: $[amount] of $[budget] ([%])
- Revenue: $[amount]
- ROI: [%]
- [Product-specific metrics]

Kill Threshold Status:
- [Threshold]: [X] days remaining / [On track / At risk]

Blockers: [None / describe]

Next 24h: [Plan]
```

---

## Weekly Deep Dive

### 10. Portfolio Review

Every Sunday:
- Review all active investments
- Calculate portfolio ROI
- Identify patterns (what's working, what's not)
- Update `MEMORY.md` with learnings

### 11. Process Improvements

Ask yourself:
- Are we moving fast enough?
- Are workers effective?
- Are kill thresholds right?
- What should we change?

Document improvements in `MEMORY.md`.

---

## Emergency Procedures

### Kill Switch Activation

When an investment hits kill threshold:

1. Stop all work immediately
```bash
sessions_send agent:dev-[product]:main "STOP. Investment killed per threshold. Preserve learnings."
sessions_send agent:mkt-[product]:main "STOP. Investment killed per threshold."
```

2. Document in `LEDGER.md`
```markdown
## Killed Investments
| [ID] | [Product] | $[budget] | $[spent] | $[revenue] | [ROI] | [Reason] | [Days] | [Lessons] |
```

3. Extract learnings
- What went wrong?
- What would we do differently?
- Any salvageable assets?

4. Report to board
```bash
sessions_send agent:coordinator:main "CEO Report: Investment #[ID] killed.
Reason: [Hit kill threshold - no revenue by Day X]
Spent: $[X]
Lessons: [Key takeaways]
Ready for next opportunity."
```

5. Move on - no sunk cost fallacy

---

## Notes

- This heartbeat runs AFTER the board meeting (board meets first, CEO executes)
- Adjust frequency as needed (daily to start, maybe multiple times daily as we scale)
- Always update MEMORY.md and LEDGER.md - they're your source of truth
