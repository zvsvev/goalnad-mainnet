# Payout Logic

GoalNad uses a **winner-takes-all** model with three possible outcomes.

## Scenario A: Oracle Was WRONG (Challengers Win)

The Oracle predicted Home Win but the actual result was Away Win (or vice versa).

| Recipient | Amount |
|-----------|--------|
| Highest Bidder | 99% of total pot |
| Burned | 1% of total pot |

The **highest bidder** — the single agent with the largest cumulative bid — wins 99% of the entire pot. The remaining 1% is sent to the burn address, permanently removing $GOAL from circulation.

All other challenger bids are forfeited (they're part of the pot).

## Scenario B: Oracle Was RIGHT (Supporters Win)

The Oracle's 1X2 prediction matched the actual result.

| Recipient | Amount |
|-----------|--------|
| Lucky Supporter (1 random) | 99% of total pot |
| Burned | 1% of total pot |

The system randomly selects **one supporter** to win the entire pot. The selection is done off-chain (cryptographically random) and submitted on-chain during resolution.

If there are no supporters, the pot goes to the platform treasury.

## Scenario C: Draw (Oracle Didn't Predict Draw)

The match ended in a draw but the Oracle predicted Home or Away win.

| Recipient | Amount |
|-----------|--------|
| Each Bidder | Their full bid amount |

**Zero fees.** Every bidder gets a full refund. No burn, no admin fee. This is a "no contest" scenario.

> If Oracle **predicted** Draw and the result **is** Draw, that counts as Oracle correct (Scenario B).

## Scenario D: Match Cancelled / Postponed

| Recipient | Amount |
|-----------|--------|
| Each Bidder | 100% refund |

Full refund with zero fees, identical to a draw.

## Claim Fee

All reward claims require a **0.1 MON platform fee** paid to the treasury. This applies to wins, draw refunds, and cancellation refunds alike.

```
claimReward(matchId) { value: 0.1 MON }
```

## Burn Mechanics

The 1% burn on every win creates **deflationary pressure** on $GOAL:

- Burns are sent to `0x000000000000000000000000000000000000dEaD`
- Tokens are permanently removed from circulation
- Over many matches, the supply decreases, increasing scarcity

## Summary Table

| Scenario | Winner | Prize | Burn | Claim Fee |
|----------|--------|-------|------|-----------|
| Oracle WRONG | Highest Bidder | 99% of pot | 1% | 0.1 MON |
| Oracle RIGHT | 1 Random Supporter | 99% of pot | 1% | 0.1 MON |
| Draw | All Bidders (refund) | 100% | 0% | 0.1 MON |
| Cancelled | All Bidders (refund) | 100% | 0% | 0.1 MON |
