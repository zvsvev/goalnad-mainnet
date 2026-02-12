# GoalNad — Design Decisions & Memory

## Branding
- **Slogan:** "Onchain AI vs AI Football Prediction Arena"
- **Subtitle:** "Live on Monad"
- **Meta description:** "Onchain AI vs AI Football Prediction Arena — live on Monad. Challengers bid $GOAL to prove the Oracle wrong. Winner takes all."

## Core Principle
**Contract logic is always the source of truth.** The backend adjusts to match it, never the other way around.

## Key Design Decisions

### Auction Model: Additive (Not Replacement)
- All bids stay in the pot — no refunds on being outbid.
- Agents can **top-up** their existing bid on the same match.
- `total_pot += amount` (additive), not `total_pot = newHighestBid`.
- Highest bidder can top-up freely without needing to beat `highestBid + INCREMENT`.
- Contract: `bid()` function, `BidPlaced(matchId, bidder, amount, totalBid)` event.

### Independent Agent Architecture (Option B)
- **All agents are autonomous** — house agents and external agents are architecturally identical.
- Each agent manages its own wallet and private key locally (in its own `.env` / memory).
- No centralized agent-runner holds private keys. The old agent-runner is deprecated.
- Agents sign their own `bid()` / `support()` transactions directly on-chain.
- Backend does NOT relay on-chain transactions for agents.
- The backend event indexer syncs `BidPlaced` / `Supported` events to the DB.
- `bidOnBehalf()` / `supportOnBehalf()` remain in the contract for admin use, but are removed from backend relay code.

### Deployed Contracts (Monad Testnet)
- **GoalNadArena:** `0x9433318ccf0d6f36a29b1eb6604ba7ce832632db`
- **$GOAL Token:** `0x041C51Eaa209E70A53d15FC317fD4dA6B92BD7B6`
- **Admin/Oracle Wallet:** `0xAAAAfCef4899AB8eb7547a239a19A06f2E5A95F2`
- **Chain:** Monad Testnet (Chain ID 10143, RPC: `https://testnet-rpc.monad.xyz`)

### DB = Stats Only, On-Chain = Real Payouts
- `agents_metadata.balance` is a **display-only stat** — not withdrawable.
- Real $GOAL payouts happen via on-chain `claimReward()` (pull-pattern).
- `wins` / `losses` are updated in DB on resolve for leaderboard.
- No virtual balance credit/debit on resolve or bid.

### Indexer Event Handling
- `BidPlaced`: Use `totalBid` (cumulative) for `highest_bid` and `bids.amount`. Use `amount` (increment) for additive pot tracking.
- `Supported`: Insert support record.
- `MatchResolved`: Update match status.

### Fee Structure
- 1% $GOAL burn on wins (sent to burn address `0xdead...`).
- 0.1 MON claim fee (sent to treasury) on `claimReward()`.
- Zero fees on draw (full refund).

### Lucky Supporter Selection
- Selected **off-chain** by the admin/oracle — passed as parameter to `resolveMatch()`.
- Not random on-chain. Trust is implicit in the oracle.

## Gotchas
- `bids` table has no `agent_name` column — use JOIN with `agents_metadata`.
- Agent names in bids are resolved via `LEFT JOIN agents_metadata a ON b.agent_wallet = a.agent_wallet`.
- `DEFAULT_BALANCE = 100_000` in agent.ts is cosmetic, not real $GOAL.
