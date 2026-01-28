---
name: dev-orchestrator
description: "Orchestrate development work across Claude Code, Codex, Cursor, and other coding tools. Intelligent routing, parallel development, and project management for AI-assisted coding."
metadata: {"moltbot":{"emoji":"🔧","requires":{"anyBins":["claude","codex","opencode","pi","cursor"]}}}
---

# Development Orchestrator Skill

Coordinate AI coding tools for maximum development velocity.

## Available Development Tools

### Claude Code (claude)
Best for: Complex reasoning, architecture decisions, careful refactoring
```bash
bash pty:true workdir:~/project command:"claude 'Your task here'"
```

### Codex CLI (codex)
Best for: Fast code generation, quick fixes, scaffolding
```bash
bash pty:true workdir:~/project command:"codex exec 'Your task here'"
# Full auto mode (sandboxed but auto-approves):
bash pty:true workdir:~/project command:"codex exec --full-auto 'Your task'"
# YOLO mode (no sandbox, no approvals - fastest):
bash pty:true workdir:~/project command:"codex --yolo 'Your task'"
```

### Pi Coding Agent (pi)
Best for: Multi-provider flexibility, local models
```bash
bash pty:true workdir:~/project command:"pi 'Your task here'"
# Different provider:
bash pty:true command:"pi --provider openai --model gpt-4o -p 'Your task'"
```

### OpenCode (opencode)
Best for: Alternative coding agent
```bash
bash pty:true workdir:~/project command:"opencode run 'Your task'"
```

### Cursor MCP
Best for: IDE integration, file operations, browser testing
Available via MCP tools for programmatic IDE control.

### Copilot Proxy
Access VS Code's Copilot models (GPT-5.2, Claude, etc.) as an API endpoint.
Enable with: `moltbot plugins enable copilot-proxy`

## Tool Selection Guide

| Task Type | Recommended Tool | Why |
|-----------|------------------|-----|
| Complex architecture | Claude Code | Best reasoning |
| Quick feature | Codex --full-auto | Fast, reliable |
| Bug fix | Codex exec | Quick turnaround |
| Refactoring | Claude Code | Careful analysis |
| Scaffolding | Codex --yolo | Fastest generation |
| Multi-file changes | Claude Code | Better context |
| Testing | Any | All handle tests well |
| Documentation | Claude Code | Better writing |

## Critical: PTY Mode Required

**Always use `pty:true`** when running coding agents. They are interactive terminal applications that need a pseudo-terminal.

```bash
# ✅ Correct
bash pty:true workdir:~/project command:"codex exec 'task'"

# ❌ Wrong - agent may hang or produce broken output
bash command:"codex exec 'task'"
```

## Background Mode for Long Tasks

For tasks that take time, use background mode:

```bash
# Start in background
bash pty:true workdir:~/project background:true command:"codex --yolo 'Build complete feature'"
# Returns: sessionId

# Monitor progress
process action:log sessionId:XXX

# Check if done
process action:poll sessionId:XXX

# Send input if needed
process action:submit sessionId:XXX data:"yes"

# Kill if stuck
process action:kill sessionId:XXX
```

## Auto-Notify on Completion

Add wake notifications for immediate feedback:

```bash
bash pty:true workdir:~/project background:true command:"codex --yolo exec 'Build feature X.

When completely finished, run this command to notify me:
moltbot gateway wake --text \"Done: Built feature X - [brief summary]\" --mode now'"
```

## Parallel Development with Git Worktrees

For working on multiple features/issues simultaneously:

```bash
# Create worktrees for parallel work
git worktree add -b feature/auth /tmp/auth main
git worktree add -b feature/api /tmp/api main
git worktree add -b fix/bug-42 /tmp/bug-42 main

# Launch agents in parallel (all with PTY!)
bash pty:true workdir:/tmp/auth background:true command:"codex --yolo 'Implement auth system'"
bash pty:true workdir:/tmp/api background:true command:"codex --yolo 'Build REST API'"
bash pty:true workdir:/tmp/bug-42 background:true command:"codex exec 'Fix issue #42'"

# Monitor all
process action:list

# When done, create PRs
cd /tmp/auth && git push -u origin feature/auth
gh pr create --repo user/repo --head feature/auth --title "feat: auth system"

# Cleanup
git worktree remove /tmp/auth
git worktree remove /tmp/api
git worktree remove /tmp/bug-42
```

## Project Setup Pattern

For new projects:

```bash
# Create project directory
mkdir -p ~/Projects/my-new-project
cd ~/Projects/my-new-project
git init

# Use Codex to scaffold
bash pty:true workdir:~/Projects/my-new-project command:"codex exec --full-auto 'Create a Node.js Express API with:
- TypeScript setup
- Basic CRUD structure
- SQLite database
- Error handling
- README with setup instructions'"

# Push to GitHub
gh repo create my-new-project --public --source=.
git push -u origin main
```

## PR Review Workflow

Review PRs safely (never in the main project directory):

```bash
# Clone to temp for review
REVIEW_DIR=$(mktemp -d)
git clone https://github.com/user/repo.git $REVIEW_DIR
cd $REVIEW_DIR && gh pr checkout 42

# Review with Codex
bash pty:true workdir:$REVIEW_DIR command:"codex review --base origin/main"

# Or use Claude Code for deeper analysis
bash pty:true workdir:$REVIEW_DIR command:"claude 'Review this PR. Check for bugs, security issues, and code quality. Provide detailed feedback.'"

# Post review to GitHub
gh pr review 42 --comment --body "AI Review: [findings]"

# Cleanup
trash $REVIEW_DIR
```

## Batch Issue Fixing

Fix multiple issues in parallel:

```bash
# Fetch all PR refs
git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'

# Create worktrees for each issue
for issue in 42 43 44; do
  git worktree add -b fix/issue-$issue /tmp/issue-$issue main
done

# Launch fixes in parallel
bash pty:true workdir:/tmp/issue-42 background:true command:"codex --yolo 'Fix issue #42: [description]'"
bash pty:true workdir:/tmp/issue-43 background:true command:"codex --yolo 'Fix issue #43: [description]'"
bash pty:true workdir:/tmp/issue-44 background:true command:"codex --yolo 'Fix issue #44: [description]'"

# Monitor and create PRs as they complete
process action:list
```

## Cursor Integration

### Using Cursor MCP

If Cursor is running with MCP enabled, you can control it programmatically:

```
# Open a file in Cursor
CallMcpTool server:cursor-ide-browser toolName:browser_navigate arguments:{"url":"file:///path/to/file.ts"}

# Get page snapshot for context
CallMcpTool server:cursor-ide-browser toolName:browser_snapshot
```

### Cursor Rules for Agent Coordination

Create `.cursor/rules/` in project repos to coordinate Cursor sessions with Moltbot agents:

```markdown
# .cursor/rules/agent-coordination.md

When working on this project:
1. Check for open issues in GitHub before starting
2. Create feature branches for all changes
3. Write tests for new functionality
4. Update documentation as needed
5. Create clear commit messages

Coordinate with Moltbot agents via the memory/ directory if present.
```

## Development Agent Spawning Pattern

When the CEO or PM needs development work:

```
sessions_spawn task:"You are a Developer Agent.

TOOLS AVAILABLE:
- Claude Code: bash pty:true workdir:[DIR] command:\"claude 'task'\"
- Codex CLI: bash pty:true workdir:[DIR] command:\"codex exec 'task'\"
- GitHub CLI: gh commands for repos, PRs, issues

YOUR TASK: [SPECIFIC TASK]

Requirements:
- [Requirement 1]
- [Requirement 2]

Success criteria:
- Working code
- Tests passing (if applicable)
- Code pushed to GitHub
- PR created (if applicable)

When done, wake me:
moltbot gateway wake --text 'Done: [summary]' --mode now

Report back with: what you built, repo/PR URLs, any issues encountered."
```

## Best Practices

1. **Always use PTY** - coding agents are interactive
2. **Set workdir** - keeps agents focused on the right codebase
3. **Use background for long tasks** - don't block
4. **Add wake notifications** - get immediate feedback
5. **Use worktrees for parallel work** - safe isolation
6. **Never run in Moltbot's own directory** - keep it clean
7. **Clean up temp directories** - use `trash` over `rm`
8. **Monitor with process:log** - check progress without interrupting
9. **Be patient** - don't kill processes for being "slow"

## Troubleshooting

### Agent Hangs
- Check if PTY mode is enabled
- Try killing and respawning
- Check if waiting for input (use process:submit)

### Broken Output
- Missing PTY mode is the most common cause
- Ensure pty:true is set

### Git Repo Required (Codex)
- Codex needs a git repository
- Use `git init` for scratch work

### Permission Errors
- Use `elevated:true` for host commands if sandboxed
- Check workspace permissions

---

*Use the right tool for the job. Ship fast. Iterate faster.*
