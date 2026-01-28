#!/bin/bash
# AgentForge User Setup Script
# Run this as the agentforge user (NOT root)

set -e

echo "═══════════════════════════════════════════════════════"
echo "  AgentForge User Setup"
echo "  Run as: $(whoami)"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check not running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Do NOT run this script as root"
    echo "Switch to your user first: su - agentforge"
    exit 1
fi

echo "Step 1: Cloning AgentForge..."
cd ~
if [ -d "agentforge" ]; then
    echo "✅ agentforge directory already exists"
    cd agentforge
    git pull
else
    git clone https://github.com/moltbot/moltbot.git agentforge
    cd agentforge
fi
echo "✅ Repository ready"

echo ""
echo "Step 2: Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"

echo ""
echo "Step 3: Building project..."
pnpm build
echo "✅ Project built"

echo ""
echo "Step 4: Installing Playwright browsers..."
npx playwright install chromium
echo "✅ Playwright installed"

echo ""
echo "Step 5: Initializing AgentForge..."
node moltbot.mjs init:agentforge
echo "✅ AgentForge initialized"

echo ""
echo "Step 6: Making scripts executable..."
chmod +x scripts/*.sh
echo "✅ Scripts ready"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  User setup complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "  1. Configure AI provider (choose one):"
echo ""
echo "     For Claude (recommended):"
echo "       node moltbot.mjs auth choice"
echo "       # Follow prompts, enter your Anthropic API key"
echo ""
echo "     Or edit config directly:"
echo "       nano ~/.moltbot/moltbot.json"
echo "       # Add your API key under models.providers.anthropic.apiKey"
echo ""
echo "  2. Setup systemd service (requires sudo):"
echo "       sudo bash ~/agentforge/scripts/setup-systemd.sh"
echo ""
echo "  3. Install cron jobs:"
echo "       crontab -e"
echo "       # Copy contents from ~/.moltbot/agentforge-cron.txt"
echo ""
echo "  4. Test the system:"
echo "       node moltbot.mjs agent --agent ceo --message 'Hello'"
echo ""
echo "Full guide: ~/agentforge/VPS_DEPLOYMENT_GUIDE.md"
echo ""
