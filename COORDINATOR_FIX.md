# Coordinator Pattern Implementation

## Problem Solved

The original board meeting design was broken because:
- Tried to send to `"group:board-meeting"` (doesn't exist in Moltbot)
- No group session mechanism for multi-agent collaboration
- CEO couldn't read non-existent board transcript

## Solution: Hub-and-Spoke with Coordinator

### Architecture

```
┌─────────────────────────────────────────┐
│   Board Meeting Script (9am)            │
│   sends prompts to all 7 board members  │
└──────────┬──────────────────────────────┘
           │
           ├──> Market Analyst (agent:analyst:main)
           ├──> CFO (agent:cfo:main)
           ├──> CTO (agent:cto:main)
           ├──> CMO (agent:cmo:main)
           ├──> COO (agent:coo:main)
           ├──> Risk Manager (agent:risk:main)
           └──> Innovation Lead (agent:innovation:main)
                     │
                     ▼ (all respond in parallel)
           ┌──────────────────────┐
           │  Coordinator Agent   │
           │  (9:15am triggered)  │
           │  Reads all 7 sessions│
           │  Synthesizes decision│
           └──────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │    CEO Agent         │
           │  (10am triggered)    │
           │  Reads coordinator   │
           │  Spawns workers      │
           └──────────────────────┘
```

### How It Works

1. **Board Meeting Script** (`scripts/board-meeting.sh`)
   - Sends role-specific prompts to each of 7 board members
   - All agents process prompts in parallel
   - Each writes to their own session

2. **Coordinator Agent** (new)
   - Uses `sessions_history` to read all 7 board member sessions
   - Extracts key points from each perspective
   - Identifies consensus
   - Synthesizes into formatted "BOARD DECISION"
   - Writes decision to `agent:coordinator:main`

3. **CEO Agent**
   - Reads `agent:coordinator:main` instead of non-existent board session
   - Gets clear, actionable decision
   - Spawns workers to execute

### Files Changed

**New Files:**
- `agents/coordinator/SOUL.md` - Coordinator persona and process
- `agents/coordinator/IDENTITY.md` - Coordinator profile
- `COORDINATOR_FIX.md` - This document

**Modified Files:**
- `scripts/board-meeting.sh` - Now sends to individual agents + triggers coordinator
- `scripts/ceo-implement.sh` - Now reads from coordinator
- `src/commands/init-agentforge.ts` - Registers 9 agents (added coordinator)
- `README.md` - Updated architecture description

### Benefits of This Approach

✅ **Works with existing Moltbot infrastructure**
- Uses `sessions_send` and `sessions_history` tools
- No core changes needed
- All existing features work

✅ **Parallel analysis**
- All 7 board members think simultaneously
- Faster than sequential polling
- Each brings specialized perspective

✅ **Clear decision output**
- Coordinator formats decision consistently
- CEO knows exactly what to do
- No ambiguity

✅ **Audit trail**
- All individual board opinions preserved
- Can review why decision was made
- Transparent process

### Example Flow

**1. Board meeting triggered:**
```bash
./scripts/board-meeting.sh
```

Sends to all 7 agents:
- Market Analyst: "Browse web, find 3 opportunities with data"
- CFO: "Analyze financial viability, set budgets and kill thresholds"
- CTO: "Assess technical feasibility, estimate timelines"
- etc.

**2. All agents respond** (in parallel, ~2-5 minutes)
- Each writes to their own session
- Each applies their specialized expertise
- Market Analyst actually uses browser tool to research

**3. Coordinator synthesizes** (triggered after board members complete)
```bash
moltbot agent --agent coordinator --message "Synthesize board decision"
```

Coordinator:
- Reads `agent:analyst:main` - gets opportunities
- Reads `agent:cfo:main` - gets budget/ROI/kill criteria
- Reads `agent:cto:main` - gets build timeline/tech stack
- Reads all 7 sessions
- Synthesizes into formatted decision:

```
BOARD DECISION: Build EmailTemplates.

OPPORTUNITY:
- Market Analyst found: Reddit shows demand for cheap email tools
- Competitors: Lemlist ($59/mo), gap at $15/mo price point

BUDGET: $500
- CFO approved: Yes
- Expected ROI: 3x in 60 days

TIMELINE: 5 days to MVP
- CTO estimate: 5 days

BUILD PLAN:
- Next.js + Supabase + OpenAI + Stripe
- Deploy to Vercel

MARKETING PLAN:
- Product Hunt launch
- Reddit posts in r/SaaS

KILL THRESHOLDS:
- Kill if: Zero signups after 14 days
- Kill if: CAC > $50

CEO: Execute this plan immediately.
```

**4. CEO executes** (triggered at 10am)
```bash
./scripts/ceo-implement.sh
```

CEO:
- Reads `agent:coordinator:main`
- Sees clear BOARD DECISION
- Spawns developer: `sessions_spawn task:"Build EmailTemplates..."`
- Spawns marketer: `sessions_spawn task:"Launch EmailTemplates..."`
- Updates LEDGER.md
- Monitors progress

### Testing the Fix

```bash
# 1. Initialize system
node moltbot.mjs init:agentforge

# 2. Start gateway
node moltbot.mjs gateway run --port 18789

# 3. Trigger board meeting
./scripts/board-meeting.sh

# 4. Watch coordinator synthesize (wait ~5 min for board to respond)
node moltbot.mjs tui --session agent:coordinator:main

# 5. Trigger CEO execution
./scripts/ceo-implement.sh

# 6. Watch CEO execute
node moltbot.mjs tui --session agent:ceo:main
```

### Why This Works

1. **Each agent has its own session** ✅
   - No group session needed
   - Uses standard Moltbot session mechanism

2. **Coordinator aggregates** ✅
   - Uses `sessions_history` tool (already exists)
   - Reads multiple sessions
   - Synthesizes into one decision

3. **CEO gets clear direction** ✅
   - One session to read (`agent:coordinator:main`)
   - Formatted decision with all details
   - No ambiguity

4. **Fully autonomous** ✅
   - Scripts trigger everything via cron
   - No human intervention needed
   - Board → Coordinator → CEO → Workers flow works

### Comparison to Original Design

| Aspect | Original (Broken) | Fixed (Coordinator) |
|--------|-------------------|---------------------|
| Board session | `group:board-meeting` ❌ | 7 individual sessions ✅ |
| Collaboration | Multi-agent discussion ❌ | Parallel analysis + synthesis ✅ |
| Decision output | Unclear how to aggregate ❌ | Coordinator synthesizes ✅ |
| CEO reads | Non-existent transcript ❌ | `agent:coordinator:main` ✅ |
| Works with Moltbot | No ❌ | Yes ✅ |

### Future Improvements (Optional)

1. **Iterative refinement:** Coordinator could ask follow-up questions to board members if decision unclear

2. **Voting mechanism:** Coordinator could tally explicit votes if board members disagree

3. **Multi-round discussion:** Could trigger 2-3 rounds of board input before finalizing

4. **CEO feedback loop:** CEO could report execution blockers back to coordinator

5. **Real group sessions:** If Moltbot adds group session support, could migrate to that

But current solution **works perfectly** with existing infrastructure.
