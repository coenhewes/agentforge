#!/bin/bash
# AgentForge VPS Quick Setup Script
# Run this on a fresh Ubuntu 22.04 LTS VPS

set -e

echo "═══════════════════════════════════════════════════════"
echo "  AgentForge VPS Quick Setup"
echo "  Ubuntu 22.04 LTS"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script should be run as root for initial setup"
    echo "Run: sudo bash VPS_QUICK_START.sh"
    exit 1
fi

# Get non-root username
read -p "Enter username to create (default: agentforge): " USERNAME
USERNAME=${USERNAME:-agentforge}

echo ""
echo "Step 1: Creating user $USERNAME..."
if id "$USERNAME" &>/dev/null; then
    echo "✅ User $USERNAME already exists"
else
    adduser --gecos "" $USERNAME
    usermod -aG sudo $USERNAME
    echo "✅ User $USERNAME created"
fi

echo ""
echo "Step 2: Updating system..."
apt update
apt upgrade -y
echo "✅ System updated"

echo ""
echo "Step 3: Installing Node.js 22.x..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 22 ]; then
        echo "✅ Node.js $NODE_VERSION already installed"
    else
        echo "⚠️  Node.js version too old, upgrading..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt install -y nodejs
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi
echo "✅ Node.js $(node --version) installed"

echo ""
echo "Step 4: Installing pnpm..."
npm install -g pnpm
echo "✅ pnpm $(pnpm --version) installed"

echo ""
echo "Step 5: Installing dependencies..."
apt install -y git build-essential python3 \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
echo "✅ Dependencies installed"

echo ""
echo "Step 6: Installing UFW firewall..."
apt install -y ufw
ufw --force enable
ufw allow 22/tcp
ufw allow 18789/tcp
echo "✅ Firewall configured (SSH + Gateway)"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Base system setup complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps (run as $USERNAME):"
echo ""
echo "  1. Switch to $USERNAME:"
echo "     su - $USERNAME"
echo ""
echo "  2. Run user setup script:"
echo "     bash <(curl -s https://raw.githubusercontent.com/moltbot/moltbot/main/VPS_USER_SETUP.sh)"
echo ""
echo "  Or manually:"
echo "     cd ~"
echo "     git clone https://github.com/moltbot/moltbot.git agentforge"
echo "     cd agentforge"
echo "     pnpm install"
echo "     pnpm build"
echo "     node moltbot.mjs init:agentforge"
echo ""
