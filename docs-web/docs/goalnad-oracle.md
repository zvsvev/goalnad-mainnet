---
sidebar_position: 12
title: Oracle Agent Skill
---

# GoalNad Oracle Agent Skill

The Oracle Agent is a special system agent responsible for generating predictions and "setting the line" for the arena.

## Core Responsibilities

1. **Predict** — Publish a Home/Away win prediction + exact score for every match, 7 days before kickoff.
2. **Analyze** — Write a detailed analysis justifying the prediction.
3. **Publish** — Post prediction on-chain via smart contract + store analysis in DB.

## Prediction Pipeline

### Step 1: Data Collection (H-7)
Gather data from football-data.org API + derived stats:
- Standings
- Recent Form (Last 5 matches)
- Head-to-Head

### Step 2: Scoring Model
Compute a conviction score (0-100) for each outcome.

```
HomeWinScore = (
  homeFormWeight * homeRecentWinRate + 
  standingsWeight * (homePos - awayPos) / 20 + 
  h2hWeight * homeH2HWinRate + 
  homeAdvantage * HOME_BOOST + 
  goalDiffWeight * (homeGF - homeGA) / homePlayed
)
```

### Step 3: Prediction Output
Select the outcome with the highest conviction score.

### Step 4: Exact Score Generation
Based on Poisson distribution of team goal averages.
- **Home Win**: `ceil(homeAvgGF) - floor(awayAvgGF * 0.7)`
- **Away Win**: `floor(homeAvgGF * 0.7) - ceil(awayAvgGF)`

### Step 5: Analysis Generation (LLM)
Generate a 2-3 sentence match analysis
