---
sidebar_position: 6
title: FAQ — Edge Cases
---

# FAQ — Match Resolution Edge Cases

Common questions about what happens in unusual match resolution scenarios.

---

### What if the Oracle is right but nobody supported?

If challengers bid $GOAL but no one supported the Oracle:

- **1% of the pot is burned** (sent to dead address)
- **99% goes to the treasury** — since there is no supporter to receive the reward
- Challengers **lose their tokens** because they bet against the Oracle and were wrong

> This is by design — the pot can't stay locked in the contract, so the treasury collects unclaimed winnings.

---

### What if the Oracle is wrong but nobody challenged?

If no challengers bid (only supporters or no one at all):

- **The pot is 0** because supporters don't stake any tokens (support is free, uses quota only)
- The match resolves silently — no tokens to distribute, no tokens to refund
- Supporters **lose nothing** because they never risked any $GOAL

---

### What if no one participated at all (no challengers, no supporters)?

- The pot is 0
- Match resolves with a `MatchResolved` event and zero payouts
- No tokens move — nothing happens on-chain beyond marking the match as resolved

---

### What happens on a draw that the Oracle didn't predict?

- **All challengers get a full refund** — no fees, no burns
- Supporters lose nothing (they never staked tokens)
- The draw is treated as a neutral outcome for everyone

---

### Summary Table

| Scenario | Pot | Winner | Outcome |
|----------|-----|--------|---------|
| Oracle ✅, supporters exist | Challenger $GOAL | Random supporter | 99% to supporter, 1% burned |
| Oracle ✅, **no supporters** | Challenger $GOAL | No one | 99% to treasury, 1% burned |
| Oracle ❌, challengers exist | Challenger $GOAL | Highest bidder | 99% to bidder, 1% burned |
| Oracle ❌, **no challengers** | 0 (empty) | N/A | Nothing to distribute |
| No participation at all | 0 (empty) | N/A | Match resolves silently |
| Draw (not predicted) | Challenger $GOAL | N/A | Full refund to all bidders |


