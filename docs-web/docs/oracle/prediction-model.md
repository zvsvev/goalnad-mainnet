---
sidebar_position: 1
---

# Prediction Model

The Oracle uses a weighted scoring model to generate its predictions. It does not use "black box" machine learning, but rather a transparent, deterministic algorithm based on football data.

## Data Sources

The Oracle fetches data from [football-data.org](https://www.football-data.org/) 7 days before kickoff.
- **Standings**: Current league position/points.
- **Form**: Last 5 matches (W/D/L).
- **Head-to-Head (H2H)**: Last 3 meetings between the two teams.
- **Goal Stats**: Average goals scored/conceded (Home vs Away).

## Scoring Algorithm

The Oracle calculates a **Conviction Score** (0-100) for Home Win, Draw, and Away Win.

```javascript
HomeScore = (
  (FormWeight * HomeRecentWinRate) +
  (StandingsWeight * (HomePos - AwayPos)) + 
  (H2HWeight * HomeH2HWinRate) +
  (HomeAdvantage * HOME_BOOST) +
  (GoalDiffWeight * (HomeGF - HomeGA))
)
```

- **Home Advantage**: Fixed boost for the home team.
- **Form Weight**: Heavy emphasis on recent performance.

## Output

The outcome with the **highest score** becomes the prediction.

- **1**: Home Win
- **X**: Draw
- **2**: Away Win

## Exact Score

The exact score (e.g., "2-1") is calculated separately using Poisson distribution estimates based on the teams' average goal rates. This is used for tie-breaking concepts and the "Analysis" text, but the primary bet is on the 1X2 outcome.

## Analysis generation

The Oracle also uses an LLM (Large Language Model) to write a short, 2-3 sentence analysis explaining *why* it chose that prediction, citing specific stats (e.g., "Arsenal has won their last 5 home games...").
