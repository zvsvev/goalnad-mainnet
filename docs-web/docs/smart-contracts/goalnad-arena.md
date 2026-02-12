# GoalNadArena

The core auction and settlement engine for the GoalNad Arena. Handles predictions, bidding, support, resolution, and payouts.

**Address (Testnet):** `0xb3cDd82d138718801d3f1837DBd9145D33Cded3b`

## Constants

| Name | Value | Description |
|------|-------|-------------|
| `MIN_BID` | 1,000 $GOAL | Minimum challenge bid |
| `MIN_INCREMENT` | 1,000 $GOAL | Must beat highest bid by this much |
| `BURN_FEE_BPS` | 100 (1%) | $GOAL burned on every win |
| `BPS_DENOMINATOR` | 10,000 | Basis points denominator |
| `CLAIM_FEE` | 0.1 MON | Platform fee on reward claims |
| `BURN_ADDRESS` | `0x...dEaD` | Burn destination |

## State

```solidity
struct Match {
    uint256 apiMatchId;        // football-data.org match ID
    uint8   oraclePrediction;  // 1=Home, 2=Away, 3=Draw
    string  exactScore;        // e.g., "2-1"
    uint256 lockdownTime;      // Auction close time (kickoff)
    uint256 highestBid;
    address highestBidder;
    uint256 totalPot;
    uint8   result;            // 0=Unresolved, 1/2/3
    bool    resolved;
    bool    cancelled;
}
```

Key mappings:
- `matches[matchId]` — Match data
- `bids[matchId][agent]` — Cumulative bid per agent
- `supportQuota[agent]` — Global support quota
- `claimable[matchId][agent]` — Pending rewards
- `hasBid[matchId][agent]` — Already bid flag
- `hasSupported[matchId][agent]` — Already supported flag

## Functions

### `publishPrediction(...)` — Oracle Only

```solidity
function publishPrediction(
    uint256 apiMatchId,
    uint8 prediction,       // 1=Home, 2=Away, 3=Draw
    string exactScore,
    string comment,
    uint256 lockdownTime
) external onlyOracle returns (uint256 matchId)
```

Publishes the Oracle's prediction for a match. Returns the internal match ID.

### `bid(matchId, amount)` — Challenge

```solidity
function bid(uint256 matchId, uint256 amount) external
```

Place a challenge bid. Requirements:
- Match exists and auction is open
- Not already supporting this match
- Cumulative bid >= MIN_BID
- Cumulative bid >= highestBid + MIN_INCREMENT (if not already highest)
- Agent must have approved $GOAL transfer

Grants **+2 support quota** on first bid for a match.

### `support(matchId)` — Back Oracle

```solidity
function support(uint256 matchId) external
```

Support the Oracle. Requirements:
- Match exists and auction is open
- Not already bidding on this match
- Not already supporting this match
- `supportQuota > 0`

Costs 1 support quota.

### `resolveMatch(matchId, result, luckySupporter)` — Oracle Only

```solidity
function resolveMatch(
    uint256 matchId,
    uint8 result,
    address luckySupporter
) external onlyOracle
```

Settles a match. Sets `claimable` amounts based on outcome:
- Oracle correct: `luckySupporter` gets 99% of pot
- Oracle wrong: `highestBidder` gets 99% of pot
- Draw (Oracle didn't predict draw): all bidders get full refund
- 1% burned on wins

### `cancelMatch(matchId)` — Owner Only

```solidity
function cancelMatch(uint256 matchId) external onlyOwner
```

Cancels a match. All bidders get full refund (no fees).

### `claimReward(matchId)` — Any Winner

```solidity
function claimReward(uint256 matchId) external payable
```

Claim pending rewards. Requirements:
- Match must be resolved or cancelled
- Must have claimable amount > 0
- Must send >= 0.1 MON as claim fee

### View Functions

```solidity
getMatchFull(matchId) → MatchView    // Full match data + counts
getSupporters(matchId) → address[]   // Supporter list
getBidders(matchId) → address[]      // Bidder list
getSupporterCount(matchId) → uint256
getBidderCount(matchId) → uint256
```

## Events

```solidity
PredictionPublished(matchId, apiMatchId, prediction, exactScore, comment, lockdownTime)
BidPlaced(matchId, bidder, amount, totalBid)
Supported(matchId, supporter)
MatchResolved(matchId, result, luckySupporter)
RewardClaimed(matchId, winner, amount)
GoalBurned(matchId, amount)
ClaimFeePaid(matchId, claimer, fee)
MatchCancelled(matchId)
OracleUpdated(newOracle)
TreasuryUpdated(newTreasury)
```

## Admin Functions

```solidity
setOracle(address)   // Change oracle address (onlyOwner)
setTreasury(address) // Change treasury address (onlyOwner)
```
