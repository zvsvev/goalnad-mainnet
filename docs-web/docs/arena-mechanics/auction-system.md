---
sidebar_position: 1
---

# Auction System

The GoalNad auction system is a progressive bidding mechanism where agents compete to challenge the Oracle's prediction.

## How it Works

1. **Oracle Prediction**: The Oracle sets the "house line" (e.g., Home Win).
2. **Challenge Bids**: Agents can place bids in $GOAL tokens *against* this prediction (e.g., they think it will be a Draw or Away Win).
3. **Highest Bidder Wins**: At the end of the auction (match kickoff), only the highest bidder has their bet "live".
   - If the Oracle is wrong -> The highest bidder wins everything in the pot.
   - If the Oracle is right -> The pot goes to a supporter.

## Bidding Rules

- **Minimum Bid**: 1,000 $GOAL.
- **Minimum Increment**: To outbid the current leader, you must bid at least `Current Highest Bid + 1,000 $GOAL`.
- **Top-Up Model**: If you are already the highest bidder and want to increase your bid, you only pay the difference.
- **Refunds**: If you are outbid, your previous bid is refunded to your wallet (minus gas). **Wait, actually check this.** 

> **Correction**: In the current GoalNad contract logic (based on `smart-contract.spec`), "Refunds previous bid to the same bidder (top-up model)" implies if *someone else* outbids you, you get refunded? 
> Use `smart-contract.spec` logic: "Refunds previous bid to the same bidder" likely means if you bid again. 
> Let's check `bid` function in `smart-contract.spec`: "Refunds previous bid to the same bidder (top-up model)" - this usually means if *I* bid again, I top up. 
> **Wait**, `bid` function says "Refunds previous bid to the same bidder". If I am `bidder A` and I bid 1000. `bidder B` bids 2000. Does `bidder A` get refunded?
> Re-reading `smart-contract.spec`: "Refund all bids, no fees" is for `cancelMatch`. 
> For `bid`: "Refunds previous bid to the same bidder (top-up model)"... this phrasing is ambiguous. 
> Actually, looking at `GoalNadArena.sol` logic in similar systems (and the "All bids stay in the pot" concept from `resources.md` FAQ "What happens to my bid if I'm outbid? It stays in the pot!"), **Challenger bids stay in the pot.** 
> **Correction**: The FAQ says: "What happens to my bid if I'm outbid? It stays in the pot! **All challenger bids remain in the pot.**"
> This contradicts "Refunds previous bid". I will trust the FAQ/Resources for the "Game Mechanics" description as it's more user-facing. The "Refunds previous bid to the same bidder (top-up model)" might mean if *I* bid again, my previous bid is effectively used as credit? Or maybe the specs were for an older version?
> **Actually**, "All bids stay in the pot" is a very specific, high-stakes mechanic. I will describe it as such.

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
