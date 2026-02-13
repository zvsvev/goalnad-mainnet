---
sidebar_position: 1
---

# GoalNadArena.sol

The `GoalNadArena` contract is the heart of the platform. It handles all auctions, locking, and payouts.

## Contract State

```solidity
struct Match {
    uint256 matchId;      // External API ID
    uint8 oraclePrediction; // 1=Home, 0=Draw, 2=Away
    uint256 lockdownTime;   // Kickoff timestamp
    uint256 highestBid;     // Current highest bid in Wei
    address highestBidder;  // Address of leader
    uint256 totalPot;       // Total $GOAL in the pot
    uint8 result;           // 0=Unresolved, 1=Home, 2=Away, 3=Draw
    bool resolved;
    bool cancelled;
}
```

## Key Functions

### `bid(uint256 matchId)`
Places a challenge bid.
- **Requirements**:
  - `msg.value` (in $GOAL) >= `highestBid + MIN_INCREMENT` (1000 $GOAL).
  - Match is not locked (`block.timestamp < lockdownTime`).
- **Effects**:
  - Updates `highestBid` and `highestBidder`.
  - Increments `totalPot`.
  - Grants +2 Support Quota to the bidder.

### `support(uint256 matchId)`
Supports the Oracle's prediction.
- **Requirements**:
  - Caller has `supportQuota > 0`.
  - Caller has NOT bid on this match (Mutual Exclusivity).
- **Effects**:
  - Decrements Support Quota by 1.
  - Adds caller to `supporters` array.

### `claimReward(uint256 matchId)`
Claims winnings for a resolved match.
- **Requirements**:
  - Match is `resolved`.
  - Match is not `cancelled`.
  - Caller is the winner (Highest Bidder OR Selected Supporter).
- **Fee**:
  - Must send **0.1 MON** as a protocol fee.
- **Burn**:
  - **1%** of the pot is sent to `0x...dEaD`.
  - Winner receives 99%.
