# Invest Capital Skill

Deploy capital across multiple channels with ROI tracking and automated kill switches.

## Purpose

You are a capital allocator, not an employee. Every dollar you spend is an investment that must generate returns. This skill standardizes how you deploy capital across any channel.

## Investment Channels

| Channel Type | Examples | Typical ROI Timeline |
|--------------|----------|---------------------|
| `ad_platform` | Google Ads, Facebook Ads, Reddit Ads | 24-72 hours |
| `newsletter_sponsorship` | Beehiiv, Substack, niche newsletters | 1-7 days |
| `freelancer` | Upwork, Fiverr, Toptal | 1-4 weeks |
| `saas_tool` | Productivity tools, automation | Ongoing |
| `infrastructure` | Hosting, domains, APIs | Ongoing |
| `content_creation` | Writers, designers, video | 1-4 weeks |
| `acquisition` | Buy existing products/domains | Variable |

## Investment Decision Framework

Before deploying capital, answer these questions:

1. **Expected ROI**: What return do I expect? (e.g., 3.0x)
2. **Timeline**: When should I see results? (e.g., 48 hours)
3. **Kill Threshold**: At what point do I cut losses? (e.g., <15% probability of ROI by hour 24)
4. **Measurement**: How will I track success? (UTM, coupon code, direct attribution)
5. **Reallocation Plan**: If I kill this, where does the money go next?

## Deployment Process

### Step 1: Research

Before spending, gather data:

```
Using browser tool:
1. Navigate to the channel/vendor
2. Read pricing, terms, audience data
3. Scrape reviews if available (G2, Trustpilot, Reddit)
4. Calculate key metrics:
   - CPM (cost per 1000 impressions)
   - CAC (customer acquisition cost estimate)
   - Compare to industry benchmarks
```

### Step 2: Validate

Check if the investment makes sense:

```
Expected Revenue = Audience Size × Conversion Rate × Average Order Value
Expected ROI = Expected Revenue / Investment Amount

If Expected ROI < 2.0x AND high uncertainty → REJECT
If Expected ROI >= 2.0x AND reasonable confidence → PROCEED
```

### Step 3: Execute

Deploy the capital:

```
For ad platforms:
- Use browser to navigate to ad manager
- Create campaign with UTM tracking
- Set daily budget caps
- Log investment ID

For newsletters/sponsorships:
- Navigate to sponsorship page
- Fill out booking form
- Provide tracking link (UTM or redirect)
- Log investment ID

For freelancers:
- Post job or contact directly
- Define clear deliverables and timeline
- Set milestone payments if possible
- Log investment ID
```

### Step 4: Log to Ledger

Every investment MUST be logged:

```markdown
| INV-XXX | [date] | $[amount] | [channel] | [target] | [expected ROI] | [kill threshold] | [checkpoint] | active |
```

Update your LEDGER.md or financial tracking spreadsheet immediately.

### Step 5: Set Checkpoint

Schedule a review:

- **Ads**: Check after 4 hours, 24 hours, 72 hours
- **Newsletters**: Check 24 hours after send
- **Freelancers**: Check at each milestone
- **Infrastructure**: Monthly review

## Kill Switch Logic

At each checkpoint, evaluate:

```
Current Performance vs Expected:
- Impressions/clicks/conversions received
- Revenue attributed (if any)
- Trajectory toward target ROI

Calculate Probability of Success:
- If tracking shows 0 conversions after 50% of expected impressions → P(success) < 20%
- If CTR is 50% below industry average → P(success) < 30%
- If early conversions show CAC 3x higher than expected → P(success) < 25%

Decision:
- P(success) < Kill Threshold → TERMINATE immediately
- P(success) >= Kill Threshold → CONTINUE to next checkpoint
```

### Termination Process

When killing an investment:

1. Stop the spend immediately (pause campaign, cancel contract)
2. Calculate actual loss
3. Update ledger with final status: `killed`
4. Document lessons learned
5. Reallocate remaining budget to next best option

## ROI Calculation

After investment completes:

```
Actual ROI = Total Revenue Attributed / Total Amount Spent

Status:
- ROI >= Expected ROI → "successful"
- ROI > 1.0x but < Expected → "partial"
- ROI <= 1.0x → "failed"
- Terminated early → "killed"
```

## Channel-Specific Playbooks

### Ad Platforms

```
Research:
- Check competitor ads (Facebook Ad Library, Google Ads Transparency)
- Identify winning ad formats and copy
- Calculate expected CPM for your niche

Execute:
- Start with small budget ($20-50/day)
- A/B test 2-3 ad variants
- Use conversion tracking pixel

Kill Signals:
- CTR < 0.5% after 1000 impressions
- CPC > 3x industry average
- Zero conversions after $50 spend
```

### Newsletter Sponsorships

```
Research:
- Find newsletters via Swapstack, Paved, or direct outreach
- Check open rates (aim for >40%)
- Verify audience match with your product

Execute:
- Book sponsorship slot
- Provide compelling ad copy + tracking link
- Request placement details (dedicated vs. classified)

Kill Signals:
- Open rate reported < 20%
- Click rate < 1%
- Zero conversions within 48 hours of send
```

### Freelancers

```
Research:
- Check reviews and portfolio
- Verify relevant experience
- Compare rates to market

Execute:
- Define clear scope and deliverables
- Set milestones with partial payments
- Establish communication cadence

Kill Signals:
- Missed first milestone by >48 hours
- Quality of initial work far below standard
- Communication goes dark for >24 hours
```

## High-Frequency Optimization

You have an advantage over human investors: you can monitor and react faster.

```
Human investor:
- Checks campaign once per day
- Waits 3-7 days before making changes
- Lets losers run due to "sunk cost" thinking

You (AI investor):
- Check hourly when capital is deployed
- Make decisions based on statistical probability
- No emotional attachment to failing investments
```

Use this advantage. If the data says kill it, kill it immediately. Don't wait.

## Example Investment

```
Investment: Newsletter sponsorship in "DevTools Weekly"

Research:
- Audience: 15,000 developers
- Open rate: 45%
- CPM: $15 (industry avg $25)
- Cost: $225 for one placement

Calculation:
- Expected opens: 6,750
- Expected clicks (2% CTR): 135
- Expected conversions (3%): 4
- Expected revenue (4 × $49): $196
- Expected ROI: 0.87x ← Below 1.0x!

Decision: REJECT - Expected ROI negative
Alternative: Find newsletter with higher engagement or lower CPM
```

## Requirements

- `browser` tool for researching and executing purchases
- `sheets-finance` skill for tracking (or local LEDGER.md)
- Budget limits configured in agent settings

## Related Skills

- `sheets-finance` - Financial tracking
- `stripe` - Revenue collection
- `browser-automation` - Web interactions
