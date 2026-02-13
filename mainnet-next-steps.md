# Mainnet Migration: Next Steps

## Current Status ✅
- ✅ Phase 1: Repository cleanup completed
- ✅ Phase 2: Config updates for mainnet completed
- ✅ Repo cloned to `goalnad-mainnet`
- ✅ Vercel project created with `goalnad.fun` domain

---

## Phase 3: Complete Deployment Setup

### 3.1 Create New Railway Project for Backend

1. **Go to [Railway.app](https://railway.app)**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `zvsvev/goalnad-mainnet`
   - Set root directory to `backend/`

2. **Configure Build Settings**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Watch Paths: `backend/**`

3. **Get the Railway URL**
   - Railway will generate a URL like: `https://goalnad-backend-production.up.railway.app`
   - Save this URL for the next step

### 3.2 Update Frontend Environment Variables in Vercel

1. **Go to Vercel Dashboard** → `goalnad-mainnet` project → Settings → Environment Variables

2. **Add/Update:**
   ```
   NEXT_PUBLIC_API_URL=https://goalnad-backend-production.up.railway.app/api
   ```
   *(Replace with your actual Railway backend URL)*

3. **Redeploy** the frontend to apply changes

### 3.3 Configure Backend Environment Variables in Railway

Go to Railway project → Variables tab and add:

```env
# Blockchain (Mainnet)
MONAD_RPC_URL=<MONAD_MAINNET_RPC>
ARENA_CONTRACT_ADDRESS=<TO_BE_DEPLOYED>
GOAL_TOKEN_ADDRESS=<FROM_NAD_FUN>

# Indexer
INDEXER_START_BLOCK=<DEPLOYMENT_BLOCK_NUMBER>

# Oracle Agent
ORACLE_PRIVATE_KEY=<ORACLE_WALLET_PRIVATE_KEY>
ORACLE_ADDRESS=<ORACLE_WALLET_ADDRESS>

# Database (Railway provides this automatically)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Football Data API
FOOTBALL_DATA_API_KEY=<YOUR_API_KEY>

# Treasury
TREASURY_ADDRESS=<TREASURY_WALLET_ADDRESS>

# Port
PORT=3001
```

> [!CAUTION]
> Do NOT deploy the backend yet — wait until Phase 4 is complete and you have the mainnet contract addresses.

---

## Phase 4: On-Chain Migration 🚀

### 4.1 Prerequisites

**Before starting, ensure you have:**
- [ ] Monad mainnet RPC URL
- [ ] Sufficient MON tokens for gas fees (contract deployment + testing)
- [ ] Deployer wallet private key (with MON balance)
- [ ] Oracle wallet address
- [ ] Treasury wallet address

### 4.2 Create $GOAL Token on nad.fun

1. **Visit [nad.fun](https://nad.fun)** (Monad mainnet token launcher)

2. **Create Token:**
   - Token Name: `GoalNad`
   - Token Symbol: `GOAL`
   - Follow the nad.fun creation flow

3. **Save the Token Address:**
   ```
   GOAL_TOKEN_ADDRESS=0x...
   ```
   > [!IMPORTANT]
   > You MUST have this address before deploying the contract!

### 4.3 Deploy GoalNadArena Contract

1. **Navigate to contracts directory:**
   ```bash
   cd /Users/ulinnuha.eth/goalnad-mainnet/contracts
   ```

2. **Set environment variables** (or create `.env` in contracts folder):
   ```bash
   export MONAD_MAINNET_RPC="<YOUR_MONAD_MAINNET_RPC>"
   export DEPLOYER_PRIVATE_KEY="<YOUR_DEPLOYER_PRIVATE_KEY>"
   export GOAL_TOKEN_ADDRESS="<FROM_NAD_FUN>"
   export ORACLE_ADDRESS="<YOUR_ORACLE_WALLET>"
   export TREASURY_ADDRESS="<YOUR_TREASURY_WALLET>"
   ```

3. **Deploy the contract:**
   ```bash
   forge create --rpc-url $MONAD_MAINNET_RPC \
     --private-key $DEPLOYER_PRIVATE_KEY \
     src/GoalNadArena.sol:GoalNadArena \
     --constructor-args $GOAL_TOKEN_ADDRESS $ORACLE_ADDRESS $TREASURY_ADDRESS
   ```

4. **Save the deployment output:**
   - Contract Address: `0x...`
   - Deployment Block Number: `123456`
   - Transaction Hash: `0x...`

5. **Verify on Monadscan** (optional but recommended):
   ```bash
   forge verify-contract \
     --rpc-url $MONAD_MAINNET_RPC \
     --verifier-url https://explorer.monad.xyz/api \
     <CONTRACT_ADDRESS> \
     src/GoalNadArena.sol:GoalNadArena \
     --constructor-args $(cast abi-encode "constructor(address,address,address)" $GOAL_TOKEN_ADDRESS $ORACLE_ADDRESS $TREASURY_ADDRESS)
   ```

### 4.4 Update Backend Environment Variables

Go back to **Railway** → Variables and update:

```env
ARENA_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
GOAL_TOKEN_ADDRESS=<NAD_FUN_TOKEN_ADDRESS>
INDEXER_START_BLOCK=<DEPLOYMENT_BLOCK_NUMBER>
```

**Now deploy the backend!** Railway will automatically restart with the new variables.

### 4.5 Verify Backend is Running

1. **Check Railway logs** for:
   ```
   ✓ Connected to database
   ✓ Event indexer started from block <DEPLOYMENT_BLOCK_NUMBER>
   ✓ Server listening on port 3001
   ```

2. **Test API endpoint:**
   ```bash
   curl https://goalnad-backend-production.up.railway.app/api/matches
   ```
   Should return `[]` (empty array, no matches yet)

---

## Phase 5: End-to-End Testing 🧪

### 5.1 Test Oracle Prediction Flow

1. **Ensure Oracle Agent has:**
   - [ ] $GOAL tokens (for gas)
   - [ ] MON tokens (for gas fees)
   - [ ] `ORACLE_PRIVATE_KEY` set in backend

2. **Manually trigger or wait for Oracle to publish prediction:**
   - Oracle monitors fixture schedule
   - Publishes prediction 7 days before kickoff
   - Calls `publishPrediction(matchId, prediction, homeScore, awayScore)` on-chain

3. **Verify on Monadscan:**
   - Check `PredictionPublished` event
   - Verify match data is correct

4. **Verify in Backend DB:**
   ```bash
   # Check Railway logs or query DB
   # Should see: "Indexed PredictionPublished event for match <matchId>"
   ```

5. **Verify on Frontend:**
   - Visit `https://goalnad.fun`
   - Should see the match with oracle prediction

### 5.2 Test Agent Bidding Flow

1. **Prepare a test agent:**
   - Create a wallet with MON (gas) and $GOAL tokens
   - Approve $GOAL spending: `approve(ARENA_CONTRACT_ADDRESS, <LARGE_AMOUNT>)`

2. **Place a bid:**
   ```javascript
   // Using viem or ethers
   await arenaContract.write.bid([matchId, 1000n * 10n**18n]) // 1000 GOAL
   ```

3. **Verify on Monadscan:**
   - Check `BidPlaced` event
   - Verify `totalBid` and `amount` values

4. **Verify in Backend:**
   - Check logs: "Indexed BidPlaced event"
   - Query `/api/matches/<matchId>` → should show the bid

5. **Verify on Frontend:**
   - Visit `https://goalnad.fun/match/<matchId>`
   - Should see agent's bid and comment

### 5.3 Test Support Flow

1. **Ensure agent has support quota:**
   - Agent must have successfully bid on a previous match
   - Check `supportQuota` on contract or via backend

2. **Place support:**
   ```javascript
   await arenaContract.write.support([matchId])
   ```

3. **Verify indexing and frontend display**

### 5.4 Test Match Resolution

1. **Wait for match to finish** (or use a test match with past kickoff)

2. **Oracle resolves the match:**
   ```javascript
   await arenaContract.write.resolveMatch([matchId, result]) // result: 1, 0, or 2
   ```

3. **Verify:**
   - `MatchResolved` event on Monadscan
   - `luckySupporter` selected on-chain (if oracle was correct)
   - Match status updated in DB
   - Frontend shows result banner

### 5.5 Test Reward Claiming

1. **Winner calls `claimReward()`:**
   ```javascript
   await arenaContract.write.claimReward([matchId], {
     value: parseEther("0.1") // 0.1 MON claim fee
   })
   ```

2. **Verify:**
   - Winner receives $GOAL tokens (99% of pot)
   - 1% burned to `0xdead...`
   - 0.1 MON sent to treasury
   - Transaction visible on Monadscan

---

## Phase 6: Launch Checklist 🎉

### Pre-Launch
- [ ] All contracts deployed and verified on Monadscan
- [ ] Backend deployed on Railway and indexing correctly
- [ ] Frontend deployed on Vercel at `goalnad.fun`
- [ ] Oracle agent running autonomously
- [ ] House agents configured and running
- [ ] End-to-end flow tested successfully

### Launch Day
- [ ] Monitor Railway logs for errors
- [ ] Monitor Monadscan for on-chain activity
- [ ] Check frontend displays matches correctly
- [ ] Verify agent bids/supports are indexed
- [ ] Test claiming flow with real users

### Post-Launch
- [ ] Set up monitoring/alerts for backend errors
- [ ] Monitor gas usage and optimize if needed
- [ ] Collect user feedback
- [ ] Plan for scaling (if needed)

---

## Troubleshooting

### Backend Not Indexing Events
- Check `INDEXER_START_BLOCK` is set correctly
- Verify `ARENA_CONTRACT_ADDRESS` matches deployed contract
- Check Railway logs for RPC connection errors

### Frontend Not Showing Predictions
- Verify `NEXT_PUBLIC_API_URL` points to Railway backend
- Check CORS settings in backend
- Test API endpoint directly with `curl`

### Contract Calls Failing
- Ensure wallets have sufficient MON for gas
- Verify $GOAL token approvals are set
- Check contract is not paused or locked

### Agent Not Bidding
- Verify agent has $GOAL tokens and MON
- Check agent's private key is set correctly
- Review agent logs for errors

---

## Quick Reference

### Important URLs
- **Frontend:** https://goalnad.fun
- **Backend:** https://goalnad-backend-production.up.railway.app
- **Monadscan:** https://monadscan.com
- **nad.fun:** https://nad.fun

### Contract Addresses (Fill in after deployment)
```
GOAL_TOKEN_ADDRESS=0x...
ARENA_CONTRACT_ADDRESS=0x...
ORACLE_ADDRESS=0x...
TREASURY_ADDRESS=0x...
```

### Key Commands
```bash
# Deploy contract
forge create --rpc-url $RPC --private-key $PK src/GoalNadArena.sol:GoalNadArena --constructor-args $GOAL $ORACLE $TREASURY

# Check contract on Monadscan
open https://monadscan.com/address/<CONTRACT_ADDRESS>

# Test backend API
curl https://goalnad-backend-production.up.railway.app/api/matches

# View Railway logs
railway logs
```

---

**Next Step:** Start with Phase 3.1 (Create Railway project) and work through each section sequentially. Good luck! 🚀
