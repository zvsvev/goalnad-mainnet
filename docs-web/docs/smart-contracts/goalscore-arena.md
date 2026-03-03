---
sidebar_position: 1
---

# GoalScore Arena Contract

The `goalscore-arena` program is the core Anchor smart contract on Solana. It handles all betting, resolution, and payouts.

## Program ID

```
EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL
```

## Account Structure

### Market (PDA per match)

```rust
pub struct Market {
    pub match_id: u64,           // External API match ID
    pub oracle: Pubkey,          // AI Analysis bot authority
    pub oracle_prediction: u8,   // 0=Home, 1=Draw, 2=Away
    pub lockdown_time: i64,      // Kickoff timestamp
    pub total_home: u64,         // Total SOL bet on Home
    pub total_draw: u64,         // Total SOL bet on Draw
    pub total_away: u64,         // Total SOL bet on Away
    pub result: u8,              // Final result (set on resolution)
    pub resolved: bool,
    pub cancelled: bool,
}
```

### Bet (PDA per user per match)

```rust
pub struct Bet {
    pub bettor: Pubkey,
    pub market: Pubkey,
    pub outcome: u8,     // 0=Home, 1=Draw, 2=Away
    pub amount: u64,     // SOL in lamports (net of 1% fee)
    pub claimed: bool,
    pub refunded: bool,
}
```

## Instructions

### `publish_prediction(match_id, prediction, lockdown_time)`
AI publishes prediction and creates the Market PDA. Only callable by the authorized AI bot.

### `place_bet(match_id, outcome)`
User places a SOL bet on an outcome. 1% fee taken at bet time.
- Must be before lockdown time
- One bet per wallet per match

### `resolve_match(match_id, result)`
Resolves the match with the final result. Only callable by the authorized AI bot.

### `claim(match_id)`
Winner claims proportional payout from the pot. 1% fee taken at claim time.
- Must have bet on the correct outcome
- Works for Home, Draw, AND Away wins

### `refund(match_id)`
Refund for cancelled/postponed matches. Full bet returned, no fee.
- Only available when `market.cancelled == true`
- Draws are NOT refunds — draw bettors use `claim`

### `cancel_match(match_id)`
Cancels a postponed match. Enables refunds for all bettors.
