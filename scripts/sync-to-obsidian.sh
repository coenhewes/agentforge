#!/bin/bash
# Sync AgentForge agent memory to Obsidian vault for human auditing

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

VAULT_DIR=".obsidian-vault"
AGENT_DIR="$HOME/.moltbot/agents"
HUMAN_REQUESTS_DIR="$HOME/.moltbot/human-requests"

echo "[$(date)] Starting Obsidian vault sync..." >&2

# Create vault if it doesn't exist
mkdir -p "$VAULT_DIR"

# Create all required vault directories
echo "Creating vault directories..." >&2
mkdir -p "$VAULT_DIR/00-Dashboard"
mkdir -p "$VAULT_DIR/01-Board-Meetings"
mkdir -p "$VAULT_DIR/02-Ventures/Active"
mkdir -p "$VAULT_DIR/02-Ventures/Completed"
mkdir -p "$VAULT_DIR/02-Ventures/Killed"
mkdir -p "$VAULT_DIR/03-Agents/CEO"
mkdir -p "$VAULT_DIR/03-Agents/Coordinator"
mkdir -p "$VAULT_DIR/03-Agents/Market-Analyst"
mkdir -p "$VAULT_DIR/03-Agents/CFO"
mkdir -p "$VAULT_DIR/03-Agents/CTO"
mkdir -p "$VAULT_DIR/03-Agents/CMO"
mkdir -p "$VAULT_DIR/03-Agents/COO"
mkdir -p "$VAULT_DIR/03-Agents/Risk-Manager"
mkdir -p "$VAULT_DIR/03-Agents/Innovation-Lead"
mkdir -p "$VAULT_DIR/04-Intelligence"
mkdir -p "$VAULT_DIR/05-Learnings"
mkdir -p "$VAULT_DIR/06-Human-Requests/Active"
mkdir -p "$VAULT_DIR/06-Human-Requests/Resolved"
mkdir -p "$VAULT_DIR/07-Meta"

# Function to convert agent MEMORY.md to Obsidian format
sync_agent_memory() {
  local agent=$1
  local agent_name=$2
  
  if [ ! -f "$AGENT_DIR/$agent/MEMORY.md" ]; then
    return
  fi
  
  echo "  Syncing $agent_name memory..." >&2
  
  # Copy memory snapshot
  cp "$AGENT_DIR/$agent/MEMORY.md" "$VAULT_DIR/03-Agents/$agent_name/Memory Snapshot.md"
  
  # Update last sync timestamp
  echo "" >> "$VAULT_DIR/03-Agents/$agent_name/Memory Snapshot.md"
  echo "---" >> "$VAULT_DIR/03-Agents/$agent_name/Memory Snapshot.md"
  echo "*Last synced: $(date)*" >> "$VAULT_DIR/03-Agents/$agent_name/Memory Snapshot.md"
}

# Sync all agent memories
echo "Syncing agent memories..." >&2
sync_agent_memory "ceo" "CEO"
sync_agent_memory "coordinator" "Coordinator"
sync_agent_memory "board/analyst" "Market-Analyst"
sync_agent_memory "board/cfo" "CFO"
sync_agent_memory "board/cto" "CTO"
sync_agent_memory "board/cmo" "CMO"
sync_agent_memory "board/coo" "COO"
sync_agent_memory "board/risk" "Risk-Manager"
sync_agent_memory "board/innovation" "Innovation-Lead"

# Sync human requests
echo "Syncing human requests..." >&2
if [ -d "$HUMAN_REQUESTS_DIR" ]; then
  for request_file in "$HUMAN_REQUESTS_DIR"/*.json; do
    if [ ! -f "$request_file" ]; then
      continue
    fi
    
    # Parse JSON and convert to Markdown
    # (Simplified - in real implementation, use jq to parse properly)
    request_id=$(basename "$request_file" .json)
    
    # Determine folder based on status
    status=$(cat "$request_file" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "pending")
    
    if [ "$status" = "pending" ]; then
      target_dir="$VAULT_DIR/06-Human-Requests/Active"
    else
      target_dir="$VAULT_DIR/06-Human-Requests/Resolved"
    fi
    
    # Copy to vault (simplified - should convert to MD template)
    cp "$request_file" "$target_dir/${request_id}.json" 2>/dev/null || true
  done
fi

# Update dashboard with current stats
echo "Updating dashboard..." >&2

# Count active ventures (simplified - should query actual data)
active_ventures=$(find "$VAULT_DIR/02-Ventures/Active" -name "*.md" -type f | wc -l | tr -d ' ')

# Count board meetings
total_meetings=$(find "$VAULT_DIR/01-Board-Meetings" -name "*.md" -type f ! -name "*Template*" | wc -l | tr -d ' ')

# Update dashboard timestamp
sed -i.bak "s/\*Last Updated:.*\*/\*Last Updated: $(date '+%Y-%m-%d %H:%M:%S')\*/" "$VAULT_DIR/00-Dashboard/Dashboard.md" 2>/dev/null || true

echo "[$(date)] Obsidian vault sync complete!" >&2
echo "[$(date)] Active ventures: $active_ventures | Total meetings: $total_meetings" >&2
