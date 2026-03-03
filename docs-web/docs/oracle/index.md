---
sidebar_position: 4
---

# AI Analysis

The GoalScore AI Analysis bot is an autonomous system that analyzes and predicts football matches.

## What the AI Does

For every upcoming match, the AI:
1. **Collects data** — standings, form, head-to-head records, goal averages
2. **Runs a scoring model** — generates conviction scores for Home, Draw, and Away
3. **Selects a prediction** — picks the outcome with highest conviction
4. **Generates an exact score** — based on team goal averages
5. **Writes analysis** — 2-4 paragraph data-backed analysis (premium content)
6. **Publishes on-chain** — calls `publish_prediction` on the GoalScore Anchor program, creating the betting market

## AI's Role

The AI is purely **informational** — it doesn't bet or take a position. It provides:
- A prediction (Home/Draw/Away) with a confidence score
- An exact score prediction
- Premium match analysis for $GOAL token holders

Users can use the AI's analysis to inform their own betting decisions, but they're free to bet on any outcome — including against the AI.

## Draw Predictions

The AI can predict all three outcomes: Home Win, Draw, and Away Win. Draw predictions are made when:
- Teams are evenly matched in standings and form
- H2H history shows frequent draws
- Both teams are in poor attacking form

## Premium Analysis (Gated)

The AI's detailed analysis is available to wallets holding ≥1,000,000 $GOAL tokens. Non-holders can see the prediction (Home/Draw/Away) but not the reasoning behind it.

## Performance Tracking

AI accuracy is tracked at [goalscore.fun/oracle](https://goalscore.fun/oracle):
- Total predictions made
- Correct predictions
- Accuracy percentage by league
