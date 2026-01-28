# Investment Ledger

Track all capital deployments, their expected returns, and actual outcomes.

## Active Investments

| ID | Date | Amount | Channel | Target | Expected ROI | Kill Threshold | Checkpoint | Status |
|----|------|--------|---------|--------|--------------|----------------|------------|--------|
| _example_ | _2026-01-28_ | _$100_ | _newsletter_ | _TechDaily_ | _3.0x_ | _<15% prob by 4h_ | _2026-01-28 16:00_ | _active_ |

## Completed Investments

| ID | Date | Amount | Channel | Target | Expected ROI | Actual ROI | Revenue | Status | Lessons |
|----|------|--------|---------|--------|--------------|------------|---------|--------|---------|
| _example_ | _2026-01-20_ | _$50_ | _ad_ | _Reddit r/SaaS_ | _2.5x_ | _3.2x_ | _$160_ | _successful_ | _Developer audience converts well_ |

## Killed Investments

| ID | Date | Amount Spent | Amount Saved | Channel | Target | Reason | Reallocation |
|----|------|--------------|--------------|---------|--------|--------|--------------|
| _example_ | _2026-01-15_ | _$30_ | _$70_ | _ad_ | _Facebook_ | _0 conversions after 2000 impressions_ | _Moved to newsletter_ |

---

## Summary Metrics

### This Month

| Metric | Value |
|--------|-------|
| Total Deployed | $0 |
| Total Revenue | $0 |
| Net P/L | $0 |
| Avg ROI | N/A |
| Kill Rate | N/A |
| Capital Saved (kills) | $0 |

### All Time

| Metric | Value |
|--------|-------|
| Total Deployed | $0 |
| Total Revenue | $0 |
| Net P/L | $0 |
| Successful Investments | 0 |
| Failed Investments | 0 |
| Killed Investments | 0 |
| Avg Time to Kill | N/A |

---

## Investment ID Format

Use format: `INV-YYYYMMDD-XXX`

Example: `INV-20260128-001` (first investment on Jan 28, 2026)

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `active` | Capital deployed, awaiting results |
| `monitoring` | Past initial checkpoint, still tracking |
| `successful` | Achieved or exceeded expected ROI |
| `partial` | ROI > 1.0x but below target |
| `failed` | ROI <= 1.0x, ran to completion |
| `killed` | Terminated early due to poor performance |

---

## Channel Performance History

Track which channels work best over time:

| Channel | Total Invested | Total Return | Avg ROI | Success Rate | Notes |
|---------|----------------|--------------|---------|--------------|-------|
| newsletter | $0 | $0 | N/A | N/A | |
| ad_platform | $0 | $0 | N/A | N/A | |
| freelancer | $0 | $0 | N/A | N/A | |
| infrastructure | $0 | $0 | N/A | N/A | |

---

## Kill Switch Performance

How effective is the kill switch at preserving capital?

| Month | Investments Killed | Capital Saved | Would-Be Loss (estimated) | Savings Rate |
|-------|-------------------|---------------|---------------------------|--------------|
| _2026-01_ | _0_ | _$0_ | _$0_ | _N/A_ |

---

## Lessons Learned

### What Works
- (Add learnings from successful investments)

### What Doesn't Work
- (Add learnings from failed/killed investments)

### Channel-Specific Insights
- (Add insights per channel over time)

---

## Pending Reallocation Queue

Capital waiting to be deployed after kills:

| Amount | Source (Killed ID) | Suggested Channel | Priority |
|--------|-------------------|-------------------|----------|
| _$70_ | _INV-20260115-001_ | _newsletter_ | _high_ |

---

## Next Investment Candidates

Research queue for potential investments:

| Channel | Target | Est. Cost | Est. ROI | Research Status | Notes |
|---------|--------|-----------|----------|-----------------|-------|
| _newsletter_ | _DevOps Weekly_ | _$200_ | _2.5x_ | _pricing verified_ | _Good audience match_ |

---

_This ledger is updated by the CEO agent after every investment action._
