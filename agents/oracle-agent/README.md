# GoalNad Oracle Agent - Custom Implementation

A standalone Node.js Oracle agent that makes AI-powered football predictions using Minimax API.

## Features

- ✅ **Minimax AI Integration** - Uses Minimax API for intelligent predictions
- ✅ **Railway Backend Integration** - Fetches matches and publishes predictions
- ✅ **10-Minute Delays** - Rate limiting between predictions
- ✅ **Lightweight** - Only 256MB memory required
- ✅ **Cron-Ready** - Designed for scheduled execution

## Quick Start

### 1. Set Up Environment

Create `.env.oracle` in this directory:

```bash
MINIMAX_API_KEY=your_minimax_api_key
GOALNAD_API_URL=https://goalnad-mainnet-production.up.railway.app/api
ADMIN_API_KEY=your_admin_api_key
ORACLE_WALLET=0x...
```

### 2. Test Locally

```bash
# Without Docker:
node oracle.js

# With Docker:
docker compose build
docker compose run --rm oracle
```

### 3. Deploy on VPS

```bash
# Copy this directory to VPS
scp -r oracle-agent root@your-vps:/root/goalnad/agents/

# On VPS:
cd /root/goalnad/agents/oracle-agent
docker compose build
docker compose run --rm oracle
```

### 4. Set Up Cron (Every 2 Hours)

```bash
crontab -e

# Add:
0 */2 * * * cd /root/goalnad/agents/oracle-agent && docker compose run --rm oracle >> /var/log/oracle.log 2>&1
```

## How It Works

1. **Fetch Matches** - Gets upcoming matches from Railway backend
2. **Filter** - Only predicts matches 7+ days before kickoff
3. **AI Analysis** - Calls Minimax API for each match
4. **Predict** - Generates prediction (1/X/2), exact

 score, conviction
5. **Publish** - Sends prediction to backend
6. **Delay** - Waits 10 minutes before next prediction
7. **Exit** - Clean shutdown after all predictions

## Logging

The agent logs all actions to stdout:

```
🔮 GoalNad Oracle Agent Starting...
📡 Backend: https://goalnad-mainnet-production.up.railway.app/api
👤 Oracle: 0x...

📥 Fetching matches from /matches...
✅ Found 3 eligible matches (out of 15 total)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Match 1/3: Arsenal vs Liverpool
   Kickoff: 2/18/2026, 8:00:00 PM
  🤖 Calling Minimax AI for prediction...
  🎯 Prediction: 1 (2-1) - 85% conviction
  📤 Publishing prediction to backend...
  ✅ Prediction published successfully
  ⏳ Waiting 10 minutes before next prediction...

...

✅ Oracle scan complete! Processed 3 matches
🔮 Oracle agent finished successfully
```

## Memory Usage

- **Base**: ~50MB
- **Per prediction**: ~20MB
- **Total**: **256MB** is more than enough

Compare to OpenClaw: 1GB+ (4x more!)

## Advantages Over OpenClaw

✅ **Lightweight** - 256MB vs 1GB+  
✅ **Simple** - No complex configuration  
✅ **Reliable** - No OOM crashes  
✅ **Direct** - Minimax API integration  
✅ **Debuggable** - Clear error messages  
✅ **Fast** - No framework overhead

---

**This is the production Oracle solution.** 🔮
