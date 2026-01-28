# AgentForge Obsidian Vault

This vault contains all AgentForge intelligence, decisions, and learnings in a format optimized for human auditing.

## What's Inside

- **00-Dashboard/** - Main overview and quick stats
- **01-Board-Meetings/** - Every board meeting decision (chronological)
- **02-Ventures/** - Every venture from idea → launch → outcome
- **03-Agents/** - Agent profiles, performance, and memory snapshots
- **04-Intelligence/** - Accumulated knowledge (market, technical, marketing, financial)
- **05-Learnings/** - What worked, what failed, predictions vs actuals
- **06-Human-Requests/** - Agent escalations needing human input
- **07-Meta/** - System evolution, board dynamics, strategic wisdom

## How to Use

### First Time Setup

1. **Open in Obsidian:**
   - Download Obsidian: https://obsidian.md
   - Open vault: File → Open folder → Select `.obsidian-vault/`

2. **Recommended Plugins (optional):**
   - Dataview - Query vault data like a database
   - Calendar - View board meetings by date
   - Graph Analysis - Visualize connections

3. **Start Here:**
   - Open `00-Dashboard/Dashboard.md`
   - This is your command center

### Daily Workflow

1. **Check Dashboard** - See portfolio status, recent meetings
2. **Review Board Meetings** - `01-Board-Meetings/` for new decisions
3. **Track Ventures** - `02-Ventures/Active/` for progress
4. **Monitor Agents** - `03-Agents/` for performance trends
5. **Respond to Requests** - `06-Human-Requests/Active/` for escalations

### Finding Information

**By Search:**
- Search for anything: Cmd/Ctrl + Shift + F
- Example: "SaaS ROI" finds all SaaS venture analysis

**By Tags:**
- Click any tag to see all tagged notes
- Common tags: `#venture`, `#board-meeting`, `#success`, `#failure`

**By Links:**
- Every note links to related notes
- Board meetings → Ventures → Agents → Intelligence

**By Graph:**
- Click graph icon (top right)
- See visual connections between concepts

**By Dataview (if installed):**
```dataview
TABLE budget, revenue, roi
FROM "02-Ventures"
WHERE status = "active"
SORT roi DESC
```

## Sync Schedule

This vault auto-syncs from agent memory:

- **After board meetings** - New meeting note appears
- **During venture execution** - Venture notes update with progress
- **Weekly** - Agent performance metrics update
- **Monthly** - Meta-learning summaries added

**Manual sync:**
```bash
cd ~/agentforge
./scripts/sync-to-obsidian.sh
```

## Vault Structure

```
.obsidian-vault/
├── 00-Dashboard/           # Your command center
├── 01-Board-Meetings/      # Strategic decisions
├── 02-Ventures/            # Idea → Launch → Outcome
├── 03-Agents/              # Agent intelligence & performance
├── 04-Intelligence/        # Accumulated knowledge
├── 05-Learnings/           # Success/failure patterns
├── 06-Human-Requests/      # Escalations
└── 07-Meta/                # System evolution
```

## Power User Tips

### Query Active Ventures
```dataview
LIST
FROM "02-Ventures/Active"
SORT file.name
```

### Track Agent Accuracy
```dataview
TABLE accuracy as "Accuracy %", trend as "Trend"
FROM "03-Agents"
WHERE file.name = "Agent Profile"
SORT accuracy DESC
```

### Find Successful Patterns
```dataview
LIST
FROM "05-Learnings/What-Worked"
WHERE contains(tags, "pattern")
```

### Board Meeting Timeline
```dataview
TABLE WITHOUT ID
  file.link as "Meeting",
  venture as "Venture",
  budget as "Budget"
FROM "01-Board-Meetings"
WHERE file.name != "Board Meeting Template"
SORT file.name DESC
LIMIT 10
```

## Understanding Links

**Internal Links:**
- `[[Dashboard]]` - Links to Dashboard.md
- `[[02-Ventures/EmailTemplates]]` - Links to specific venture
- `[[CFO|CFO Agent]]` - Link with custom display text

**Backlinks:**
- Every note shows what links TO it (right sidebar)
- Great for seeing "What ventures used this pattern?"

**Unlinked Mentions:**
- Obsidian finds text matches even without links
- Discover hidden connections

## Responding to Human Requests

When agents escalate via `request_human`:

1. **Find request:** `06-Human-Requests/Active/REQ-XXX.md`
2. **Read context:** Understand what agent needs
3. **Respond via TUI:**
   ```bash
   node moltbot.mjs tui --session agent:human:main
   # Type: RESPONSE REQ-XXX: APPROVED - [your message]
   ```
4. **Or respond via API** (see request note for details)

Request moves to `Resolved/` after response.

## Graph View Tips

**Color coding (if configured):**
- Blue = Board meetings
- Green = Active ventures
- Yellow = Agents
- Red = Failed ventures
- Purple = Intelligence

**Filters:**
- Focus on specific tags
- Hide certain file types
- Show only local connections

## Dataview Queries (Plugin Required)

**Install Dataview:**
Settings → Community Plugins → Browse → "Dataview" → Install & Enable

**Common Queries:**

```dataview
// Active ventures with ROI
TABLE budget as Budget, spent as Spent, revenue as Revenue, roi as "ROI %"
FROM "02-Ventures/Active"
SORT roi DESC
```

```dataview
// Agent accuracy trends
TABLE accuracy as "Current Accuracy", trend as "Trend"
FROM "03-Agents"
WHERE contains(file.name, "Profile")
SORT accuracy DESC
```

```dataview
// Recent board meetings
LIST venture
FROM "01-Board-Meetings"
WHERE file.name != "Board Meeting Template"
SORT file.mtime DESC
LIMIT 5
```

## Troubleshooting

**Vault not syncing?**
```bash
./scripts/sync-to-obsidian.sh
```

**Links broken?**
- Obsidian auto-updates links when files move
- If manual fix needed: Cmd/Ctrl + Click → "Update link"

**Performance slow?**
- Indexing may take time on first open
- Close graph view if not needed

## Questions?

- Main docs: `README_AGENTFORGE.md` (repo root)
- Full guide: `docs/start/ceo-quickstart.md`
- System design: `OBSIDIAN_VAULT_DESIGN.md`

---

**This vault is your window into AgentForge's mind. Every decision, every learning, every pattern - all here for auditing and exploration.**
