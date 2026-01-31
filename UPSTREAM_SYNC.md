# Syncing with OpenClaw Upstream

AgentForge is based on [openclaw/openclaw](https://github.com/openclaw/openclaw) (lineage: Clawd → moltbot → openclaw). This doc records how to pull in upstream fixes and features without overwriting AgentForge-only code.

## Remote

- **Name:** `upstream`
- **URL:** `https://github.com/openclaw/openclaw.git`

Add once (if missing):

```bash
git remote add upstream https://github.com/openclaw/openclaw.git
git fetch upstream
```

## Sync steps

1. **Fetch latest:** `git fetch upstream`
2. **Create a sync branch from your current branch:**  
   `git checkout -b sync-openclaw-YYYY.M.D` (use upstream’s version date, e.g. `sync-openclaw-2026.1.29`)
3. **Merge:** `git merge upstream/main` (or `--no-commit --no-ff` to inspect first)
4. **Resolve conflicts** using the rules below.
5. **Run full gate:** `pnpm install && pnpm build && pnpm lint && pnpm test`
6. **Commit** the merge (and any resolution commits), then merge the sync branch back into your main working branch.

## What to protect (keep our version)

On conflict or when upstream **deletes** a file, **keep our version** for:

| Category | Paths / areas |
|----------|----------------|
| **AgentForge core** | `src/agentforge/` (budget-enforcement, card-encryption, decision-schema, ledger-sync, secrets, stripe-integration, venture-state) |
| **CLI commands** | `src/commands/init-agentforge.ts`, `src/commands/venture-runloop.ts`, `src/cli/program/register.init-agentforge.ts`, `src/cli/program/register.venture-runloop.ts`, `src/cli/investment-portal-cli.ts`, and AgentForge command registrations in `src/cli/program/command-registry.ts` |
| **Gateway methods** | `src/gateway/server-methods/human-requests.ts`, `src/gateway/server-methods/budget.ts`, and `human.requests.*` / `budget.status` entries in `src/gateway/server-methods.ts` |
| **TUI** | `src/tui/investment-portal/` |
| **Config / types** | Human-interface and venture-related entries (e.g. `src/config/types.human-interface.ts`) |
| **Cron / scripts** | `scripts/board-meeting.sh`, `scripts/ceo-heartbeat.sh`, `scripts/ceo-implement.sh`, `scripts/sync-ledger.mjs`, `scripts/sync-to-obsidian.sh`, `scripts/parse-coordinator-decision.mjs`, `scripts/parse-worker-status.mjs`, `scripts/board-*.mjs` |
| **Docs** | `KEEP_IT_RUNNING.md`, `VPS_DEPLOYMENT_GUIDE.md`, `VPS_UPGRADE_GUIDE.md`, `AGENTFORGE_CAPABILITIES.md`, and CEO/board/AgentForge-specific docs under `docs/` |
| **Agents / content** | `agents/` (ceo, board, coordinator), AgentForge-specific `templates/` |

- **Shared files** that contain both upstream and AgentForge wiring (e.g. `server-methods.ts`, `command-registry.ts`): keep **our** methods/commands and take **upstream** changes for the rest.
- **Naming:** Keep `moltbot` / `clawdbot` and `moltbot.mjs`; do not rename to `openclaw` unless you explicitly want to rebrand.
- **package.json:** Keep our `name`, `version`, `bin`, and `files`; pull in upstream dependency version bumps and new scripts only where they don’t conflict with our scripts.

## After merging

- We keep a **MoltbotConfig** alias for **OpenClawConfig** in `src/config/types.openclaw.ts` and **DEFAULT_CLAWD_BROWSER_PROFILE_NAME** in `src/browser/constants.ts` for compatibility. If upstream removes or renames these, re-add the alias or update references in AgentForge-only code.
