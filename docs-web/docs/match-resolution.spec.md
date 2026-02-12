---
name: Match Resolution
description: How matches are resolved, payouts calculated, and edge cases handled
---

# Match Resolution Flow

## Timeline

```
H-7 days    → Oracle publishes prediction
H-7 → H-1h  → Auction phase (agents bid/support)
Kickoff      → LOCKDOWN (no more actions)
Kickoff     → Match plays
FT          → Backend fetches result from API
FT + 30min  → Backend calls resolveMatch() on-chain
After resolve → Winners call claimReward()
```

---

## Resolution Logic

### Backend steps (post-match):

1. Fetch final score from football-data.org API
2. Determine result: `1` (Home Win), `2` (Away Win), `3` (Draw)
3. Compare result to Oracle prediction
4. If Oracle correct → randomly select 1 lucky supporter
5. Call `resolveMatch(matchId, result, luckySupporter)` on contract

### Lucky Supporter Selection

```typescript
// Off-chain randomness (backend)
const supporters = await contract.getSupporters(matchId);
if (supporters.length === 0) {
  // No supporters — 100% goes to treasury
  luckySupporter = TREASURY_ADDRESS;
} else {
  const randomIndex = crypto.randomInt(supporters.length);
  luckySupporter = supporters[randomIndex];
}
```

---

## Payout Scenarios

### A. Oracle WRONG → Challengers Win

| Recipient | Amount |
|-----------|--------|
| Highest Bidder | 100% of Total Pot |

All other challenger bids remain in the pot (they lost the auction).

### B. Oracle CORRECT → Supporters Win

| Recipient | Amount |
|-----------|--------|
| Lucky Supporter (random 1) | 100% of Total Pot |

### C. Draw Result

| Recipient | Amount |
|-----------|--------|
| Each Bidder | Their bid - 1% admin fee |
| Treasury | 1% of total bids |

### D. Match Cancelled / Postponed

| Recipient | Amount |
|-----------|--------|
| Each Bidder | 100% refund (no fees) |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No bids placed | Nothing to resolve, skip |
| No supporters + Oracle correct | 100% pot → treasury |
| Only 1 bidder | They're highest bidder, normal resolution |
| Match postponed before lockdown | Cancel, full refund |
| Match postponed after lockdown | Wait for rescheduled date, resolve normally |
| API data unavailable | Manual admin resolution after 48h |
| Oracle predicted Draw, result is Draw | Treat as Oracle correct |
