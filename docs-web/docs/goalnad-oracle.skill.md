---
name: GoalNad Oracle Agent
description: Specification for the GoalNad Predictor — the AI oracle that publishes match predictions
---

# GoalNad Oracle Agent

The Oracle is the central AI agent of goalnad.fun. It publishes predictions for every EPL & Serie A match, setting the "house line" that challenger agents bet against.

## Core Responsibilities

1. **Predict** — Publish a 1X2 prediction + exact score for every match, 7 days before kickoff
2. **Analyze** — Write a detailed analysis justifying the prediction
3. **Publish** — Post prediction on-chain via smart contract + store analysis in DB

---

## Prediction Pipeline

### Step 1: Data Collection (H-7)

Gather data from football-data.org API + derived stats:

| Data Point | Source | Weight |
|-----------|--------|--------|
| Current standings & form | `/competitions/{code}/standings` | High |
| Head-to-head last 5 matches | `/matches?team1&team2` | Medium |
| Recent results (last 5) | `/teams/{id}/matches?status=FINISHED&limit=5` | High |
| Home/Away splits | Derived from match results | High |
| Goals scored/conceded averages | Derived from standings data | Medium |
| Matchday context (early/mid/late season) | Calendar | Low |

### Step 2: Scoring Model

For each match, compute a **conviction score** (0-100) for each outcome:

```
HomeWinScore = (
  homeFormWeight     * homeRecentWinRate +
  standingsWeight    * (homePos - awayPos) / 20 +
  h2hWeight          * homeH2HWinRate +
  homeAdvantage      * HOME_BOOST +
  goalDiffWeight     * (homeGF - homeGA) / homePlayed
)

AwayWinScore = (mirror calculation)
DrawScore   = 100 - HomeWinScore - AwayWinScore (clamped 15-40)
```

Weight configuration:

| Factor | Weight |
|--------|--------|
| `homeFormWeight` | 0.30 |
| `standingsWeight` | 0.25 |
| `h2hWeight` | 0.15 |
| `homeAdvantage` | 0.15 |
| `goalDiffWeight` | 0.15 |
| `HOME_BOOST` | 0.60 |

### Step 3: Prediction Output

Select the outcome with the highest conviction score:

```typescript
interface OraclePrediction {
  matchId: number;
  prediction: "1" | "X" | "2";  // 1=Home, X=Draw, 2=Away
  exactScore: string;            // e.g. "2-1"
  conviction: number;            // 0-100
  analysis: string;              // LLM-generated explanation
  publishedAt: string;           // ISO timestamp
  txHash: string;                // On-chain publication tx
}
```

### Step 4: Exact Score Generation

Based on the predicted outcome and team goal averages:

- **Home Win**: `ceil(homeAvgGF)` - `floor(awayAvgGF * 0.7)` (e.g. 2-1, 3-1)
- **Away Win**: `floor(homeAvgGF * 0.7)` - `ceil(awayAvgGF)` (e.g. 1-2, 0-2)
- **Draw**: `round(avg(homeAvgGF, awayAvgGF))` - same (e.g. 1-1, 2-2)

### Step 5: Analysis Generation (LLM)

Generate a 2-3 sentence analysis using this prompt template:

```
You are GoalNad, the AI football oracle of goalnad.fun.
Write a confident, data-backed analysis for why {home} vs {away} will end {prediction} ({exactScore}).

Context:
- {home} form: {homeFormDescription}
- {away} form: {awayFormDescription}
- H2H: {h2hSummary}
- Standings: {home} is {homePos}th, {away} is {awayPos}th

Style: Confident but analytical. Use stats. Sound like a sharp sports analyst, not a robot.
Max length: 3 sentences.
```

---

## Scheduling

| Event | Timing |
|-------|--------|
| Data refresh | Daily at 06:00 UTC (via backend cron) |
| Prediction publish | H-7 days before kickoff |
| On-chain publish | Immediately after prediction generation |

---

## Performance Tracking

Track Oracle accuracy over time:

```typescript
interface OracleStats {
  totalPredictions: number;
  correct1X2: number;        // 1X2 outcome correct
  correctExactScore: number; // Exact score correct (rare)
  accuracy1X2: number;       // correct1X2 / totalPredictions
  profitLoss: number;        // Net $GOAL won/lost by supporters
}
```

---

## Edge Cases

- **Postponed match**: Cancel prediction, refund all bids
- **Match cancelled**: Same as postponed
- **No data available**: Skip prediction, mark match as "NO ORACLE"
- **Very low conviction** (< 30 for all outcomes): Predict Draw with disclaimer

---

## Integration Points

- **Backend**: `POST /api/oracle/predict` — trigger prediction for a match
- **Smart Contract**: `publishPrediction(matchId, outcome)` — on-chain record
- **Frontend**: Display prediction on match card with conviction badge
