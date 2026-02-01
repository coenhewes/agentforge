# Full Project Cleanup Plan

Plan for removing irrelevant and outdated docs and tightening the project surface. **Do not edit this plan file** when executing; use it as a checklist.

---

## 1. Goals

- Remove one-off completion reports, implementation summaries, and obsolete checklists from the repo root and docs.
- Keep a single clear path for users: README → AgentForge (CEO/VPS) or platform (OpenClaw) docs.
- Reduce noise so `docs/` and root reflect current behavior and only essential reference material.
- Do **not** rename the whole codebase (OpenClaw/Moltbot remain in code and many docs); ensure **AgentForge** entry points (README, VPS_DEPLOYMENT_GUIDE, KEEP_IT_RUNNING, ceo-quickstart) are the primary user-facing docs for the autonomous business use case.

---

## 2. Root-level cleanup

### 2.1 Remove (one-off reports, superseded checklists, historical notes)

These are completion reports, implementation summaries, or one-time checklists that are no longer the source of truth. **Delete** (or move to an `archive/` folder once if you want history; otherwise delete).

| File | Reason |
|------|--------|
| `AGENTFORGE_COMPLETE.md` | Implementation summary; behavior is in KEEP_IT_RUNNING / HEARTBEAT / agents |
| `AGENTFORGE_CAPABILITIES.md` | Overlaps README / ceo-quickstart; remove or fold one line into README |
| `COMPLETION_REPORT.md` | One-off completion report |
| `COORDINATOR_FIX.md` | One-off fix summary; behavior is in code and KEEP_IT_RUNNING |
| `DEPLOYMENT_READY_FINAL.md` | One-off deployment report |
| `FINAL_SUMMARY.md` | One-off summary |
| `GITHUB_INTEGRATION_COMPLETE.md` | One-off integration report |
| `HUMAN_ESCALATION_GUIDELINES.md` | Fold into KEEP_IT_RUNNING (human requests) or remove if redundant |
| `HUMAN_INTERFACE_DESIGN.md` | Design note; remove or move to docs/reference if needed |
| `HUMAN_INTERFACE_SUMMARY.md` | Summary; remove or fold into one doc |
| `IMPLEMENTATION_ANALYSIS.md` | One-off analysis |
| `IMPLEMENTATION_REVIEW_FINAL.md` | One-off review |
| `INSTALLATION_REVIEW_AND_FIXES.md` | One-off review; fixes should be in VPS_DEPLOYMENT_GUIDE / init |
| `INSTALLATION_TEST.md` | One-off test log |
| `MEMORY_SYSTEM_COMPLETION.md` | One-off completion; MEMORY is described in agents/ and concepts |
| `OBSIDIAN_INTEGRATION_COMPLETE.md` | One-off integration report |
| `OBSIDIAN_VAULT_DESIGN.md` | Design note; remove or keep in .obsidian-vault only |
| `OLLAMA_FALLBACK_SETUP.md` | If still relevant, move to docs/install or docs/providers; else remove |
| `PRE_LAUNCH_QA.md` | One-off checklist |
| `READY_FOR_TESTING.md` | One-off checklist |
| `SETUP_REVIEW.md` | One-off review |
| `START_TESTING_NOW.md` | One-off checklist |
| `STRATEGIC_LEARNING_SYSTEM.md` | One-off design; remove or move to reference |
| `TESTING_CHECKLIST_FINAL.md` | Superseded by docs/testing.md and KEEP_IT_RUNNING |
| `UNLIMITED_OPPORTUNITY.md` | One-off note; remove |
| `UPSTREAM_SYNC.md` | One-off sync note; remove |
| `VERCEL_INTEGRATION_COMPLETE.md` | One-off report; Vercel is in setup-vercel / skills; remove |
| `VPS_CONFIG_UPDATE.md` | One-off; current config is in VPS_DEPLOYMENT_GUIDE |
| `VPS_RESTART_CHECKLIST.md` | Fold into KEEP_IT_RUNNING or VPS_DEPLOYMENT_GUIDE; then remove |
| `VPS_UPGRADE_GUIDE.md` | If still needed, merge into VPS_DEPLOYMENT_GUIDE; else remove |
| `ZERO_CAPITAL_CONSTRAINT.md` | One-off constraint note; remove or one line in LEDGER/HEARTBEAT |
| `COMPLETE_SETUP_SUMMARY.md` | One-off summary |
| `README_AGENTFORGE.md` | Redundant with README; remove |
| `GITHUB_SETUP_FOR_AGENTS.md` | If still needed, move to docs/ or skills; else remove |

**Optional (archive instead of delete):** Create `archive/` at repo root, move the above there, then add `archive/` to `.gitignore` or keep for one release and delete later.

### 2.2 Keep at root

| File | Purpose |
|------|---------|
| `README.md` | Main entry; AgentForge + platform links |
| `KEEP_IT_RUNNING.md` | Post-deploy ops (heartbeat, cron, venture store, daily pipeline) |
| `VPS_DEPLOYMENT_GUIDE.md` | Deploy and initial setup |
| `CHANGELOG.md` | Release history |
| `CONTRIBUTING.md` | Contribution guidelines |
| `AGENTS.md` | Repo guidelines for AI/contributors (CLAUDE.md sibling) |
| `LICENSE` | License |
| `SECURITY.md` | If present; security policy |

### 2.3 Optional root additions

- **Single “AgentForge overview”** (optional): One short `AGENTFORGE.md` (or a section in README) that links to CEO quickstart, VPS_DEPLOYMENT_GUIDE, KEEP_IT_RUNNING, and venture store. Only if README is already long and you want a dedicated entry point.

---

## 3. docs/ folder cleanup

### 3.1 Remove or relocate

| Item | Action |
|------|--------|
| `docs/DOCS_AUDIT.md` | Internal audit; move to `.agent/docs-audit.md` or delete after cleanup |
| `docs/northflank.mdx` | Hosting one-off; remove unless you use Northflank |
| `docs/railway.mdx` | Hosting one-off; remove unless you use Railway |
| `docs/render.mdx` | Hosting one-off; remove unless you use Render |
| `docs/vps.md` | If duplicate of root VPS_DEPLOYMENT_GUIDE, remove or replace with “see VPS_DEPLOYMENT_GUIDE at repo root” |

### 3.2 Archive or trim (reference only)

| Item | Action |
|------|--------|
| `docs/experiments/` | Move to `docs/reference/archive/experiments` or delete; these are forward-looking or legacy notes, not primary flows |
| `docs/refactor/` | Move to `docs/reference/archive/refactor` or delete; same as above |
| `docs/debug/` | Keep only if actively used; else move to reference/archive or remove |

### 3.3 Keep (current structure)

- **docs/start/** — Getting started, CEO quickstart, AgentForge channels, wizard, pairing, etc. Primary entry points.
- **docs/gateway/** — Configuration, heartbeat, health, doctor, sandboxing. Core runtime.
- **docs/install/** — Install, updating, docker, nix. Core install.
- **docs/channels/** — Telegram, WhatsApp, Discord, etc. Channel reference.
- **docs/cli/** — CLI command reference.
- **docs/concepts/** — Agents, sessions, models, memory. Concept reference.
- **docs/platforms/** — macOS, Linux, Windows, fly, GCP, etc. Platform reference.
- **docs/providers/** — Model providers. Reference.
- **docs/reference/** — RELEASING, templates, api-usage-costs. Keep; trim templates if unused.
- **docs/tools/** — Browser, exec, skills. Tool reference.
- **docs/web/** — Dashboard, control UI. Web reference.
- **docs/help/** — FAQ, troubleshooting. Keep.
- **docs/hooks.md**, **docs/testing.md**, **docs/logging.md** — Keep as single-topic reference.
- **docs/index.md** — Keep; ensure it links to AgentForge (CEO quickstart, VPS, KEEP_IT_RUNNING) as in current line.

Do **not** delete entire platform areas (e.g. all of docs/channels or docs/platforms) unless you are intentionally dropping that surface; the cleanup is to remove one-offs and obsolete reports, not to remove still-relevant reference.

---

## 4. Other locations

| Item | Action |
|------|--------|
| `docs.acp.md` | If ACP is still used, keep; else remove or move to docs/reference |
| `.obsidian-vault/` | Personal Obsidian workspace; leave unless you want it removed from the repo (e.g. add to .gitignore or delete) |
| `templates/` | Venture workspace templates; keep |
| `agents/` | CEO, board, coordinator SOUL/MEMORY/LEDGER/HEARTBEAT; keep |
| `skills/` | Skill definitions; keep |
| `.agent/` | Workflows and agent notes; keep; can move DOCS_AUDIT here |

---

## 5. Branding and naming (minimal)

- **README.md:** Already mentions AgentForge and links to CEO quickstart, VPS, KEEP_IT_RUNNING. Ensure “AgentForge” is the primary product name and “OpenClaw”/“Moltbot” are the platform names in the first paragraph.
- **docs/index.md:** Already has an AgentForge line under “Start here”. No structural change; ensure links to CEO quickstart and root VPS_DEPLOYMENT_GUIDE / KEEP_IT_RUNNING work (relative or absolute URLs depending on doc site).
- **Do not** bulk-rename OpenClaw/Moltbot to AgentForge in code or in every doc; the platform name stays in platform docs; AgentForge is the use case and the main user-facing name in README and start/ flows.

---

## 6. Implementation order

1. **Backup / branch:** Create a branch (e.g. `chore/full-docs-cleanup`) so you can revert.
2. **Root removals:** Delete (or move to `archive/`) the root-level one-off docs listed in §2.1. Optionally merge HUMAN_ESCALATION_GUIDELINES and VPS_RESTART_CHECKLIST into KEEP_IT_RUNNING first.
3. **docs/ removals:** Delete or relocate `docs/DOCS_AUDIT.md`, `docs/northflank.mdx`, `docs/railway.mdx`, `docs/render.mdx` (and `docs/vps.md` if redundant).
4. **docs/ archive:** Move `docs/experiments` and `docs/refactor` to `docs/reference/archive/` (or delete). Update `docs/docs.json` or nav if it references these.
5. **Link check:** After removals, run a quick check: README, docs/index.md, docs/start/ceo-quickstart.md, docs/start/agentforge-channels.md — ensure no broken links to removed files.
6. **Changelog:** Add a short changelog entry: “Docs: full project cleanup; removed one-off reports and obsolete checklists; archived experiments/refactor.”
7. **.gitignore (optional):** If you created `archive/` and want to stop tracking it later, add `archive/` to `.gitignore` and remove from git; or keep archive in tree for one release.

---

## 7. Summary

| Area | Action |
|------|--------|
| **Root** | Remove ~30 one-off completion/review/checklist docs; keep README, KEEP_IT_RUNNING, VPS_DEPLOYMENT_GUIDE, CHANGELOG, CONTRIBUTING, AGENTS.md, LICENSE, SECURITY |
| **docs/** | Remove DOCS_AUDIT (or move to .agent), hosting one-offs (northflank, railway, render), redundant vps.md; archive experiments + refactor |
| **Naming** | Keep AgentForge as primary product name in README and start/; keep OpenClaw/Moltbot in platform docs |
| **Rest** | Keep agents/, skills/, templates/, .agent/; optional: .obsidian-vault in .gitignore or leave as-is |

This plan removes irrelevant and outdated docs while keeping a single, clear path for users and all current reference material.
