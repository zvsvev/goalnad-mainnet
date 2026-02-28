# Mainnet Migration Plan

## Overview

Migrate GoalScore.fun from Solana **devnet** to **mainnet-beta**. This requires changes across the smart contract, backend, frontend, and oracle agent.

---

## Pre-Migration Checklist

- [ ] Smart contract audited / thoroughly tested on devnet
- [ ] Oracle agent tested end-to-end on devnet (predict → bet → resolve → claim)
- [ ] Backend stable with no critical bugs
- [ ] Frontend settings and profile features verified working on devnet
- [ ] $GOAL token deployed on mainnet (pump.fun)
- [ ] Treasury wallet funded with SOL for gas on mainnet

---

## 1. Smart Contract

| Task | Details |
|------|---------|
| Deploy `goalscore-arena` to mainnet | `anchor deploy --provider.cluster mainnet` |
| Update Program ID | New mainnet program ID in `declare_id!()` and `Anchor.toml` |
| Set authority | Ensure Oracle wallet and Treasury wallet are correctly set |
| Verify on Solscan | Submit verified source on Solscan/Solana Explorer |

---

## 2. Backend (Railway)

### Environment Variables to Update

```env
# Solana
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<MAINNET_KEY>
ARENA_PROGRAM_ID=<NEW_MAINNET_PROGRAM_ID>
GOAL_TOKEN_MINT=<MAINNET_GOAL_TOKEN_MINT>
TREASURY_WALLET=<MAINNET_TREASURY_WALLET>

# Frontend URL
FRONTEND_URL=https://goalscore.fun
```

### Code Changes

- [ ] Update default Solana cluster from `devnet` to `mainnet-beta` in `config.ts`
- [ ] Update Solscan links from `?cluster=devnet` to mainnet (no query param needed)
- [ ] Ensure indexer listens to mainnet RPC
- [ ] Verify rate limits are appropriate for mainnet traffic

---

## 3. Frontend (Vercel)

### Environment Variables to Update

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<MAINNET_KEY>
NEXT_PUBLIC_GOAL_TOKEN_MINT=<MAINNET_GOAL_TOKEN_MINT>
NEXT_PUBLIC_TREASURY_ADDRESS=<MAINNET_TREASURY_ADDRESS>
NEXT_PUBLIC_API_URL=https://goalscore-production.up.railway.app
```

### Code Changes

- [ ] Remove `goalscore.fun → devnet.goalscore.fun` redirect from `next.config.ts`
- [ ] Update all Solscan links to remove `?cluster=devnet`
- [ ] Update Privy config to mainnet (if applicable)
- [ ] Verify $GOAL balance hook uses correct mainnet mint

### Domain

- [ ] Set `goalscore.fun` as primary domain in Vercel
- [ ] Remove or redirect `devnet.goalscore.fun` to `goalscore.fun`

---

## 4. Oracle Agent

- [ ] Update `.env` with mainnet RPC, program ID, and Oracle wallet keypair
- [ ] Fund Oracle wallet with mainnet SOL for transaction fees
- [ ] Test a single prediction → resolution cycle on mainnet before going live
- [ ] Set up monitoring/alerts for Oracle failures

---

## 5. Post-Migration Verification

- [ ] Place a real SOL bet on a live match
- [ ] Verify Oracle publishes predictions on mainnet
- [ ] Verify match resolution and pot distribution
- [ ] Verify claim winnings works
- [ ] Verify leaderboard updates with mainnet data
- [ ] Verify profile, settings, and avatar upload work
- [ ] Verify $GOAL balance gating works with mainnet token
- [ ] Monitor indexer for missed events

---

## 6. Rollback Plan

If critical issues arise on mainnet:

1. Pause Oracle agent (stop predictions)
2. Switch frontend back to devnet by restoring env vars
3. Re-enable `goalscore.fun → devnet.goalscore.fun` redirect
4. Investigate and fix issues on devnet
5. Re-attempt migration

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Pre-migration testing | 1-2 days |
| Contract deployment + verification | 1 day |
| Backend + frontend env switch | 1 day |
| Post-migration verification | 1 day |
| **Total** | **~4-5 days** |
