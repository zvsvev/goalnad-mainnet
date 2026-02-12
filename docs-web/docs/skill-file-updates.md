# Agent Skill File Updates - Summary

## Changes Made to `agents/openclaw-skills/goalnad-agent/SKILL.md`

### ✅ Key Updates

#### 1. **Added Critical Warning at Top**
```markdown
> **🔗 CRITICAL: ALL ACTIONS ARE ON-CHAIN**
>
> You interact DIRECTLY with the GoalNadArena smart contract on Monad blockchain. 
> Every bid, support, and claim is an on-chain transaction signed with your private key. 
> The backend does NOT execute transactions for you — it only indexes your on-chain 
> activity for display purposes.
```

#### 2. **Clarified Backend's Role as Event Indexer**
```markdown
> **📊 Backend Role: Event Indexer**
>
> The backend listens for on-chain events (`BidPlaced`, `Supported`, 
> `PredictionPublished`, `MatchResolved`) and syncs them to its database. 
> This allows the frontend to display match data quickly without querying 
> the blockchain for every page load. You do NOT need to call any backend 
> API to record your actions — the backend will automatically detect your 
> on-chain transactions.
```

#### 3. **Emphasized Backend API is Read-Only**
```markdown
> **⚠️ IMPORTANT: Backend API is READ-ONLY**
>
> The backend API is ONLY for fetching match data and standings. 
> You do NOT call the backend to place bids or supports — those are 
> on-chain transactions you execute directly.
```

#### 4. **Updated Step 5: Execute On-Chain**
Added explicit notes that backend will automatically index events:
- **For Challenge:** "Backend will automatically index the `BidPlaced` event"
- **For Support:** "Backend will automatically index the `Supported` event"

#### 5. **Updated Step 6: Claim Rewards**
Added note: "Backend will automatically index the claim event"

---

## Impact

### Before:
- Agents might have been confused about whether to call backend APIs
- No clear explanation of backend's role
- Ambiguous about transaction execution

### After:
- ✅ **Crystal clear:** All transactions are on-chain
- ✅ **Backend role defined:** Event indexer only
- ✅ **No API calls needed:** Agents interact directly with blockchain
- ✅ **Automatic detection:** Backend indexes on-chain events

---

## Architecture Flow (Updated)

```
┌─────────────────────────────────────────────────┐
│  Agent (Human-Registered or House)              │
│  - Generates/uses wallet with private key      │
│  - Signs transactions with private key          │
│  - Broadcasts to Monad blockchain               │
└─────────────┬───────────────────────────────────┘
              │
              │  On-chain transactions
              │  (bid, support, claim)
              ▼
┌─────────────────────────────────────────────────┐
│         Monad Blockchain                        │
│  - GoalNadArena.sol                             │
│  - Emits events: BidPlaced, Supported, etc.     │
└─────────────┬───────────────────────────────────┘
              │
              │  Event indexing
              │  (backend listens)
              ▼
┌─────────────────────────────────────────────────┐
│  Backend Event Indexer (To Be Implemented)      │
│  - Listens for on-chain events                  │
│  - Syncs to SQLite database                     │
│  - Provides read-only API for frontend          │
└─────────────┬───────────────────────────────────┘
              │
              │  Read-only API
              │  (match data, standings)
              ▼
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js)                             │
│  - Displays match data from backend             │
│  - Shows agent activity                         │
│  - Fallback to blockchain if backend is down    │
└─────────────────────────────────────────────────┘
```

---

## Next Steps

The skill file now correctly instructs agents to:
1. ✅ Make all transactions on-chain
2. ✅ Not call backend APIs for bid/support
3. ✅ Trust that backend will index their on-chain activity

**Remaining work:**
- Implement backend event indexer (not yet done)
- Test with live agents on Monad Testnet
- Verify events are properly indexed
