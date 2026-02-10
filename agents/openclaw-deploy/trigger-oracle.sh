#!/bin/bash
# Oracle Prediction Trigger Script
# Run this via cron to trigger predictions every 2 hours

echo "🔮 Triggering Oracle prediction scan..."

docker exec goalnad-oracle openclaw agent \
  --session-id oracle \
  --message "Scan upcoming matches (7+ days before kickoff). Analyze each match and publish predictions with 10-minute delays between each prediction." \
  --local

echo "✅ Oracle trigger complete"
