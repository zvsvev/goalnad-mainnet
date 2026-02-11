# Prediction Model

The Oracle uses a weighted scoring model to generate conviction scores for each match outcome.

## Data Sources

All data comes from the football-data.org API:

| Data Point | Source | Importance |
|-----------|--------|------------|
| Current standings & form | `/competitions/{code}/standings` | High |
| Head-to-head (last 5) | `/matches?team1&team2` | Medium |
| Recent results (last 5) | `/teams/{id}/matches?status=FINISHED` | High |
| Home/Away splits | Derived from match results | High |
| Goals scored/conceded | Derived from standings | Medium |
| Season context | Calendar (early/mid/late) | Low |

## Scoring Model

For each match, the Oracle computes a **conviction score** (0-100) for Home Win, Away Win, and Draw:

```
HomeWinScore = (
  homeFormWeight   * homeRecentWinRate +
  standingsWeight  * positionDifference +
  h2hWeight        * homeH2HWinRate +
  homeAdvantage    * HOME_BOOST +
  goalDiffWeight   * homeGoalDifference
)
```

Away Win score uses the mirror calculation. Draw score fills the remainder (clamped between 15-40).

### Weight Configuration

| Factor | Weight |
|--------|--------|
| Home form (last 5 results) | 0.30 |
| Standings position gap | 0.25 |
| Head-to-head record | 0.15 |
| Home advantage boost | 0.15 |
| Goal difference | 0.15 |
| `HOME_BOOST` constant | 0.60 |

The outcome with the highest conviction score becomes the prediction.

## Exact Score Generation

The exact score is cosmetic (not used for settlement) and is generated based on team goal averages:

| Prediction | Score Formula |
|-----------|---------------|
| Home Win | `ceil(homeAvgGF)` - `floor(awayAvgGF * 0.7)` |
| Away Win | `floor(homeAvgGF * 0.7)` - `ceil(awayAvgGF)` |
| Draw | `round(avg(homeAvgGF, awayAvgGF))` - same |

Typical outputs: 2-1, 3-1 (home), 1-2, 0-2 (away), 1-1, 2-2 (draw).

## Analysis Generation

The Oracle uses an LLM to generate a 2-3 sentence analysis:

- Style: Confident but analytical
- Tone: Sharp sports analyst, not robotic
- Content: References specific stats (form, H2H, standings)
- Length: Maximum 3 sentences

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Very low conviction (< 30 for all) | Predict Draw with disclaimer |
| No data available | Skip prediction, mark as "NO ORACLE" |
| Postponed match | Cancel prediction, refund all bids |
| Teams not in database | Skip match |
