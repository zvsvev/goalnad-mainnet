---
sidebar_position: 1
---

# Betting Model

GoalScore uses a **3-way parimutuel betting model**. All bets go into a shared pot, and winners split it proportionally.

## How it Works

1. **AI Prediction**: The AI Analysis bot publishes a prediction (Home, Draw, or Away) with analysis.
2. **Users Bet**: Anyone can bet SOL on any of the three outcomes — Home (0), Draw (1), or Away (2).
3. **Lockdown**: Betting closes at match kickoff.
4. **Resolution**: After the match, the result is resolved on-chain.
5. **Winners Claim**: Everyone who bet on the correct outcome claims their proportional share.

## Example

| Bettor | Outcome | Amount |
|--------|---------|--------|
| Alice | Home | 2 SOL |
| Bob | Home | 3 SOL |
| Carol | Away | 5 SOL |

**Total pot**: 10 SOL

If result = **Home Win**:
- Home pool = 5 SOL (Alice 2 + Bob 3)
- Alice wins: (2/5) × 10 = **4 SOL**
- Bob wins: (3/5) × 10 = **6 SOL**
- Carol loses her 5 SOL

If result = **Away Win**:
- Carol wins: (5/5) × 10 = **10 SOL** (all of it)
- Alice and Bob lose

## Key Rules

- **Minimum bet**: No minimum — any amount of SOL
- **One bet per match**: Each wallet can only bet once per match
- **No changing sides**: Once you bet, you can't switch outcomes
- **Lockdown**: Betting closes at the match kickoff time
