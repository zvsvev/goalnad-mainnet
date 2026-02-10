---
name: Smart Contract Specification
description: GoalnadArena.sol — the on-chain auction and settlement engine
---

# Smart Contract: GoalnadArena.sol

Solidity contract deployed on Monad Testnet handling predictions, bidding, and payouts using $GOAL token.

---

## Contract State

```solidity
struct Match {
    uint256 matchId;           // API match ID
    uint8   oraclePrediction;  // 1=Home, 0=Draw, 2=Away
    uint256 lockdownTime;      // kickoff - 12 hours
    uint256 highestBid;
    address highestBidder;
    uint256 totalPot;
    uint8   result;            // 0=Unresolved, 1=Home, 2=Away, 3=Draw
    bool    resolved;
    bool    cancelled;
}

mapping(uint256 => Match) public matches;
mapping(uint256 => address[]) public supporters;         // matchId => supporter addresses
mapping(uint256 => mapping(address => uint256)) public bids;  // matchId => bidder => amount
mapping(address => uint256) public supportQuota;
```

---

## Functions

### `publishPrediction(uint256 matchId, uint8 prediction, uint256 lockdownTime)`
- **Access:** `onlyOracle`
- Stores Oracle prediction for a match
- Sets lockdown time (kickoff - 12h)

### `bid(uint256 matchId) external payable`
- Requires `block.timestamp < lockdownTime`
- Requires `msg.value >= highestBid + MIN_INCREMENT` (1000 $GOAL)
- Refunds previous bid to the same bidder (top-up model)
- Updates `highestBid`, `highestBidder`, `totalPot`
- Grants +2 support quota to bidder

### `support(uint256 matchId) external`
- Requires `block.timestamp < lockdownTime`
- Requires `supportQuota[msg.sender] > 0`
- Requires agent hasn't already bid on this match
- Deducts 1 support quota
- Adds sender to supporters list

### `resolveMatch(uint256 matchId, uint8 result, address luckySupporter)`
- **Access:** `onlyAdmin`
- Sets match result and lucky supporter (selected off-chain)
- Calculates payouts based on result vs prediction

### `claimReward(uint256 matchId) external`
- Pull-pattern: winner calls to withdraw
- **Oracle correct:** Lucky supporter gets 50% pot, 50% to treasury
- **Oracle wrong:** Highest bidder gets full pot
- **Draw:** All bidders can reclaim (minus 1% admin fee)

### `cancelMatch(uint256 matchId) external onlyAdmin`
- Refund all bids, no fees

---

## Events

```solidity
event PredictionPublished(uint256 indexed matchId, uint8 prediction);
event BidPlaced(uint256 indexed matchId, address bidder, uint256 amount);
event Supported(uint256 indexed matchId, address supporter);
event MatchResolved(uint256 indexed matchId, uint8 result);
event RewardClaimed(uint256 indexed matchId, address winner, uint256 amount);
event MatchCancelled(uint256 indexed matchId);
```

---

## Constants

| Name | Value |
|------|-------|
| `MIN_BID` | 1000 $GOAL |
| `MIN_INCREMENT` | 1000 $GOAL |
| `ADMIN_FEE_BPS` | 100 (1%) |
| `SUPPORTER_SHARE_BPS` | 5000 (50%) |
| `TREASURY_SHARE_BPS` | 5000 (50%) |

---

## Security

- ReentrancyGuard on `claimReward` and `bid`
- Ownable for admin functions
- Pull-pattern for all withdrawals
- No loops over unbounded arrays in state-changing functions
