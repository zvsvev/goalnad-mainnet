#!/bin/bash
# Oracle Initialization Script
# Runs inside the OpenClaw container to configure autonomous operation

set -e

echo "🔮 Initializing GoalNad Oracle Agent..."

# Wait for OpenClaw gateway to be ready
sleep 5

# Configure OpenClaw if not already configured
if [ ! -f ~/.openclaw/openclaw.json ]; then
    echo "Setting up OpenClaw configuration..."
    openclaw setup --non-interactive || true
fi

# Add Minimax model if not configured
echo "Configuring Minimax LLM..."
openclaw models add minimax --api-key "$MINIMAX_API_KEY" || true

# Set up cron job for daily predictions at 06:00 UTC
echo "Scheduling daily Oracle predictions at 06:00 UTC..."
openclaw cron create \
  --name "oracle-daily-predictions" \
  --schedule "0 6 * * *" \
  --command "agent --skill goalnad-oracle --message 'Run daily prediction cycle: scan matches, analyze, predict, publish with 10-minute delays'" \
  || echo "Cron job may already exist"

echo "✅ Oracle initialization complete!"
echo "📅 Next prediction run: 06:00 UTC"
echo "📊 Status: openclaw status"
echo "📋 Logs: docker logs goalnad-oracle -f"
