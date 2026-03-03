---
sidebar_position: 7
---

# FAQ & Resources

## General

### What is GoalScore?
GoalScore is a football prediction arena on Solana where humans bet SOL against each other on match outcomes (Home, Draw, or Away). An AI Oracle provides predictions and analysis for $GOAL token holders.

### How does it work?
1. Browse upcoming matches on [goalscore.fun](https://goalscore.fun)
2. Pick Home, Draw, or Away and bet SOL
3. If you predicted correctly, claim your share of the total pot proportionally
4. Oracle analysis is available to $GOAL holders (minimum 1M) to help inform decisions

### Is GoalScore live?
GoalScore is currently on Solana devnet, with mainnet launch planned.

## Betting & Payouts

### What outcomes can I bet on?
Three: **Home Win** (0), **Draw** (1), **Away Win** (2). All three are valid winning outcomes.

### What happens on a Draw?
Draw is a normal winning outcome. Bettors who predicted Draw correctly win their proportional share of the entire pot — just like Home or Away winners.

### When do refunds happen?
Only on **cancelled or postponed** matches. Draws are NOT refunds.

### How are winnings calculated?
Your share = (your bet / total bets on winning outcome) × total pot. For example, if you bet 1 SOL on Home, the total Home pool is 5 SOL, and the total pot is 20 SOL, you get 1/5 × 20 = 4 SOL.

## Tokens & Fees

### What is $GOAL?
$GOAL is a SPL token on Solana. Holding $GOAL unlocks premium Oracle analysis and predictions.

### How much $GOAL do I need?
- **1M $GOAL** — Access Oracle predictions and AI analysis
- **5M $GOAL** — Access Public API (planned)

### What are the fees?
- **1% at bet placement** — goes to protocol treasury
- **1% at claim** — goes to protocol treasury
- **Refunds** — no fee charged

## Technical

### What blockchain is GoalScore on?
Solana. The smart contract is built with the Anchor framework.

### Is the code open source?
Yes, the smart contract and platform code are available on [GitHub](https://github.com/zvsvev/goalscore-dev).

---

## Future Features

### Public API with API Key Access

A full public API system for developers to build prediction bots, analytics tools, or integrate GoalScore data into external platforms like Polymarket.

**Planned endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `/v1/matches` | Public | List matches with filters |
| `/v1/matches/:id` | Public | Single match data |
| `/v1/standings/:league` | Public | League standings |
| `/v1/oracle/predictions` | API Key | Oracle predictions with AI analysis |
| `/v1/oracle/predictions/:matchId` | API Key | Single prediction + full analysis |
| `/v1/oracle/accuracy` | Public | Oracle accuracy stats |

**API Key model:**
- Gated to **5M $GOAL** holders minimum
- User-generated keys in `gs_xxxx...` format
- Rate limits: 30 req/min (public), 120 req/min (API key)
- Key management page at `/api-keys` for generate/revoke/regenerate
- Keys stored hashed (SHA-256) — shown once at generation time

**Use cases:**
- Build custom AI prediction agents
- Pipe Oracle analysis into trading bots
- Create dashboards or analytics tools
- Integrate match data with external prediction markets
