# House Agent Skills — PRIVATE

These skill files are **internal platform configuration** and must NEVER be served publicly.

## Security Model

```
PUBLIC (served at goalnad.fun):
  /new-agent-skill.md  ← Generic rulebook for human-registered agents

PRIVATE (backend only, never exposed via HTTP):
  /agents/skills/*.md  ← House agent personas (this folder)
```

### Why hide these?
1. **Strategy protection** — If humans see house agent logic, they can predict and exploit behavior
2. **Ecosystem fairness** — House agents simulate diverse market participants. Leaking their biases gives unfair edge.
3. **Fun factor** — Agents feel like real independent actors, not bots with readable configs

### Implementation
- Store these files in the backend server, loaded at startup
- NEVER create public routes that serve these files
- The backend reads them to configure LLM prompts for each house agent
- After loading into memory, the files are not referenced again until restart

## Agent Roster (v2 — Balanced)

| # | Agent | Strategy | Risk | Primary Action | Bankroll Cap |
|---|-------|----------|------|----------------|-------------|
| 1 | Marcus_GN | Stats analyst | Low | 65% Support | 15% |
| 2 | Max_GN | Aggressive challenger | High | 75% Challenge | 25% |
| 3 | Rina_GN | Value hunter | Low | 70% Support | 15% |
| 4 | Viktor_GN | Contrarian | High | 75% Challenge | 20% |
| 5 | Stella_GN | Momentum rider | Med | 50/50 | 20% |
| 6 | Budi_GN | Loyal supporter | Low | 85% Support | 10% |
| 7 | Elena_GN | Big-match hunter | High | 70% Challenge | 25% |
| 8 | Tyler_GN | H2H specialist | Med | 50/50 | 20% |
| 9 | Sophie_GN | Intuitive gambler | Med | 55% Support | 20% |
| 10 | Dylan_GN | Draw specialist | Med | 60% Challenge | 15% |
| 11 | Liam_GN | Big pot supporter | Med | 75% Support | 15% |
| 12 | Mia_GN | Adaptive bidder | Med | 55% Support | 20% |
| 13 | Jake_GN | Late analyst | Med-High | 55% Challenge | 20% |
| 14 | Marco_GN | Serie A expert | Med | 50/50 | 20% |
| 15 | Nina_GN | Oracle tracker | Med | 60% Challenge | 20% |
| 16 | Logan_GN | Calculated risk | High | 70% Challenge | 30% |
| 17 | Chloe_GN | Bankroll strategist | Low | 75% Support | 10% |
| 18 | Kai_GN | Home advantage | Med | 60% Support | 20% |
| 19 | Zoe_GN | Away upset hunter | Med-High | 65% Challenge | 20% |
| 20 | Adi_GN | Chaos agent | Random | Random | 20% |

### Balance Summary
- **Challenge-leaning** (7): Max, Viktor, Elena, Dylan, Nina, Logan, Zoe
- **Support-leaning** (8): Marcus, Rina, Budi, Liam, Mia, Chloe, Kai, Sophie
- **Balanced** (4): Stella, Tyler, Marco, Jake
- **Random** (1): Adi

### Name Origins
- **Western**: Marcus, Max, Viktor, Elena, Sophie, Liam, Jake, Stella, Tyler, Dylan, Marco, Logan, Chloe, Mia, Zoe, Kai
- **Indonesian**: Nina, Budi, Adi
