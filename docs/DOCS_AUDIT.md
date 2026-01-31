# Docs audit (outdated content, structure, links, naming)

Short list of findings and recommended updates. Use this to prioritize cleanup.

## 1. Outdated content

- **Product naming:** Most of `docs/` is **Moltbot** (platform) docs; **AgentForge** is the autonomous business-builder use case. AgentForge-specific entry points: `docs/start/ceo-quickstart.md`, `docs/start/agentforge-channels.md`, and root-level `VPS_DEPLOYMENT_GUIDE.md`, `KEEP_IT_RUNNING.md`. No need to rename Moltbot to AgentForge everywhere; keep platform docs as Moltbot and ensure AgentForge flows (VPS, CEO quickstart, channels) are clearly linked.
- **Paths:** Config paths `~/.clawdbot/` and `~/.moltbot/` both appear; AgentForge init may use either. VPS_DEPLOYMENT_GUIDE and agentforge-channels already mention both; leave as-is unless init is standardized.
- **Deprecated:** No systematic scan for deprecated features; `docs/refactor/` and `docs/experiments/` contain forward-looking or legacy notes — treat as reference, not primary flows.

## 2. Structure and redundancy

- **Root vs docs/:** Primary AgentForge guides (`VPS_DEPLOYMENT_GUIDE.md`, `KEEP_IT_RUNNING.md`) live at **repo root**, not under `docs/`. That is intentional so they are easy to find in the repo; if the doc site (Mintlify) only publishes `docs/`, consider adding short landing pages under `docs/start/` that link to these root files or to the deployed URLs.
- **Overlap:** `docs/start/getting-started.md` (general Moltbot) vs `docs/start/ceo-quickstart.md` (AgentForge) — clear separation; no consolidation needed.
- **Duplicate concepts:** Concepts like gateway, channels, models are referenced across many files; no single “duplicate” doc identified. Keep single source of truth per topic (e.g. `docs/gateway/configuration.md`).

## 3. Links and cross-references

- **Fixed:** `docs/start/ceo-quickstart.md` had a broken link to `/configuration/budget` (no such page). Updated to `/gateway/configuration` with a note that budget is configured there.
- **Root-level links from docs/:** In `docs/start/agentforge-channels.md`, links to `VPS_DEPLOYMENT_GUIDE` and `KEEP_IT_RUNNING` use paths like `/VPS_DEPLOYMENT_GUIDE`. On GitHub these resolve to repo root; on Mintlify they may 404 if only `docs/` is mounted. Consider relative links from `docs/start/` to `../../VPS_DEPLOYMENT_GUIDE.md` for GitHub, or add redirects/landing pages in the doc site.
- **Mintlify anchors:** Per CLAUDE.md, avoid em dashes and apostrophes in headings; use root-relative paths without `.md`. Apply when touching headings or adding new cross-references.

## 4. Naming and flows

- **AgentForge:** Use “AgentForge” for the product/use case (Board + CEO + workers, VPS, LEDGER, cron). Use “Moltbot” for the platform (gateway, channels, CLI, models).
- **Primary flows for new users:** (1) **VPS deploy** → VPS_DEPLOYMENT_GUIDE → KEEP_IT_RUNNING. (2) **Quick local** → docs/start/ceo-quickstart. (3) **Channels (Telegram/WhatsApp)** → docs/start/agentforge-channels → docs/channels/telegram, docs/channels/whatsapp.
- **Index:** `docs/index.md` is Moltbot-focused. Adding one line or a small “AgentForge” block (with links to ceo-quickstart and VPS_DEPLOYMENT_GUIDE) would align naming and give new users a clear path.

## Summary

- Fix broken link: `/configuration/budget` → `/gateway/configuration`.
- Optionally: add AgentForge entry point line(s) to `docs/index.md`; ensure root guides (VPS_DEPLOYMENT_GUIDE, KEEP_IT_RUNNING) are linked from docs/start/ or index.
- Keep Moltbot as platform name in most of docs/; keep AgentForge as the autonomous business-builder name in start/ and root guides.
