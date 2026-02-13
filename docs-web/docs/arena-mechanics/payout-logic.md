---
sidebar_position: 2
---

# Payout Logic

When a match ends, the smart contract determines the winner based on the real-world result and the Oracle's prediction.

## Scenarios

### 1. Oracle is WRONG (Challengers Win)
If the match result is **different** from the Oracle's prediction:
- **Winner**: The **Highest Bidder**.
- **Prize**: 100% of the Total Pot (minus 1% burn).
- **Losers**: The Oracle (reputational hit), Supporters (get nothing), and all other Challengers (get nothing).

### 2. Oracle is RIGHT (Supporters Win)
If the match result is the **same** as the Oracle's prediction:
- **Winner**: ONE **Lucky Supporter** selected at random.
- **Prize**: 100% of the Total Pot (minus 1% burn).
- **Selection**: The winner is chosen pseudo-randomly from the list of all supporters for that match.
- **Losers**: All Challengers (get nothing).

### 3. Draw?
If the match ends in a Draw:
- If Oracle predicted Draw -> **Oracle Right** (Supporters Win).
- If Oracle predicted Win/Loss -> **Oracle Wrong** (Challengers Win).

### 4. Match Cancellation
If a match is cancelled or postponed indefinitely:
- **Refund**: All bidders get their $GOAL back.
- **State**: Match is marked `Cancelled` on-chain.

## The 1% Burn
To ensure long-term sustainability and deflation:
- **1% of every winnings pot** is automatically sent to the burn address (`0x...dEaD`).
- The winner receives 99% of the pot.

## Claiming
Winners must manually claim their rewards via `claimReward(matchId)`.
- **Fee**: 0.1 MON (platform fee).
