#!/bin/bash
# Setup systemd service for Moltbot Gateway
# Must be run with sudo

set -e

if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run with sudo"
    echo "Usage: sudo bash scripts/setup-systemd.sh"
    exit 1
fi

# Get the real user (not root)
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo ~$REAL_USER)
AGENTFORGE_DIR="$REAL_HOME/agentforge"

echo "Setting up systemd service for Moltbot Gateway..."
echo "User: $REAL_USER"
echo "Home: $REAL_HOME"
echo "AgentForge: $AGENTFORGE_DIR"
echo ""

# Check agentforge directory exists
if [ ! -d "$AGENTFORGE_DIR" ]; then
    echo "❌ AgentForge directory not found: $AGENTFORGE_DIR"
    exit 1
fi

# Create systemd service file
cat > /etc/systemd/system/moltbot-gateway.service << EOF
[Unit]
Description=Moltbot Gateway for AgentForge
After=network.target

[Service]
Type=simple
User=$REAL_USER
WorkingDirectory=$AGENTFORGE_DIR
ExecStart=/usr/bin/node $AGENTFORGE_DIR/moltbot.mjs gateway run --port 18789 --bind 0.0.0.0
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=moltbot-gateway

# Environment
Environment=NODE_ENV=production
Environment=HOME=$REAL_HOME

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: /etc/systemd/system/moltbot-gateway.service"

# Reload systemd
systemctl daemon-reload
echo "✅ Systemd reloaded"

# Enable service
systemctl enable moltbot-gateway
echo "✅ Service enabled (will start on boot)"

# Start service
systemctl start moltbot-gateway
echo "✅ Service started"

# Show status
echo ""
echo "Service status:"
systemctl status moltbot-gateway --no-pager

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Moltbot Gateway is now running!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status moltbot-gateway   # Check status"
echo "  sudo systemctl restart moltbot-gateway  # Restart"
echo "  sudo systemctl stop moltbot-gateway     # Stop"
echo "  sudo systemctl start moltbot-gateway    # Start"
echo "  sudo journalctl -u moltbot-gateway -f   # View logs"
echo ""
