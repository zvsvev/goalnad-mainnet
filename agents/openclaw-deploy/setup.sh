#!/bin/bash
# GoalNad OpenClaw VPS Setup Script
# Usage: curl -sSL <raw-url> | bash
# Or: chmod +x setup.sh && ./setup.sh

set -e

echo "╔══════════════════════════════════════════════╗"
echo "║   GoalNad OpenClaw VPS Setup                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── 1. Install Docker ───────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. You may need to re-login for group changes."
else
    echo "✅ Docker already installed: $(docker --version)"
fi

# ─── 2. Install Docker Compose ───────────────────────────────────────
if ! docker compose version &> /dev/null; then
    echo "📦 Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin 2>/dev/null \
        || sudo yum install -y docker-compose-plugin 2>/dev/null \
        || echo "⚠️  Auto-install failed. Install docker-compose-plugin manually."
else
    echo "✅ Docker Compose: $(docker compose version)"
fi

# ─── 3. Install Node.js (for wallet setup) ───────────────────────────
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js: $(node --version)"
fi

# ─── 4. Clone & Setup ────────────────────────────────────────────────
REPO_DIR="$HOME/goalnad"

if [ -d "$REPO_DIR" ]; then
    echo "📂 GoalNad repo exists at $REPO_DIR — pulling latest..."
    cd "$REPO_DIR" && git pull
else
    echo "📂 Clone your GoalNad repo to $REPO_DIR first!"
    echo "   git clone <your-repo-url> $REPO_DIR"
    exit 1
fi

# ─── 5. Generate OpenClaw Skills & Docker Compose ─────────────────────
cd "$REPO_DIR/agents"

echo ""
echo "🔧 Installing dependencies..."
cd agent-runner && npm install && cd ..

echo ""
echo "🔧 Generating OpenClaw skills & docker-compose..."
npx tsx generate.ts

# ─── 6. Generate Wallets ─────────────────────────────────────────────
echo ""
echo "🔑 Generating agent wallets..."
cd agent-runner
npx tsx src/setup-wallets.ts
cd ..

# ─── 7. Setup .env ───────────────────────────────────────────────────
cd openclaw-deploy

if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "⚠️  Created openclaw-deploy/.env from template"
    echo "   EDIT THIS FILE before starting agents:"
    echo "   - Set MINIMAX_API_KEY"
    echo "   - Paste wallet addresses from step 6"
    echo "   - Verify GOALNAD_API_URL"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "✅ SETUP COMPLETE!"
echo "══════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Edit openclaw-deploy/.env with wallet addresses + API key"
echo "  2. Fund agent wallets with testnet \$GOAL"
echo "  3. Start all agents: cd openclaw-deploy && docker compose up -d"
echo "  4. Watch logs: docker compose logs -f"
echo ""
