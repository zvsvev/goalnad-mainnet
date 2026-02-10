#!/bin/bash
# Oracle Continuous Monitoring Script
# Runs forever in a loop, scanning for new matches every 2 hours

echo "🔮 Starting GoalNad Oracle - Continuous Monitoring Mode"

while true; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Oracle Scan Cycle - $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Trigger Oracle agent to scan and predict
    openclaw agent \
        --skill goalnad-oracle \
        --message "Scan for matches needing predictions (7+ days before kickoff). Analyze, predict, and publish with 10-minute delays between each prediction." \
        --local
    
    echo ""
    echo "✅ Scan cycle complete"
    echo "⏳ Sleeping for 2 hours before next scan..."
    echo "   Next scan: $(date -u -d '+2 hours' +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
    
    # Sleep for 2 hours (7200 seconds)
    sleep 7200
done
