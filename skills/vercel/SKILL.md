---
name: vercel
description: "Deploy projects to Vercel via CLI. Use `vercel` for preview deployments, `vercel --prod` for production, and manage domains, env vars, and logs."
metadata: {"moltbot":{"emoji":"▲","requires":{"bins":["vercel"]},"install":[{"id":"npm","kind":"npm","package":"vercel","bins":["vercel"],"label":"Install Vercel CLI (npm)"}]}}
---

# Vercel Deployment Skill

Deploy web applications to Vercel's global edge network using the CLI.

## Prerequisites

1. Vercel CLI installed (`vercel --version` to verify)
2. Authenticated with `vercel login` or `VERCEL_TOKEN` env var for automation

## Authentication

Interactive login (opens browser):
```bash
vercel login
```

Token-based login for automation:
```bash
export VERCEL_TOKEN="your-token-here"
# All subsequent commands will use this token
```

## Project Setup

Link an existing project:
```bash
vercel link
```

Initialize and deploy a new project:
```bash
vercel
# Follow prompts to configure project settings
```

## Deployments

### Preview Deployment

Deploy to a preview URL (default behavior):
```bash
vercel
```

Deploy without prompts (CI/CD):
```bash
vercel --yes
```

### Production Deployment

Deploy to production:
```bash
vercel --prod
```

Deploy prebuilt output (faster, for CI):
```bash
vercel build
vercel deploy --prebuilt --prod
```

### Deployment Options

Deploy with specific settings:
```bash
vercel --name my-project --prod
```

Force deploy even with warnings:
```bash
vercel --force
```

## Environment Variables

Add an environment variable:
```bash
vercel env add MY_VAR
# Follow prompts to set value and environments (production/preview/development)
```

Add non-interactively:
```bash
echo "secret-value" | vercel env add MY_SECRET production
```

List environment variables:
```bash
vercel env ls
```

Pull env vars to local `.env` file:
```bash
vercel env pull
```

Remove an environment variable:
```bash
vercel env rm MY_VAR production
```

## Domain Management

List domains:
```bash
vercel domains ls
```

Add a custom domain:
```bash
vercel domains add example.com
```

Add domain to specific project:
```bash
vercel alias set my-deployment-url.vercel.app example.com
```

Set up alias after deployment:
```bash
vercel alias my-project-abc123.vercel.app custom.example.com
```

## Logs and Debugging

View deployment logs:
```bash
vercel logs my-project-abc123.vercel.app
```

Stream logs in real-time:
```bash
vercel logs my-project-abc123.vercel.app --follow
```

Inspect a deployment:
```bash
vercel inspect my-project-abc123.vercel.app
```

List recent deployments:
```bash
vercel ls
```

List deployments for specific project:
```bash
vercel ls my-project
```

## Project Management

View project settings:
```bash
vercel project ls
```

Remove a project:
```bash
vercel remove my-project
```

## Secrets (Legacy)

Note: Secrets are deprecated in favor of environment variables.

```bash
# Use env vars instead
vercel env add SECRET_KEY production
```

## Common Workflows

### Deploy a Next.js App

```bash
cd my-nextjs-app
vercel link  # Link to existing or create new project
vercel env add DATABASE_URL production  # Set env vars
vercel --prod  # Deploy to production
```

### Deploy a Static Site

```bash
cd my-static-site
vercel --prod
```

### CI/CD Deployment

```bash
# In CI environment with VERCEL_TOKEN set
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

### Rollback a Deployment

```bash
# List deployments to find the one to rollback to
vercel ls my-project

# Promote a previous deployment to production
vercel promote my-project-abc123.vercel.app
```

## Framework-Specific Tips

### Next.js
- Vercel auto-detects Next.js and configures optimally
- API routes become serverless functions automatically
- ISR (Incremental Static Regeneration) works out of the box

### React/Vite/Static
- Set output directory if not auto-detected: `vercel --build-env OUTPUT_DIR=dist`

### Node.js API
- Place serverless functions in `api/` directory
- Each file becomes an endpoint: `api/hello.js` → `/api/hello`

## Output Formats

Get deployment URL only:
```bash
vercel --prod 2>&1 | grep -oE 'https://[^ ]+'
```

JSON output for scripting:
```bash
vercel ls --json
vercel inspect my-deployment.vercel.app --json
```

## Tips

- Use `vercel --help` or `vercel <command> --help` for detailed usage
- Preview deployments get unique URLs; production deployments use your domain
- Environment variables can be scoped to production, preview, or development
- Use `vercel dev` for local development with Vercel's serverless environment
- Deployments are immutable; rollback by promoting a previous deployment
