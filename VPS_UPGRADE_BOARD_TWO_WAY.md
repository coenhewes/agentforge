# VPS upgrade: two-way board meeting

**Use this when AgentForge is already deployed and you only want the two-way consensus flow (shared analyst report).**

Config, gateway, and cron are unchanged. Only repo scripts are updated.

**Live TUI:** Run `./scripts/board-meeting.sh --tui` for a real-time view of the board discussion (phase, current agent, preview of each response). Use when running interactively; cron should keep using `./scripts/board-meeting.sh` without `--tui`.

---

## On the VPS (as `agentforge`)

```bash
cd ~/agentforge
git pull --rebase origin main
chmod +x scripts/board-get-session-message.mjs
```

**If Git says "You have unstaged changes":**  
Check what changed: `git status` and `git diff`. If you don’t need those local edits (typical when the VPS should match the repo), discard them and pull:

```bash
cd ~/agentforge
git restore .
git pull --rebase origin main
chmod +x scripts/board-get-session-message.mjs
```

No gateway restart. Next board run (e.g. 9am cron) uses the new flow.

---

## Quick test

```bash
cd ~/agentforge
./scripts/board-meeting.sh
```

If the analyst hasn’t run yet, the helper may return empty once; the script retries. Check logs to confirm the six members get the shared analyst brief.

---

## If you don’t use Git on the VPS

From your **local machine** (replace `agentforge@VPS_IP`):

```bash
scp scripts/board-get-session-message.mjs scripts/board-meeting.sh agentforge@VPS_IP:~/agentforge/scripts/
```

Then on the VPS:

```bash
chmod +x ~/agentforge/scripts/board-get-session-message.mjs
```
