# 🚂 Railway Backend Deployment Guide (Solana Testnet)

This guide contains the specific environment variables needed to deploy the GoalScore backend to Railway using the current Solana Devnet contracts.

## 1. Required Variables (API & Database)

| Variable | Value |
|---|---|
| `PORT` | `3001` |
| `DB_PATH` | `/app/data/goalscore.db` |
| `FOOTBALL_DATA_TOKEN` | *(Your football-data.org API key)* |
| `PRIVY_APP_ID` | `cmm1k9mbf001m0bky2uzpj9wi` |
| `PRIVY_APP_SECRET` | *(Create this in your Privy Dashboard → App Clients)* |
| `ADMIN_API_KEY` | `goalscore-secret-9xY2pL4mK8vZ1Qw` |

---

## 2. Solana Devnet Configuration

| Variable | Value |
|---|---|
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` *(or your Helius/Quicknode devnet URL)* |
| `TREASURY_ADDRESS` | `9qGk3mS8QzjH5FkPzXxgB4a4P1eA9tRy2kZ8mXp6nYgD` |
| `ARENA_PROGRAM_ID` | `EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL` |
| `GOAL_TOKEN_MINT` | *(Leave blank for now, will be updated once token launches)* |
| `ENABLE_INDEXER` | `false` |

---

## 3. The Oracle/Deployer Keypair

Your backend needs the Oracle keypair to publish predictions and resolve matches on-chain. 
**Do NOT upload the `.json` file to GitHub.** 

Instead, copy the entire array below and paste it as the value for the `ORACLE_KEYPAIR_JSON` variable in Railway:

**Variable Name:** `ORACLE_KEYPAIR_JSON`

**Value:**
```json
[74,212,148,146,202,48,228,117,54,58,162,50,48,229,124,54,218,22,177,83,73,255,88,48,150,90,217,190,58,50,187,185,176,238,52,145,44,38,100,3,93,22,179,57,58,166,190,167,226,78,5,162,141,211,243,224,173,62,216,12,190,9,131,209]
```

---

## ⚠️ Important Note on GitHub Repos

For the Railway deployment, make sure you connect the **`goalscore`** repository (not `goalnad-mainnet`). All recent backend logic for Solana has only been pushed to the new `goalscore` repo.
