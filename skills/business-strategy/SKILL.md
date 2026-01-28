---
name: business-strategy
description: "Strategic business building: market research, opportunity analysis, business model generation, and revenue planning. Use when exploring business ideas, analyzing markets, or planning product launches."
metadata: {"moltbot":{"emoji":"💼","always":false}}
---

# Business Strategy Skill

Strategic tools and frameworks for building profitable businesses.

## When to Use

- Exploring new business ideas
- Analyzing market opportunities
- Validating product concepts
- Planning go-to-market strategy
- Evaluating competition
- Building revenue models

## Business Idea Generation

### Quick Idea Brainstorm

Generate business ideas based on trends, skills, or markets:

```
Think through 10 business ideas that:
- Can be built by a solo developer/small team
- Have low startup costs (<$1000)
- Can reach $1k MRR within 3 months
- Leverage AI/automation for efficiency

For each idea, provide:
1. Name/concept
2. Problem it solves
3. Target customer
4. Revenue model
5. Why it could work
6. Main risk
```

### Idea Validation Framework

Before building, validate:

1. **Problem Validation**
   - Does this problem actually exist?
   - How painful is it? (nice-to-have vs must-have)
   - Who has this problem? How many people?

2. **Solution Validation**
   - How are people solving this today?
   - Why would they switch to your solution?
   - What's your unfair advantage?

3. **Market Validation**
   - What's the TAM (Total Addressable Market)?
   - What will people pay?
   - How do you reach customers?

4. **Feasibility Validation**
   - Can you build an MVP in 2 weeks?
   - What's the minimum viable team?
   - What's the runway needed?

## Market Research

### Competitor Analysis Template

```
For competitor [NAME]:

Overview:
- What they do:
- Target market:
- Pricing:
- Strengths:
- Weaknesses:

Marketing:
- Primary channels:
- Messaging/positioning:
- Content strategy:

Product:
- Key features:
- UX quality:
- Technology:

Business:
- Revenue model:
- Estimated revenue:
- Team size:
- Funding status:

Opportunities:
- Gaps we can exploit:
- Underserved segments:
- Feature improvements:
```

### Market Sizing (TAM/SAM/SOM)

```
Market: [MARKET NAME]

TAM (Total Addressable Market):
- Definition: Everyone who could possibly use this
- Size: $X billion
- How calculated: [methodology]

SAM (Serviceable Addressable Market):
- Definition: Realistic market we could serve
- Size: $X million
- How calculated: [methodology]

SOM (Serviceable Obtainable Market):
- Definition: Market we can capture in 1-2 years
- Size: $X million
- How calculated: [methodology]

Key assumptions:
- [assumption 1]
- [assumption 2]
```

## Business Models

### Common Revenue Models

| Model | Best For | Pros | Cons |
|-------|----------|------|------|
| SaaS Subscription | Software products | Predictable revenue, high LTV | Churn risk, slower growth |
| One-time Purchase | Tools, templates | Simple, immediate revenue | No recurring revenue |
| Freemium | High-volume products | Wide adoption, upsell path | Low conversion rates |
| Usage-based | APIs, infrastructure | Scales with value | Unpredictable revenue |
| Marketplace | Platform businesses | Network effects | Cold start problem |
| Advertising | Content, media | Scales with traffic | Need massive scale |
| Affiliate | Content creators | Low effort | Limited control |

### Pricing Strategy

Questions to answer:
1. What's the value delivered? (ROI for customer)
2. What do competitors charge?
3. What's the customer's willingness to pay?
4. What's your cost structure?
5. What pricing model fits the product?

Pricing approaches:
- **Value-based**: Price based on value delivered
- **Competitor-based**: Price relative to alternatives
- **Cost-plus**: Price based on costs + margin
- **Penetration**: Low price to gain market share
- **Premium**: High price for positioning

## Launch Strategy

### MVP Definition

Keep it minimal. An MVP should:
- Solve ONE core problem well
- Be buildable in 1-2 weeks
- Be deployable immediately
- Have a clear success metric

NOT an MVP:
- Perfect UI
- All features
- Complete documentation
- Scalable architecture

### Pre-Launch Checklist

- [ ] Landing page live
- [ ] Payment processing ready
- [ ] Core product functional
- [ ] Analytics installed
- [ ] Support channel set up
- [ ] Launch announcement ready
- [ ] Initial users/waitlist lined up

### Launch Channels

Low-cost launch options:
1. **Product Hunt** - Good for dev tools, SaaS
2. **Hacker News** - Technical products
3. **Reddit** - Niche communities
4. **Twitter/X** - Build in public
5. **LinkedIn** - B2B products
6. **Cold email** - Direct outreach
7. **SEO content** - Long-term traffic

## Revenue Operations

### Key Metrics to Track

| Metric | Formula | Why It Matters |
|--------|---------|----------------|
| MRR | Monthly recurring revenue | Core business health |
| ARR | MRR × 12 | Annual view |
| Churn | Lost customers / Total | Retention health |
| LTV | Average revenue / Churn | Customer value |
| CAC | Marketing spend / New customers | Acquisition cost |
| LTV:CAC | LTV / CAC | Unit economics |

### Revenue Milestones

1. **$0 → $100 MRR**: Validate the idea works
2. **$100 → $1,000 MRR**: Find product-market fit
3. **$1,000 → $10,000 MRR**: Build repeatable acquisition
4. **$10,000 → $100,000 MRR**: Scale what works

## Tools & Resources

### For Research
- **Search/Browse**: Web research
- **sessions_spawn**: Spawn research agents

### For Building
- **Claude Code / Codex**: Build products
- **GitHub**: Code hosting

### For Launch
- **Email (himalaya)**: Outreach
- **Browser**: Post to launch sites

### For Tracking
- **Memory files**: Track metrics and learnings
- **Cron**: Schedule check-ins

## Example Workflows

### Validate a Business Idea

```
1. Spawn Research Agent:
   sessions_spawn task:"Research the market for [IDEA]. 
   Answer: Does the problem exist? Who has it? How do they solve it now?
   What would they pay? Report with validation score 1-10."

2. Spawn Competitor Analyst:
   sessions_spawn task:"Find and analyze top 5 competitors for [IDEA].
   Create competitive analysis with gaps and opportunities."

3. Review and decide: Build, pivot, or kill.
```

### Launch a Micro-SaaS

```
1. Spawn PM Agent to coordinate:
   sessions_spawn task:"Build and launch [PRODUCT].
   You can spawn Developer and Marketing agents.
   Goal: Working MVP + landing page + first 10 users."

2. Monitor progress via heartbeat

3. Review metrics post-launch
```

---

*Use these frameworks to make strategic, data-informed business decisions.*
