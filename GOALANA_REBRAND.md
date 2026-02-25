# GoalScore — Agent Handoff Document
> Last updated: 2026-02-25
> Purpose: Full context for any agent picking up this project mid-way

---

## 🔄 What Is This?

GoalNad (AI-vs-AI football prediction arena on Monad testnet) is being rebranded and migrated to **Solana**.

**Old project:** GoalNad — `testnet.goalnad.fun` — Monad testnet (EVM, Chain ID 10143)
**New project:** GoalScore — `goalscore.fun` — Solana mainnet
**New codebase directory:** `/Users/ulinnuha.eth/solana-goal/` (copied from `/goalnad/`)

**Reason for pivot:** Did not win Moltiverse Monad hackathon. Solana has better audience fit (degen culture, pump.fun ecosystem, frictionless SOL wallets).

---

## ✅ Confirmed Decisions

| Item | Value |
|------|-------|
| Brand name | **GoalScore** — `goalscore.fun` ✅ domain purchased |
| Chain | Solana |
| Helius API key | `d5e5be34-be44-47f9-9d92-7b58bc482105` |
| Deployer pubkey | `CufRe5mid38LYfQsqHugKXsZbBG7fivyA52nJgAxtctG` |
| Deployer keypair file | `/Users/ulinnuha.eth/solana-goal/deployer-keypair.json` |
| Treasury pubkey (devnet only) | `2D696G4USWyQdtaLyctvvCAW4MJUQzvgRMwM4Wsjp4Pv` |
| Treasury keypair file (devnet only) | `/Users/ulinnuha.eth/solana-goal/treasury-keypair.json` |
| Privy project ID | `cmm1k9mbf001m0bky2uzpj9wi` |
| Network (now) | **Devnet** (Helius devnet RPC) |
| Solana CLI config | Set to Helius devnet + deployer keypair |
| Program ID (devnet) | `EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL` |
| IDL account (devnet) | `tqneCJkaMHZsr2267e8zwGVvz4ShL2bUY4kGa11FtLB` |
| Deploy tx | `2G1BWSrR6iyd5PwfHnMPuhAyaoAsEanfJAayFovW2PYFkx7PpQiA1xnpJTgKqtDzrkrCYNxr7e1XiA8dwWHPR3iG` |
| Contract path | `/Users/ulinnuha.eth/solana-goal/goalscore-arena/` |
| Gameplay | **Option B — Proportional payout** (no dynamic multiplier) |
| Betting currency | **SOL** |
| $GOAL role | Utility/access token (NOT betting currency) |

> ⚠️ SEED PHRASE — DEPLOYER keypair:
> `letter thank system develop man spider hint prison brass gas gold oval`
> Store securely — do NOT commit to git.

> ⚠️ SEED PHRASE — TREASURY keypair (devnet only, replace on mainnet):
> `youth chef dynamic clip accident width sketch innocent other tell bid absorb`
> Store securely — do NOT commit to git.

> ⚠️ DEVNET FUNDING NEEDED:
> Deployer balance is currently 0 SOL on devnet.
> Faucets require GitHub auth or have rate limits — agent cannot self-fund.
> User must visit: https://faucet.solana.com → sign in with GitHub → airdrop to:
> `CufRe5mid38LYfQsqHugKXsZbBG7fivyA52nJgAxtctG`
> Request at least 4 SOL (for contract deployment + testing)

---

## 🏗️ Architecture

### What Changes
| Component | Old (GoalNad) | New (GoalScore) |
|-----------|--------------|----------------|
| Blockchain | Monad (EVM) | Solana |
| Smart contracts | Solidity + Foundry | Rust + Anchor |
| Chain library | viem | @solana/web3.js |
| Wallet connect | None (agents only) | Privy + @solana/wallet-adapter |
| Betting currency | $GOAL token | **SOL** |
| $GOAL purpose | Betting | Utility/access/governance |
| Players | AI agents only | **Humans** |
| Auth | None | **Privy** (email/social + wallet) |

### What Stays
- Express.js backend (Node/TypeScript)
- SQLite database (minor schema additions)
- Next.js frontend
- Oracle prediction logic (OpenAI + football-data.org)
- Moltbook integration
- Railway (backend hosting)
- Vercel (frontend hosting)

---

## 🎮 Play Schema — FINAL (Option B, no multiplier)

```
1. Oracle predicts TODAY's matches only (cron: 6:00 AM daily)
   → Prediction stored in DB + on-chain
   → Visible ONLY to $GOAL holders (≥100K $GOAL, backend-configurable)
   → Non-holders: cannot see oracle prediction, but CAN still play freely

2. ANY user can connect wallet via Privy and place bets in SOL
   → 3 outcomes: HOME WIN | DRAW | AWAY WIN
   → 1% fee on every bet placed → platform treasury (buyback & burn $GOAL)

3. Match resolves:
   → Correct predictors share the pot proportionally by bet size
   → Wrong predictors lose their bet (goes to pot)
   → 1% fee on every claim payout → platform treasury
   → DRAW result → all bets refunded (no fees charged)

4. Platform treasury → 100% buyback & burn $GOAL
```

### Fee Structure (FINAL)
| Fee | When | Goes To |
|-----|------|---------|
| 1% on every bet placed | At bet time | Platform treasury |
| 1% on every claim payout | At claim time | Platform treasury |
| Platform treasury | Always | 100% buyback & burn $GOAL |

### Why no dynamic multiplier
Multiplier requires extra funds to pay out the bonus — no clear source without taking from the pot unfairly. Dropped in favor of simplicity. The 2 fee touchpoints (bet + claim) are clean and sustainable.

### Oracle Gating — Key Design Point
- Non-holders **can always play** — no paywall on gameplay
- Non-holders **cannot see oracle's prediction** — oracle acts as a "cheat code" / insider edge for $GOAL holders
- This makes $GOAL feel valuable without gatekeeping the fun
- Backend env var (NOT in contract): `ORACLE_GATE_MINIMUM=100000`
- Can be changed anytime without redeployment

---

## 🔐 Oracle Prediction Gating

```
Backend env config:
  ORACLE_GATE_MINIMUM = 100000   ← changeable anytime, no redeployment needed

Holder (≥100K $GOAL):
  ✅ See today's oracle prediction + reasoning
  ✅ See full past oracle prediction history
  ❌ Cannot see tomorrow's predictions (oracle only runs same-day)

Non-holder:
  ✅ Can bet freely on any match
  ✅ Can see match cards, scores, results
  ❌ Cannot see oracle's prediction (shown as locked)
  → Teased with "Hold 100K $GOAL to see the oracle's pick"

Oracle cron schedule:
  6:00 AM daily → fetch today's matches → GPT predict → store DB + on-chain
  Locks at each match's kickoff time
```

---

## 👤 User Profiles — `/u/[wallet]` (Simplified)

Kept minimal to avoid heavy DB costs.

```
Route: /u/[wallet-address]

Shows:
  - Wallet address (shortened + copy button)
  - Avatar: generated from wallet hash (Boring Avatars — no storage needed)
  - $GOAL balance + tier badge (read from chain)
  - Simple stats: Total bets | Correct predictions | Total SOL won
  - Recent prediction history (last 10, from existing bets table)
```

No social graph, no follows, no extra tables — everything from existing `bets` + on-chain $GOAL balance read.

---

## 🎨 Frontend Design — CONFIRMED ✅

**References:**
- Layout: https://fortytwo.network/ (dark, modern, minimal)
- Profile: Polymarket-style
- Color: dominant GREEN

**Design tokens:**
```
Background:  #0a0f0a   (near-black with green tint)
Surface:     #111811   (card backgrounds)
Primary:     #00ff88   (bright green — CTAs, highlights)
Secondary:   #00c466   (muted green — borders, accents)
Text:        #e8f5e8   (off-white with green tint)
Muted:       #4a6b4a   (subdued text, labels)
Error/Red:   #ff4444
```

**Auth:** Privy (`cmm1k9mbf001m0bky2uzpj9wi`) + @solana/wallet-adapter

---

## 🪙 $GOAL Tokenomics — FINAL

```
Total Supply: 1,000,000,000 $GOAL
Platform: pump.fun (Solana)

Creator First Buy: 7.5% = 75,000,000 $GOAL
  ├─ 2.5% (25M) → Campaigns, giveaways, engagement rewards
  ├─ 2.5% (25M) → Team allocation (6-month soft lock recommended)
  └─ 2.5% (25M) → UNDECIDED (to be determined later)

Public Fair Launch: 92.5% via pump.fun price discovery
```

### Revenue Streams (TWO SEPARATE — never mix)

```
Stream 1 — Platform Fees (SOL)
  Sources:
    - 1% on every bet placed
    - 1% on every winning claim
  Use: 100% → buyback & burn $GOAL on-market

Stream 2 — Creator Fees (SOL)
  Source: pump.fun trading volume creator fees
  Use:    100% → dev/operations treasury (servers, oracle API costs, etc.)
```

### $GOAL Utility
| Usecase | Details |
|---------|---------|
| 🔮 Oracle prediction gate | Hold ≥100K $GOAL to see daily oracle picks |
| 💬 Predictions Chat | Pay $GOAL per question — **FUTURE FEATURE** |
| 🏆 Leaderboard rewards | Top oracle-beaters earn $GOAL weekly |
| 🗳️ Governance | Vote on new leagues, features |
| 🔥 Buyback & burn | All platform fees drive deflationary pressure |

### $GOAL Holder Tiers
| Tier | Requirement | Key Benefits |
|------|-------------|--------------|
| 🥉 Fan | Any $GOAL | Teaser access to Predictions Chat UI |
| 🥈 Analyst | 10,000 $GOAL | 5 chat queries/day (v2), governance vote |
| 🥇 Oracle | 100,000 $GOAL | Unlock oracle predictions, 20 chat queries/day |
| 💎 Syndicate | 500,000 $GOAL | Unlimited queries, revenue share, private feed |

---

## 🔮 Predictions Chat — TEASED in v1, built in v2

```
v1: Show locked/blurred UI on frontend with "Coming Soon — $GOAL holders only" CTA
    This teases the feature and drives $GOAL demand before it's even built

v2 (when built):
  User asks oracle about any match → pays X $GOAL
  Backend: verify $GOAL balance → call OpenAI with match context → return analysis
  $GOAL payment → platform treasury → periodic SOL conversion → buyback & burn
```

---

## 🚀 Feature Roadmap

### v1 — Launch
- [ ] Anchor smart contract (placeBet, resolve, claim, 1% fees)
- [ ] Oracle predicts today's matches (6am daily cron)
- [ ] $GOAL gating for oracle predictions (backend env var)
- [ ] Humans bet in SOL: HOME / DRAW / AWAY WIN
- [ ] Proportional payout to correct predictors
- [ ] 1% bet fee + 1% claim fee → treasury → buyback & burn
- [ ] Privy auth (email/social + Phantom/Backpack)
- [ ] User profiles at `/u/[wallet]` (simplified)
- [ ] Oracle stats page (win rate per league)
- [ ] Predictions Chat — teased/locked UI only
- [ ] fortytwo.network-inspired dark green UI

### v2 — Post-launch
- [ ] Predictions Chat (pay $GOAL per question)
- [ ] Tier badge displayed on profiles
- [ ] Leaderboard (who beats oracle most)
- [ ] Governance voting on new leagues

### v3 — Future
- [ ] Revenue share dashboard (Syndicate tier)
- [ ] Auto-generated result share cards (X/Twitter)
- [ ] Streak tracking
- [ ] UCL / World Cup expansion
- [ ] PWA mobile app

---

## 💰 Budget

| Item | Cost |
|------|------|
| `goalscore.fun` domain | ~$10/yr |
| Railway backend | $0 extra |
| Vercel frontend | $0 extra |
| Privy auth | Free up to 1K MAU |
| Helius RPC | Free tier |
| pump.fun launch | ~0.02 SOL |
| **Total at launch** | **~$10 + SOL gas** |

---

## 🛠️ Tech Stack

### New dependencies
```bash
# Backend
npm install @solana/web3.js @coral-xyz/anchor

# Frontend
npm install @privy-io/react-auth \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets \
  @solana/wallet-adapter-base
```

### Tools (already installed)
```
Solana CLI: installed at ~/.local/share/solana/install/active_release/bin/
Config: Helius devnet RPC + deployer keypair
Anchor CLI: needs install → cargo install --git https://github.com/coral-xyz/anchor avm
```

---

## 📁 Codebase Reference

**Working codebase:** `/Users/ulinnuha.eth/solana-goal/`
**Old GitHub (reference only):** `https://github.com/zvsvev/goalnad`

### Files to keep / rewrite
| File | Action |
|------|--------|
| `backend/src/services/oracle.ts` | ✅ Keep as-is |
| `backend/src/services/footballData.ts` | ✅ Keep as-is |
| `backend/src/services/moltbook.ts` | ✅ Keep as-is |
| `backend/src/db/schema.ts` | ✅ Keep, add `users` table |
| `backend/src/services/chain.ts` | ❌ Full rewrite → @solana/web3.js |
| `backend/src/routes/oracle.ts` | ✅ Keep, update chain calls + gating logic |
| `backend/src/routes/matches.ts` | ✅ Keep as-is |
| `frontend/` | ✅ Rebrand + full UI redesign |
| `contracts/` | ❌ Full rewrite → Anchor/Rust |

### Old EVM contracts (DO NOT reuse)
- GoalToken: `0x041C51Eaa209E70A53d15FC317fD4dA6B92BD7B6`
- GoalNadArena: `0x9433318CCF0d6f36a29B1Eb6604bA7cE832632db`

---

## 🗺️ Migration Roadmap

### Phase 1 — Devnet (Week 1)
- [ ] Write GoalScoreArena.rs in Anchor
      → placeBet (SOL, outcome: 0/1/2, 1% fee on bet)
      → resolve (oracle authority only, distributes pot proportionally)
      → claim (1% fee on payout)
      → refund (for draws)
- [ ] Deploy to devnet via Helius RPC
- [ ] Rewrite `backend/src/services/chain.ts` → @solana/web3.js
- [ ] Add `users` table to DB (wallet, privy_id, created_at)
- [ ] Add `ORACLE_GATE_MINIMUM` env var + $GOAL balance check middleware
- [ ] Frontend: Privy auth integration
- [ ] Frontend: rebrand GoalNad → GoalScore, new dark green UI
- [ ] Test full flow on devnet

### Phase 2 — Mainnet Soft Launch (Week 2)
- [ ] Deploy contract to Solana mainnet
- [ ] Run 10–20 real matches end-to-end
- [ ] Fix edge cases (draws, zero bets on winning side, etc.)
- [ ] Set treasury wallet (SEPARATE from deployer/oracle wallet)

### Phase 3 — $GOAL Token Launch (Week 3+)
- [ ] Product battle-tested on mainnet
- [ ] Community built (X/Twitter, Discord/TG)
- [ ] Launch $GOAL on pump.fun
- [ ] Decide + deploy undecided 2.5% allocation

### Phase 4 — Predictions Chat (Week 3–4)
- [ ] `/api/chat` route + $GOAL payment gate
- [ ] OpenAI call with match + oracle context
- [ ] Frontend chat UI for $GOAL holders

---

## ⚠️ Still Pending / To Decide

- [ ] Register `goalscore.fun` domain
- [ ] Decide: undecided 2.5% $GOAL allocation (LP bootstrap recommended)
- [ ] Generate/set SEPARATE treasury wallet (not deployer)
- [ ] Fund deployer with devnet SOL (airdrop for testing)
- [ ] Post X gameplay vote (when ready)
- [ ] Confirm team lock period for 2.5% team allocation

---

## 📊 Oracle Stats (as of 2026-02-25)
*From: https://goalnad-mainnet-production.up.railway.app*

- Resolved: 44 | Correct: 17 | Wrong: 12 | Draw: 15
- **Win rate (draws excluded): 58.6%**
- **Win rate v2 (draws as loss): 38.6%**

| League | Win Rate (draws excl.) |
|--------|----------------------|
| Premier League | 71.4% (5/7) |
| Serie A | 62.5% (10/16) |
| Bundesliga | 33.3% (1/3) |
| La Liga | 33.3% (1/3) |

---

## 🔑 Checklist for New Agent Starting Work

1. Read this entire file top to bottom
2. Working directory: `/Users/ulinnuha.eth/solana-goal/`
3. Solana CLI already installed + configured (Helius devnet, deployer keypair)
4. Ask user: treasury wallet address, domain registered yet?
5. Start Phase 1: Anchor contract → backend chain.ts → frontend rebrand + Privy
6. Keep `ORACLE_GATE_MINIMUM` in backend `.env` — NOT in contract
7. Update this file as tasks complete
