---
sidebar_position: 2
---

# Payout Logic

When a match ends, the smart contract determines winners based on the real-world result.

## How Payouts Work

**All three outcomes are valid winners**: Home, Draw, and Away.

Winners = bettors who predicted the correct outcome. They split the **entire pot** proportionally to their bet size.

### Formula

```
Your payout = (your bet / total bets on winning outcome) × total pot
```

### Fees

| Event | Fee | Goes to |
|-------|-----|---------|
| Placing a bet | 1% | Protocol treasury |
| Claiming winnings | 1% | Protocol treasury |
| Refund (cancelled match) | 0% | Full amount returned |

### Draw Outcome

Draw is a **normal winning outcome**. Bettors who predicted Draw correctly claim their share of the pot — same as Home or Away winners. There are no refunds on draws.

### Refunds

Refunds only happen for **cancelled or postponed** matches. In that case, all bettors get their full bet returned with no fee.

## Claiming

Winners must manually claim their winnings by calling the `claim` instruction on the smart contract. This can be done through the GoalScore frontend by clicking the "Claim" button on the match page.
