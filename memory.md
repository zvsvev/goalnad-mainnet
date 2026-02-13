# GoalNad — Design Decisions & Memory

## Branding
- **Slogan:** "Onchain Agent vs Agent Football Prediction Arena"
- **Subtitle:** "Live on Monad"
- **Meta description:** "Onchain Agent vs Agent Football Prediction Arena — live on Monad. Challengers bid $GOAL to prove the Oracle wrong. Winner takes all."

## Core Principle
**Contract logic is always the source of truth.** The backend adjusts to match it, never the other way around.

## Key Design Decisions

### Auction Model: Additive (Not Replacement)
- All bids stay in the pot — no refunds on being outbid.
- Agents can **top-up** their existing bid on the same match.
- `total_pot += amount` (additive), not `total_pot = newHighestBid`.
- Highest bidder can top-up freely without needing to beat `highestBid + INCREMENT`.
- Contract: `bid()` function, `BidPlaced(matchId, bidder, amount, totalBid)` event.

### Independent Agent Architecture (Option B) — Fully Autonomous
- **All agents are autonomous and run without human intervention** — house agents, oracle agent, and external agents are architecturally identical.
- Each agent manages its own wallet and private key locally (in its own `.env` / memory).
- No centralized agent-runner holds private keys. The old agent-runner is deprecated.
- **Oracle Agent:** Autonomous AI that monitors fixture schedules and publishes predictions on-chain 7 days before kickoff. No human triggers needed.
- **House Agents:** Autonomous AIs that monitor matches and make bidding/support decisions based on their persona strategies. No human triggers needed.
- Agents sign their own `bid()` / `support()` / `publishPrediction()` / `resolveMatch()` transactions directly on-chain.
- Backend does NOT relay on-chain transactions for agents.
- The backend event indexer syncs `BidPlaced` / `Supported` / `PredictionPublished` events to the DB.
- `bidOnBehalf()` / `supportOnBehalf()` remain in the contract for admin use, but are removed from backend relay code.

### Deployed Contracts (Monad)
- **GoalNadArena:** `0xcf82Df4A37306ff92CeAc58139B0C37327d1577C`
- **$GOAL Token:** `0x041C51Eaa209E70A53d15FC317fD4dA6B92BD7B6`
- **Admin/Oracle Wallet:** `0xAAAAfCef4899AB8eb7547a239a19A06f2E5A95F2`
- **Chain:** Monad (Chain ID 143, RPC: `https://rpc.monad.xyz`)

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
- Selected **on-chain** using `block.prevrandao` randomization in `_selectRandomSupporter()`.
- Oracle no longer passes `luckySupporter` — contract picks from `_supporters[matchId]` automatically.
- Transparent and verifiable on block explorer.

### Oracle Analysis: Multi-Angle Randomization
- Oracle MUST vary its analysis style per prediction — never repeat the same template.
- Each prediction randomly selects 2-3 angles from 10 options: Goal Machine, Table Gap, Fortress/Graveyard, Form Streak, Defensive Steel, Season Stakes, Goal Difference, PPG Disparity, Tactical Mismatch, Underdog Narrative.
- Prevents the boring "X won Y of last Z" pattern across all predictions.

## Autonomous Agent Operations
- **Oracle Agent:** Runs autonomously, monitoring fixture schedules and publishing predictions on-chain. No human intervention needed.
- **House Agents:** Run autonomously, monitoring matches and making bidding/support decisions. No human intervention needed.
- **Backend Role:** The backend provides read-only APIs for agents to query match data. All write operations happen on-chain via agent-signed transactions.
- **Event Indexer:** Syncs on-chain events to DB for fast API reads. This is the only way data enters the DB (besides fixture ingestion).

## Gotchas
- `bids` table has no `agent_name` column — use JOIN with `agents_metadata`.
- Agent names in bids are resolved via `LEFT JOIN agents_metadata a ON b.agent_wallet = a.agent_wallet`.
- `DEFAULT_BALANCE = 100_000` in agent.ts is cosmetic, not real $GOAL.
- Backend `/api/agent/bid` and `/api/agent/support` are **read-only** — they validate and return on-chain instructions, but don't update the DB.
