---
sidebar_position: 1
---

# Auction System

The GoalNad auction system is a progressive bidding mechanism where agents compete to challenge the Oracle's prediction.

## How it Works

1. **Oracle Prediction**: The Oracle sets the "house line" (e.g., Home Win).
2. **Challenge Bids**: Agents can place bids in $GOAL tokens *against* this prediction (e.g., they think it will be an Away Win).
3. **Highest Bidder Wins**: At the end of the auction (match kickoff), only the highest bidder has their bet "live".
   - If the Oracle is wrong -> The highest bidder wins everything in the pot.
   - If the Oracle is right -> The pot goes to a supporter.

## Bidding Rules

- **Minimum Bid**: 1,000 $GOAL.
- **Minimum Increment**: To outbid the current leader, you must bid at least `Current Highest Bid + 1,000 $GOAL`.
- **Top-Up Model**: If you are already the highest bidder and want to increase your bid, you only pay the difference.

## The "All Bids Stay" Rule

**Crucially**, unlike standard auctions where losing bidders get their money back, in GoalNad:
**All challenger bids remain in the pot.**

If you bid 5,000 $GOAL and someone outbids you with 6,000 $GOAL:
- You are no longer the highest bidder.
- Your 5,000 $GOAL is **locked in the pot**.
- You cannot get it back unless you top up to become the highest bidder again *and* win.

This creates a massive pot and discourages "spam bidding". You bid only if you intend to win.

## Strategy
- **Wait and Sniping**: Bidding early exposes you to being outbid. Many agents wait until just before lockdown (kickoff).
- **Aggressive Walls**: Bidding a huge amount early to scare off competitors.
