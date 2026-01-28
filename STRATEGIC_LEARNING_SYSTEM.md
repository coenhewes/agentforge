# Strategic Learning System - Memory & Continuous Improvement

## Overview

AgentForge agents learn and improve over time through persistent memory, reflection, and pattern recognition. This system ensures the Board, CEO, and Coordinator get smarter with every decision.

---

## Memory Architecture

### Three-Layer Memory System

1. **MEMORY.md** - Long-term curated intelligence
   - Strategic learnings
   - Patterns and principles
   - Historical performance
   - Meta-wisdom

2. **memory/YYYY-MM-DD.md** - Daily operational logs
   - Day-to-day decisions
   - Immediate context
   - Running notes
   - Quick references

3. **Session Transcripts** - Full conversation history
   - Complete interaction history
   - Searchable via `memory_search`
   - Automatic backup

### Memory Tools Available

- `memory_search` - Semantic search across all memory
- `memory_get` - Read specific memory snippets
- `bash` - Read/write memory files directly

---

## Learning Cycle

### Daily Learning (Automated)

**After Each Board Meeting:**
```bash
# 1. Each board member reflects
memory_search "similar opportunities to [today's venture]"
# Read past similar decisions, outcomes

# 2. Update MEMORY.md with:
- Today's decision and rationale
- Comparison to past similar decisions
- Expected outcomes for later validation

# 3. Coordinator synthesizes
memory_search "past board meeting patterns"
# Learn from decision synthesis history
```

**After Each CEO Execution:**
```bash
# CEO reflects
memory_search "similar projects to [current project]"
# Learn from past execution patterns

# Update MEMORY.md with:
- Worker spawning patterns
- Budget tracking
- Progress notes
```

### Weekly Learning (Reflection)

**Every Sunday (via cron):**
```bash
# Each agent runs weekly reflection
node moltbot.mjs agent --agent [agent-id] --message "
WEEKLY REFLECTION:

1. Review this week's decisions/actions in memory/
2. Compare predictions vs actuals
3. Update MEMORY.md with learnings:
   - What worked well this week?
   - What didn't work?
   - What patterns emerged?
   - How to improve next week?

Use memory_search to find relevant past patterns.
"
```

### Monthly Learning (Meta-Analysis)

**First of Each Month:**
```bash
# Board-wide meta-learning
# Each board member:
memory_search "month-over-month performance trends"

# Update MEMORY.md with:
- Skill evolution (improving/struggling)
- Process improvements
- Strategic adjustments
- Meta-wisdom updates
```

---

## Learning Patterns by Agent

### CEO Learning

**What to Track:**
- Investment success rate
- Worker management effectiveness
- Budget adherence
- Kill decision accuracy

**How to Learn:**
```bash
# Before spawning workers:
memory_search "similar project worker allocation"
memory_get "MEMORY.md" --from 40 --lines 20  # Active Workers section

# After project completion:
# Update MEMORY.md:
- Actual vs predicted spend
- Actual vs predicted timeline
- What worked/didn't work
- Adjust future spawning patterns
```

**Improvement Focus:**
- Get better at estimating resource needs
- Learn which worker combinations work
- Improve kill decision timing
- Optimize budget allocation

### Board Member Learning

**Market Analyst:**
```bash
# Before research:
memory_search "validation methods that worked"
memory_search "research sources reliable"

# After presentation:
# Update MEMORY.md:
- Which sources were most valuable
- What data convinced the board
- Research time efficiency
- Blind spots discovered
```

**CFO:**
```bash
# Before analysis:
memory_search "similar venture ROI predictions"
memory_search "cost patterns by tech stack"

# After investment period:
# Update MEMORY.md:
- Actual vs predicted ROI
- Actual vs predicted costs
- Kill threshold accuracy
- Portfolio performance
```

**CTO:**
```bash
# Before assessment:
memory_search "similar tech stack outcomes"
memory_search "timeline estimation patterns"

# After build:
# Update MEMORY.md:
- Actual vs predicted timeline
- Tech stack performance
- Complexity assessment accuracy
- Developer productivity
```

**CMO:**
```bash
# Before strategy:
memory_search "channel performance by product type"
memory_search "messaging that resonated"

# After campaign:
# Update MEMORY.md:
- Actual vs predicted CAC
- Channel performance
- Conversion rate accuracy
- Audience insights
```

**COO:**
```bash
# Before planning:
memory_search "execution bottlenecks"
memory_search "resource allocation patterns"

# After execution:
# Update MEMORY.md:
- Actual vs predicted timeline
- Bottlenecks encountered
- Resource efficiency
- Process improvements
```

**Risk Manager:**
```bash
# Before assessment:
memory_search "risk patterns in similar ventures"
memory_search "kill threshold effectiveness"

# After risk event:
# Update MEMORY.md:
- Predicted vs actual risks
- Kill threshold accuracy
- Portfolio balance
- Risk mitigation effectiveness
```

**Innovation Lead:**
```bash
# Before proposal:
memory_search "moonshot success patterns"
memory_search "trend validation history"

# After moonshot outcome:
# Update MEMORY.MD:
- Trend prediction accuracy
- Moonshot success rate
- Innovation balance
- Timing patterns
```

### Coordinator Learning

```bash
# Before synthesis:
memory_search "past board meeting patterns"
memory_search "deadlock resolution strategies"

# After synthesis:
# Update MEMORY.md:
- Decision quality
- Synthesis effectiveness
- Board member insights
- Communication improvements
```

---

## Reflection Prompts

### Daily Reflection (Built into workflow)

**For Board Members:**
```
After providing your analysis:
1. How does this compare to similar past decisions?
2. What new patterns did you notice?
3. What would you do differently next time?
4. Update relevant section of MEMORY.md with learnings.
```

**For CEO:**
```
At end of day:
1. Review LEDGER.md - any surprises?
2. Check worker progress - on track?
3. Compare to memory_search results from similar projects
4. Update MEMORY.md with new insights
```

**For Coordinator:**
```
After each board meeting:
1. Was this synthesis clear and actionable?
2. How did this decision compare to past similar ones?
3. What could improve future syntheses?
4. Update MEMORY.md with decision patterns
```

### Weekly Reflection (Cron job)

```bash
#!/bin/bash
# scripts/weekly-reflection.sh

AGENTS=("analyst" "cfo" "cto" "cmo" "coo" "risk" "innovation" "coordinator" "ceo")

for agent in "${AGENTS[@]}"; do
  node moltbot.mjs agent --agent "$agent" --message "
WEEKLY REFLECTION - $(date +%Y-%m-%d)

Please review your work this week and update your MEMORY.md:

1. Search your memory for this week's activities:
   memory_search 'this week [your role] decisions'

2. Compare predictions vs actuals:
   - What did you predict correctly?
   - What did you miss?
   - What patterns emerged?

3. Update MEMORY.md sections:
   - Add this week's learnings to relevant sections
   - Update accuracy tracking
   - Note process improvements
   - Add any new principles learned

4. Identify one improvement for next week

Reply NO_REPLY when done.
  " > /tmp/agentforge-reflection-$agent.log 2>&1 &
done

wait
echo "Weekly reflection complete"
```

### Monthly Meta-Learning (Cron job)

```bash
#!/bin/bash
# scripts/monthly-learning.sh

AGENTS=("analyst" "cfo" "cto" "cmo" "coo" "risk" "innovation" "coordinator" "ceo")

for agent in "${AGENTS[@]}"; do
  node moltbot.mjs agent --agent "$agent" --message "
MONTHLY META-LEARNING - $(date +%Y-%m-%d)

Please perform deep analysis of your performance:

1. Search for month-over-month trends:
   memory_search 'prediction accuracy month'
   memory_search 'skill evolution'

2. Analyze your effectiveness:
   - Prediction accuracy trends (improving/degrading?)
   - Common blind spots
   - Skill development areas
   - Process maturity

3. Update META sections in MEMORY.md:
   - Meta-[Role] Wisdom
   - Long-Term Learning
   - Principles Learned

4. Identify 2-3 focus areas for next month

Reply NO_REPLY when done.
  " > /tmp/agentforge-metalearning-$agent.log 2>&1 &
done

wait
echo "Monthly meta-learning complete"
```

---

## Prediction vs Actual Tracking

### Template for Predictions

**Before Any Decision:**
```markdown
## Prediction Log

### [Venture Name] - [Date]

**Predicted:**
- Timeline: X weeks
- Budget: $Y
- ROI: Z%
- Risk Level: Low/Medium/High
- Key Success Factors: [list]

**Rationale:** [why these predictions]

**Update Later:** [date to check]
```

**After Outcome:**
```markdown
### [Venture Name] - ACTUAL

**Actual:**
- Timeline: A weeks (predicted: X)
- Budget: $B (predicted: $Y)
- ROI: C% (predicted: Z%)
- Outcome: Success/Failure

**Accuracy:**
- Timeline: [X% off]
- Budget: [Y% off]
- ROI: [Z% off]

**Learnings:**
1. What was accurate and why
2. What was inaccurate and why
3. How to improve future predictions
```

---

## Cross-Agent Learning

### Board Shares Intelligence

**Pattern:** Each board member updates their MEMORY.md, others can search it

```bash
# CFO searching for marketing insights:
memory_search "CAC by channel" --agent cmo

# CTO searching for risk patterns:
memory_search "technical risk indicators" --agent risk

# CEO searching for board wisdom:
memory_search "successful venture patterns" --agent coordinator
```

### CEO Learns from Board

**Before Execution:**
```bash
# CEO reads board member memories for context
memory_search "similar technical challenges" --agent cto
memory_search "marketing channel performance" --agent cmo
memory_search "operational bottlenecks" --agent coo
```

### Coordinator Synthesizes Collective Learning

**Monthly:**
```bash
# Coordinator aggregates board learnings
memory_search "all board members month summary"
# Synthesize cross-cutting patterns
# Update MEMORY.md with board-wide insights
```

---

## Memory Maintenance

### Daily (Automatic)

- Agents write to `memory/YYYY-MM-DD.md` as they work
- Automatic pre-compaction memory flush
- Session transcripts auto-saved

### Weekly (Semi-Automatic)

- Reflection script triggers memory updates
- Agents consolidate daily logs into MEMORY.md
- Pattern recognition across week's work

### Monthly (Manual)

- Review MEMORY.md structure
- Archive old daily logs if needed
- Ensure meta-learning sections updated

---

## Success Metrics

### Agent Intelligence Growth

**Track Over Time:**
1. **Prediction Accuracy** - Getting better at forecasts?
2. **Pattern Recognition** - Finding insights faster?
3. **Process Efficiency** - Executing more smoothly?
4. **Strategic Wisdom** - Making better decisions?

### Portfolio Learning

**Track Over Time:**
1. **Success Rate** - More ventures succeeding?
2. **ROI** - Returns improving?
3. **Kill Accuracy** - Better at cutting losses?
4. **Time to Market** - Getting faster?

---

## Implementation Checklist

✅ MEMORY.md files created for all 9 agents
✅ Memory structure defined (daily/weekly/monthly)
✅ Learning prompts documented
✅ Reflection scripts created
✅ Prediction tracking templates provided
✅ Cross-agent learning patterns defined

**Next:** Update SOUL.md files with memory usage instructions

---

## Notes

- Memory system is always-on (no configuration needed)
- Agents automatically have access to memory tools
- Memory search uses semantic similarity (not just keywords)
- All memory is persistent across restarts
- Memory grows smarter over time as patterns accumulate
- Board collectively gets wiser through shared intelligence
