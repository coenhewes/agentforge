# GitHub Setup for AgentForge Agents

**Why This Matters:** Agents need GitHub access to build real products, version control code, and deploy to platforms like Vercel/Netlify.

---

## Strategy: Dedicated GitHub Account

**✅ RECOMMENDED:** Create a separate GitHub account for your agents

**Why:**
- ✅ Complete isolation from your personal/work accounts
- ✅ No risk to your existing repositories
- ✅ Clear audit trail (all agent commits are separate)
- ✅ Can revoke access instantly if needed
- ✅ Separate GitHub Actions minutes/storage

**Account details:**
- Username: `agentforge-bot` (or similar)
- Email: Dedicated email for this account
- Plan: Free tier is fine

---

## Setup Process

### 1. Create Dedicated GitHub Account

**On your local machine (browser):**

1. Go to https://github.com/signup
2. Create account:
   - Username: `agentforge-bot` (or your choice)
   - Email: `agentforge-bot@yourdomain.com`
   - Password: Strong password (store in password manager)
3. Verify email
4. Choose Free plan

### 2. Generate Personal Access Token (Classic)

**Still in browser, logged in as agentforge-bot:**

1. Go to: Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Configure token:
   - **Note:** "AgentForge VPS Access"
   - **Expiration:** No expiration (or 1 year, renewable)
   - **Scopes:** Select these:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
     - ✅ `user:email` (Access user email)
     - ✅ `delete_repo` (Delete repositories - for cleaning up failed projects)

4. Click "Generate token"
5. **COPY THE TOKEN NOW** - You won't see it again!
   - Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Configure Git on VPS

**SSH to your VPS:**

```bash
ssh agentforge@YOUR_VPS_IP
cd ~/agentforge
```

**Set global git config:**

```bash
# Set agent identity
git config --global user.name "AgentForge Bot"
git config --global user.email "agentforge-bot@yourdomain.com"

# Set credential helper to store token
git config --global credential.helper store

# Verify
git config --global --list
```

### 4. Store GitHub Token Securely

**Create credential file:**

```bash
# Store token for GitHub access
cat > ~/.git-credentials << 'EOF'
https://agentforge-bot:YOUR_GITHUB_TOKEN@github.com
EOF

# Replace YOUR_GITHUB_TOKEN with actual token!

# Secure the file
chmod 600 ~/.git-credentials

# Verify it exists
cat ~/.git-credentials
# Should show: https://agentforge-bot:ghp_xxx...@github.com
```

**Alternative: Use environment variable (more secure):**

```bash
# Add to ~/.bashrc
echo 'export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $GITHUB_TOKEN
```

### 5. Test GitHub Access

**Create test repository:**

```bash
# Create local test repo
mkdir -p /tmp/test-agent-repo
cd /tmp/test-agent-repo
git init
echo "# Test Repository" > README.md
git add README.md
git commit -m "Initial commit"

# Create repo on GitHub via API
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{"name":"test-agent-repo","private":false,"auto_init":false}'

# Push to GitHub
git remote add origin https://github.com/agentforge-bot/test-agent-repo.git
git push -u origin main

# Check if it worked
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/agentforge-bot/test-agent-repo
```

**If successful:** Repository appears at https://github.com/agentforge-bot/test-agent-repo

**Clean up test:**
```bash
# Delete test repo
curl -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/agentforge-bot/test-agent-repo

cd ~
rm -rf /tmp/test-agent-repo
```

---

## Agent Access to GitHub

### How Agents Use GitHub

**Via bash tool, agents can:**

```bash
# Create a new project
mkdir ~/projects/my-saas-app
cd ~/projects/my-saas-app
npm init -y

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo via API
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{"name":"my-saas-app","private":false}'

# Push to GitHub
git remote add origin https://github.com/agentforge-bot/my-saas-app.git
git push -u origin main
```

**Agents can also:**
- Clone existing repos
- Create branches
- Commit changes
- Push updates
- Create releases
- Manage issues (if needed)

---

## Integration with Deployment Platforms

### Vercel

**Connect GitHub account to Vercel:**

1. Go to https://vercel.com
2. Sign up with GitHub (using agentforge-bot account)
3. Authorize Vercel to access repositories

**Then agents can deploy via Vercel CLI:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login (one-time setup)
vercel login

# Deploy from any repo
cd ~/projects/my-saas-app
vercel --prod
```

**Or via GitHub integration** (automatic deployments on push)

### Netlify

**Similar flow:**

1. Connect GitHub account
2. Authorize Netlify
3. Deploy via CLI or auto-deploy on push

### Railway, Render, Fly.io

All support GitHub integration for automatic deployments.

---

## Security Best Practices

### 1. Token Security

**DO:**
- ✅ Store token in `~/.git-credentials` with 600 permissions
- ✅ Use environment variable `$GITHUB_TOKEN`
- ✅ Never commit token to any repository
- ✅ Rotate token every 6-12 months

**DON'T:**
- ❌ Put token in code files
- ❌ Put token in agent workspace files
- ❌ Share token anywhere
- ❌ Commit `.git-credentials` to git

### 2. Repository Management

**Agent repositories should:**
- Public by default (unless sensitive)
- Include LICENSE file
- Include README.md
- Have clear descriptions

### 3. Monitoring

**Weekly checks:**
```bash
# List all repos
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos | jq '.[].name'

# Check commit activity
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/agentforge-bot/REPO_NAME/commits
```

---

## Adding GitHub to VPS Deployment Guide

### Update VPS_DEPLOYMENT_GUIDE.md

**Add new section after "Step 5: Configure AI Provider":**

## Step 5b: Configure GitHub Access (CRITICAL for building)

### Why GitHub?

Agents need GitHub to:
- Store code for products they build
- Version control
- Deploy to Vercel, Netlify, etc.
- Collaborate (if using multiple agents)

### Setup

**1. Create dedicated GitHub account (on your local machine):**
- Username: `agentforge-bot` (or similar)
- Email: Dedicated email
- Plan: Free

**2. Generate Personal Access Token:**
- Go to: Settings → Developer settings → Personal access tokens
- Scopes: `repo`, `workflow`, `user:email`, `delete_repo`
- Copy token (starts with `ghp_`)

**3. Configure on VPS:**

```bash
# Set git identity
git config --global user.name "AgentForge Bot"
git config --global user.email "agentforge-bot@yourdomain.com"

# Store credentials
git config --global credential.helper store
cat > ~/.git-credentials << 'EOF'
https://agentforge-bot:YOUR_GITHUB_TOKEN@github.com
EOF
chmod 600 ~/.git-credentials

# Or use environment variable
echo 'export GITHUB_TOKEN="YOUR_GITHUB_TOKEN"' >> ~/.bashrc
source ~/.bashrc
```

**4. Test:**

```bash
# Create test repo
mkdir /tmp/test && cd /tmp/test
git init
echo "test" > README.md
git add . && git commit -m "test"

# Create on GitHub
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos \
  -d '{"name":"test","private":false}'

# Push
git remote add origin https://github.com/agentforge-bot/test.git
git push -u origin main

# Clean up
curl -X DELETE -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/agentforge-bot/test
cd ~ && rm -rf /tmp/test
```

---

## CEO Agent Instructions

**Update CEO's AGENTS.md to include GitHub workflow:**

### Developer Agent with GitHub

```bash
sessions_spawn --agent developer-001 --task "Build [Product Name]:

REPOSITORY SETUP:
1. Create GitHub repo:
   curl -X POST -H \"Authorization: token \$GITHUB_TOKEN\" \\
     -H \"Accept: application/vnd.github.v3+json\" \\
     https://api.github.com/user/repos \\
     -d '{\"name\":\"product-name\",\"private\":false}'

2. Clone and setup:
   git clone https://github.com/agentforge-bot/product-name.git
   cd product-name

3. Build the product (requirements below)

4. Commit and push regularly:
   git add .
   git commit -m \"Feature: X\"
   git push origin main

REQUIREMENTS:
- [Feature list]

TECH STACK:
- [Stack choices]

DEPLOYMENT:
- Push to GitHub
- Deploy via Vercel (vercel --prod)

Report progress daily with GitHub repo URL."
```

---

## What Agents Can Build Now

**With GitHub access, agents can build:**

### ✅ SaaS Applications
- Next.js apps deployed to Vercel
- React apps on Netlify
- Full-stack apps on Railway

### ✅ Static Sites
- Landing pages
- Documentation sites
- Marketing sites

### ✅ APIs & Services
- REST APIs on Fly.io
- GraphQL servers
- Microservices

### ✅ Open Source Tools
- CLI tools (npm packages)
- Libraries
- Templates

### ✅ Content Products
- Notion templates (with GitHub for version control)
- Code snippets (GitHub Gists)
- Boilerplates

---

## Example: CEO Building a SaaS

**Board Decision:** "Build AI writing tool, budget $0, 7 days"

**CEO's workflow:**

```bash
# 1. Create repo on GitHub
curl -X POST -H "Authorization: token $GITHUB_TOKEN" \\
  https://api.github.com/user/repos \\
  -d '{"name":"ai-writing-tool","description":"AI-powered writing assistant"}'

# 2. Clone locally
cd ~/projects
git clone https://github.com/agentforge-bot/ai-writing-tool.git
cd ai-writing-tool

# 3. Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --app

# 4. Build features (agent does the coding)
# ... development happens ...

# 5. Commit progress
git add .
git commit -m "feat: Add AI writing interface"
git push origin main

# 6. Deploy to Vercel
vercel --prod

# 7. Result: Live app at https://ai-writing-tool.vercel.app
```

**CEO reports to board:**
- GitHub repo: https://github.com/agentforge-bot/ai-writing-tool
- Live site: https://ai-writing-tool.vercel.app
- Commits: X features added
- Status: Launched, monitoring signups

---

## Monitoring GitHub Activity

**Check what agents are building:**

```bash
# List all repositories
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos?per_page=100 | \
  jq -r '.[] | "\(.name) - \(.description) - \(.updated_at)"'

# Check recent commits
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/agentforge-bot/REPO_NAME/commits | \
  jq -r '.[] | "\(.commit.message) by \(.commit.author.name) at \(.commit.author.date)"'

# Repository statistics
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/agentforge-bot/REPO_NAME | \
  jq '{name: .name, stars: .stargazers_count, forks: .forks_count, size: .size}'
```

**Add to monitoring script:**

```bash
# Add to ~/monitor-agentforge.sh
echo "GitHub Activity:"
REPO_COUNT=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos | jq '. | length')
echo "  Total repositories: $REPO_COUNT"

echo "  Recent commits:"
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos?per_page=5 | \
  jq -r '.[] | "    \(.name): \(.updated_at)"'
```

---

## Cost Considerations

**GitHub Free Tier:**
- ✅ Unlimited public repositories
- ✅ Unlimited private repositories
- ✅ 2,000 GitHub Actions minutes/month
- ✅ 500MB package storage

**Should be sufficient for:**
- 10-20 active projects
- Daily builds and deployments
- CI/CD for all products

**If you hit limits:**
- Upgrade to GitHub Pro ($4/month)
- 3,000 Actions minutes
- 2GB package storage

---

## Troubleshooting

### "Authentication failed"

```bash
# Check credentials
cat ~/.git-credentials
# Should show: https://agentforge-bot:ghp_xxx@github.com

# Check token
echo $GITHUB_TOKEN
# Should show: ghp_xxx...

# Test token
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
# Should return user info
```

### "Permission denied"

```bash
# Verify token has correct scopes
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user

# Check X-OAuth-Scopes header
curl -I -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user | grep "X-OAuth-Scopes"
# Should include: repo, workflow, user:email
```

### "Repository already exists"

```bash
# List existing repos
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos | jq '.[].name'

# Delete if needed
curl -X DELETE -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/agentforge-bot/REPO_NAME
```

---

## Summary

**Setup Checklist:**

- [ ] Create dedicated GitHub account (agentforge-bot)
- [ ] Generate Personal Access Token
- [ ] Configure git on VPS (global config)
- [ ] Store credentials securely (~/.git-credentials or $GITHUB_TOKEN)
- [ ] Test repo creation and push
- [ ] Update CEO's AGENTS.md with GitHub workflow
- [ ] Add monitoring for GitHub activity

**Once complete:**
✅ Agents can create repos  
✅ Agents can push code  
✅ Agents can deploy to Vercel/Netlify/etc.  
✅ All projects are version controlled  
✅ Clear audit trail of agent development  

**This is CRITICAL for building real products!**
