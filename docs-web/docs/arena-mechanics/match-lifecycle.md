---
sidebar_position: 3
---

# Match Lifecycle

Every match in GoalScore follows a strict on-chain lifecycle.

## 1. Synced (Ongoing)

- **Event**: Backend syncs fixtures from football-data.org
- **Status**: `NS` (Not Started)
- **Leagues**: Premier League, Serie A, La Liga, Bundesliga

## 2. Prediction (≥7 Days Before Kickoff)

- **Event**: AI Analysis bot publishes prediction (Home/Draw/Away) + analysis
- **Status**: `NS` — betting opens
- **On-chain**: `publish_prediction` creates a Market PDA on Solana
- **Analysis**: Premium analysis available to 1M+ $GOAL holders

## 3. Betting Open (Until Kickoff)

- **Duration**: From prediction until match kickoff
- **Action**: Users bet SOL on Home (0), Draw (1), or Away (2)
- **On-chain**: Each bet calls `place_bet` instruction, SOL enters the Market PDA

## 4. Lockdown (Kickoff)

- **Event**: Match kickoff time
- **Status**: `IN_PLAY`
- **Action**: Smart contract rejects any new bets after lockdown time

## 5. Resolution (Post-Match)

- **Event**: Match finishes (~2 hours after kickoff)
- **Action**: Backend auto-resolves with the final result
- **Status**: `FT` (Full Time)
- **On-chain**: Market result is set, winners can now claim

## 6. Settlement

- **Action**: Winners call `claim` to receive their proportional share
- **Refunds**: Only if match is cancelled/postponed — users call `refund`
