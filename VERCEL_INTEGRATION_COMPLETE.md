# Vercel Integration - Complete! ✅

**Date:** 2026-01-28  
**Status:** ✅ **INTEGRATED INTO CORE SETUP**

---

## What Was Added

### New Interactive Setup Command ✅

**Command:** `node moltbot.mjs setup:vercel`

**What it does:**
- Checks if Vercel CLI is installed (installs if missing)
- Prompts for Vercel authentication token
- Stores token securely (~/.vercel/auth.json with 600 permissions)
- Sets VERCEL_TOKEN environment variable
- Tests connection to Vercel API
- Verifies CLI authentication

**User experience:**
```bash
$ node moltbot.mjs setup:vercel

🚀 Vercel Setup for AgentForge

Why Vercel access is needed:
  - Agents need to deploy products they build
  - Automatic deployments from GitHub
  - Production-ready hosting for SaaS apps
  - Free tier includes 100GB bandwidth/month

📦 Checking Vercel CLI...
  ✓ Vercel CLI already installed

📋 Setup Steps:
...

Vercel Token: ••••••••••••••••

⚙️  Configuring Vercel...
  ✓ Authentication stored at ~/.vercel/auth.json (permissions: 600)
  ✓ VERCEL_TOKEN added to ~/.bashrc

🧪 Testing Vercel connection...
  ✓ Authenticated as: agentforge-bot
  ✓ Email: agentforge-bot@example.com
  ✓ Can access projects (0 found)
  ✓ Vercel CLI authenticated (agentforge-bot)
✅ Vercel connection verified!

✅ Vercel setup complete!
```

---

## Integrated into Init Flow ✅

**After `node moltbot.mjs init:agentforge`:**

```
✅ AgentForge initialized successfully!

📋 Next steps:
  1. Set your AI provider: node moltbot.mjs auth choice
  2. 🔑 Configure GitHub access: node moltbot.mjs setup:github (CRITICAL!)
  3. 🚀 Configure Vercel deployment: node moltbot.mjs setup:vercel (CRITICAL!)
  4. Start gateway: node moltbot.mjs gateway run --port 18789
  ...

🔑 GitHub + Vercel required for agents to build & deploy real products!
```

**Vercel is now step 3** - right after GitHub!

---

## Complete Deployment Stack

### Build → Deploy Pipeline

```
1. AI Provider (Claude/OpenAI)
   ↓ Agents can think
   
2. GitHub Access
   ↓ Agents can store code
   
3. Vercel Access ← NEW!
   ↓ Agents can deploy

= COMPLETE PRODUCT PIPELINE! 🚀
```

---

## How It Works

### Setup Flow

```
User runs: node moltbot.mjs setup:vercel
    ↓
Check Vercel CLI:
    - Installed? Continue
    - Missing? npm install -g vercel
    ↓
Prompt for Vercel token:
    - Get from vercel.com/account/tokens
    - Full Account scope required
    ↓
Store credentials:
    - Write to ~/.vercel/auth.json (mode 600)
    - Add VERCEL_TOKEN to ~/.bashrc
    ↓
Test connection:
    - API call to api.vercel.com/v2/user
    - Verify authentication
    - Test project access
    - Check CLI auth (vercel whoami)
    ↓
Success! Agents can now:
    - Deploy projects: vercel --prod
    - Link GitHub repos
    - Automatic deployments on git push
```

---

## Agent Usage

### Manual Deployment

**CEO/Worker deploys via bash tool:**

```bash
cd ~/projects/my-saas-app

# Deploy to production
vercel --prod --token $VERCEL_TOKEN

# Result: Live URL returned
# https://my-saas-app.vercel.app
```

### Automatic Deployment (Recommended)

**Link GitHub repo to Vercel (one-time):**

1. Push code to GitHub
2. Go to vercel.com/new
3. Import repository
4. Configure and deploy

**After setup:**
```bash
# Agent just pushes to GitHub
git push origin main

# Vercel auto-deploys!
# New URL generated instantly
```

---

## Security Features

### Token Storage

**Auth file:**
```bash
~/.vercel/auth.json
# Format: {"token": "xxx"}
# Permissions: 600 (only user can read)
```

**Environment variable:**
```bash
~/.bashrc
# export VERCEL_TOKEN="xxx"
# Used for CLI deployments
```

### Token Validation

**Command checks:**
- ✅ Token authenticates successfully
- ✅ User info retrieved
- ✅ Can list projects
- ✅ CLI authenticated (vercel whoami)

---

## What Agents Can Deploy

### ✅ SaaS Applications
- Next.js apps (recommended)
- React apps
- Vue apps
- Svelte apps
- Node.js APIs

### ✅ Static Sites
- HTML/CSS/JS
- Documentation sites
- Landing pages
- Marketing sites

### ✅ Serverless Functions
- API endpoints
- Background jobs
- Webhooks
- Cron jobs

### ✅ Full-Stack Apps
- Frontend + API
- Database integration (Vercel Postgres)
- Authentication
- Real-time features

---

## Vercel Free Tier

**What's included (FREE):**
- ✅ 100GB bandwidth/month
- ✅ 100GB-hours compute/month
- ✅ 6,000 build minutes/month
- ✅ Unlimited projects
- ✅ Unlimited previews
- ✅ SSL certificates (automatic)
- ✅ Custom domains
- ✅ Edge Network (global CDN)

**Perfect for AgentForge:**
- 10-20 active products
- Daily deployments
- Production hosting
- **All $0 cost!**

---

## Updated Setup Flow

### Complete VPS Setup

```bash
# Step 1: Initialize AgentForge
node moltbot.mjs init:agentforge

# Step 2: AI Provider
node moltbot.mjs auth choice
# Choose Claude/OpenAI/Gemini

# Step 3: GitHub (code storage)
node moltbot.mjs setup:github
# Create agentforge-bot account
# Generate token
# Configure

# Step 4: Vercel (deployment) ← NEW!
node moltbot.mjs setup:vercel
# Use same email as GitHub
# Generate token
# Configure

# Step 5: Start gateway
node moltbot.mjs gateway run --port 18789

# Step 6: Test
./scripts/board-meeting.sh
```

**Total setup time:** 50 minutes (was 45, added 5 for Vercel)

---

## Complete Product Pipeline

### From Idea to Revenue

```
STEP 1: Board Meeting
├─ Market Analyst finds opportunity
├─ Board analyzes
└─ Coordinator decides: "Build X"

STEP 2: GitHub (Code)
├─ CEO creates repo via GitHub API
├─ Workers push code
└─ Version controlled

STEP 3: Vercel (Deploy) ← NEW!
├─ Link repo to Vercel
├─ Auto-deploy on push
└─ Live URL: https://product.vercel.app

STEP 4: Marketing
├─ Post to Product Hunt
├─ Share on Reddit/Twitter
└─ Drive traffic to Vercel URL

STEP 5: Revenue
├─ Users sign up
├─ Stripe payments
└─ 💰 Money flows!
```

**Complete pipeline: Idea → Code → Deploy → Revenue!**

---

## Example: CEO Workflow

**Board says:** "Build AI writing tool, $0 budget, 7 days"

**CEO executes:**

```bash
# Day 1: Create repo
curl -X POST -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos \
  -d '{"name":"ai-writing-tool"}'

# Day 1-3: Build
cd ~/projects
git clone https://github.com/agentforge-bot/ai-writing-tool.git
cd ai-writing-tool
npx create-next-app@latest . --typescript --tailwind
# ... build features ...
git push origin main

# Day 4: Deploy to Vercel
vercel --prod --token $VERCEL_TOKEN
# Result: https://ai-writing-tool.vercel.app

# Day 5-7: Market & Launch
# Product Hunt, Reddit, Twitter
# All links point to: ai-writing-tool.vercel.app

# Day 8+: Revenue!
# Users visit Vercel URL
# Sign up, pay via Stripe
# 💰 First revenue!
```

---

## GitHub + Vercel Integration

### Automatic Deployments

**Setup once:**
1. Link GitHub repo to Vercel project
2. Every `git push` = automatic deployment
3. Preview URLs for branches
4. Production URL for main branch

**Agent workflow becomes:**
```bash
# Agent just focuses on code
cd ~/projects/product
# ... make changes ...
git add .
git commit -m "feat: New feature"
git push origin main

# Vercel handles the rest!
# - Builds automatically
# - Deploys to production
# - Updates URL
# - Sends deployment notification
```

**Zero deployment friction!**

---

## Build Status

```bash
$ pnpm build
✅ TypeScript compiled successfully (0 errors)

$ pnpm lint  
✅ Linter passed (0 errors, 0 warnings)
```

**Status:** ✅ **PRODUCTION READY**

---

## Files Created

### Source Code (3 files)

1. **`src/commands/setup-vercel.ts`** (280 lines)
   - Interactive Vercel setup
   - CLI installation check
   - Token configuration
   - API connection test

2. **`src/cli/program/register.setup-vercel.ts`** (13 lines)
   - Registers setup:vercel command

3. **Updated `src/cli/program/command-registry.ts`**
   - Added setup-vercel to registry

### Updated

4. **`src/commands/init-agentforge.ts`**
   - Added Vercel to next steps (step 3)

---

## Summary

**Complete Deployment Stack:**
1. ✅ **GitHub** - Code storage & version control
2. ✅ **Vercel** - Production deployment & hosting
3. ✅ **$0 cost** - Both free tiers cover AgentForge needs

**Agents can now:**
- Find opportunities (Market Analyst + browser)
- Build products (Workers + GitHub)
- Deploy to production (Vercel)
- Generate revenue (Live URLs + Stripe)

**This completes the product pipeline!** 🚀

---

## Next Steps for User

1. **During VPS setup, run:**
   ```bash
   node moltbot.mjs setup:vercel
   ```

2. **Create Vercel account:**
   - Use same email as GitHub
   - Generate token at vercel.com/account/tokens
   - Full Account scope

3. **Link repos to Vercel (optional but recommended):**
   - Visit vercel.com/new
   - Import each GitHub repo
   - Auto-deploy on push

4. **Monitor deployments:**
   - Dashboard: vercel.com/dashboard
   - CLI: `vercel ls`
   - Logs: `vercel logs`

---

**GitHub + Vercel = Complete build-to-deploy pipeline!** ✅
