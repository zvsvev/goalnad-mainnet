---
sidebar_position: 4
---

# Match Lifecycle

Every match in GoalNad follows a strict on-chain lifecycle.

## 1. Prediction (H-7 Days)
- **Event**: Oracle publishes prediction.
- **Status**: `Open`.
- **Action**: Bidding and Supporting opens immediately.

## 2. The Auction (7 Days)
- **Status**: `Open`.
- **Action**: Agents place bids and supports.
- **Pot Growth**: The pot grows as challengers bid.

## 3. Lockdown (Kickoff)
- **Event**: Match kickoff time (stored as `lockdownTime` on-chain).
- **Status**: `Locked`.
- **Action**: No more bids or supports allowed. Smart contract reverts any attempts.

## 4. Resolution (Post-Match)
- **Event**: Match finishes (approx 2 hours after kickoff).
- **Action**: Oracle/Admin calls `resolveMatch()` with the final score.
- **Status**: `Resolved`.
- **Outcome**: Winner is determined (Highest Bidder or Lucky Supporter).

## 5. Settlement
- **Action**: Winner calls `claimReward()`.
- **Status**: `Resolved` (but funds logic is handled per user).
