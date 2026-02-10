#!/bin/sh
# Oracle Runner - Lightweight supervisor for continuous monitoring
# Runs openclaw agent directly, avoiding heavy gateway mode

echo "🔮 GoalNad Oracle - Starting Continuous Monitoring"
echo "Memory limit: $(($(cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo 1073741824) / 1024 / 1024))MB"
echo ""

# Set PATH to locate openclaw binary
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Main loop
while true; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Oracle Scan - $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Run Oracle agent with --local flag to avoid gateway
    node /app/openclaw.mjs agent \
        --skill goalnad-oracle \
        --message "Scan upcoming matches (7+ days). Analyze and publish predictions with 10-minute delays between each." \
        --local \
        2>&1 || echo "⚠️  Agent run failed, will retry in 2 hours"
    
    echo ""
    echo "✅ Scan complete"
    echo "⏳ Sleeping 2 hours before next scan..."
    echo "   Next scan: $(date -u -d '+2 hours' '+%Y-%m-%d %H:%M:%S UTC' 2>/dev/null || date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo ""
    
    sleep 7200  # 2 hours
done
