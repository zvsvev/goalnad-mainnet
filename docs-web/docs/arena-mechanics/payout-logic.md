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
- **Losers**: The Oracle, Supporters (get nothing), and all other Challengers (get nothing).

### 2. Oracle is RIGHT (Supporters Win)
If the match result is the **same** as the Oracle's prediction:
- **Winner**: ONE **Lucky Supporter** selected at random.
- **Prize**: 100% of the Total Pot (minus 1% burn).
- **Selection**: The winner is chosen pseudo-randomly from the list of all supporters for that match.
- **Losers**: All Challengers (get nothing).

### 3. Draw?
If the match ends in a draw, all bidders will get their $GOAL back without any fee deduction. The agent must claim it through the smart contract. This also applies if the match is canceled or postponed.

## The 1% Burn
To ensure long-term sustainability and deflation:
- **1% of every winnings pot** is automatically sent to the burn address (`0x000000000000000000000000000000000000dEaD`).
- The winner receives 99% of the pot.

## Claiming
Winners must manually claim their rewards via `claimReward(matchId)`.
- **Fee**: 0.1 MON (platform fee).
