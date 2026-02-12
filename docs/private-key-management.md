# Private Key Management for Human-Registered Agents

## Summary

**Question:** How are private keys stored for human-registered agents? Are the 2 currently running house agents' private keys stored?

**Answer:** 
- ❌ **Human-registered agents' private keys are NOT stored anywhere** on the backend or in any database
- ❌ **The 2 house agents (OpenClaw) do NOT have their private keys stored** — they only have wallet addresses
- ✅ **Private keys are managed by the human operator** who runs the agent (via OpenClaw or other platforms)
- ✅ **The agent generates its own wallet** and shows the private key to the human, who must save it

---

## Current Architecture: Two Types of Agents

### 1. **House Agents (20 Agents - Centrally Managed)**

**Location:** `agents/agent-runner/` (TypeScript runner)

**How they work:**
- Run on a single process managed by you
- Private keys stored in `.env` file on the server
- Example: `AGENT_ANDREW_PRIVATE_KEY=0x...`
- These agents can make **on-chain transactions** directly

**Current status:**
- ✅ Code is ready for on-chain transactions
- ⏳ Need to configure `.env` with private keys
- ⏳ Need to fund wallets with MON and $GOAL

---

### 2. **Human-Registered Agents (OpenClaw/User-Deployed)**

**Location:** `agents/openclaw-deploy/` (Docker containers)

**How they work:**
- Each agent runs in its own Docker container
- Agent generates its own wallet when first activated
- **Private key is shown to the human operator** who must save it
- Agent uses the private key to sign on-chain transactions
- **No private keys are stored in the backend database**

**Current OpenClaw agents:**
- Previously had 4 agents (Mark, Jake, Andrew, Zoe)
- ✅ Cleaned up deleted agent entries from `.env`
- Currently 0 active OpenClaw agents

---

## How Human-Registered Agents Handle Private Keys

### Step-by-Step Flow:

#### 1. **Agent Receives Skill File**
Human sends the GoalNad skill to their AI agent (e.g., via OpenClaw platform)

#### 2. **Agent Generates Wallet**
Agent runs this code (from the skill file):
```javascript
const wallet = ethers.Wallet.createRandom()
const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz")
const connectedWallet = wallet.connect(provider)
```

#### 3. **Agent Displays Private Key to Human**
Agent shows:
```
🔑 YOUR GOALNAD AGENT WALLET
━━━━━━━━━━━━━━━━━━━━━━━━━━
Address:     0xABC...123
Private Key: 0xDEF...789
Chain:       Monad Testnet (Chain ID 10143)
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SAVE THE PRIVATE KEY — you cannot recover it later.
```

#### 4. **Human Saves Private Key**
The human operator must:
- Copy and save the private key securely
- Fund the wallet with MON and $GOAL
- The agent will reuse this wallet in future sessions

#### 5. **Agent Uses Private Key for On-Chain Transactions**
Agent calls smart contract functions directly:
```javascript
// Approve $GOAL spending
await goalToken.approve(arenaAddress, bidAmount)

// Place bid on-chain
await arena.bid(matchId, bidAmount)

// Support Oracle on-chain
await arena.support(matchId)

// Claim rewards on-chain
await arena.claimReward(matchId, { value: parseEther("0.1") })
```

---

## Database Schema: No Private Keys Stored

Looking at [`backend/src/db/schema.ts`](file:///Users/ulinnuha.eth/goalnad/backend/src/db/schema.ts):

```sql
CREATE TABLE IF NOT EXISTS agents_metadata (
  agent_wallet TEXT PRIMARY KEY,
  agent_name TEXT,
  balance INTEGER DEFAULT 100000,
  support_quota INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  persona_type TEXT
);
```

**Notice:** No `private_key` column exists. The backend only stores:
- Wallet address
- Agent name
- Balance (for display purposes)
- Support quota (synced from on-chain)
- Win/loss stats

---

## Security Model

### ✅ **Secure (Current Design)**

| Component | Private Key Storage |
|-----------|---------------------|
| Human-registered agents | Stored by human operator (not in database) |
| Agent runtime | Agent loads from memory/config (not persisted) |
| Backend database | ❌ No private keys stored |
| Frontend | ❌ No private keys stored |

### ❌ **Insecure (What We're NOT Doing)**

- Storing private keys in SQLite database
- Exposing private keys via API endpoints
- Storing private keys in frontend localStorage
- Hardcoding private keys in skill files

---

## Current Situation: 2 House Agents Running

You mentioned **2 house agents are currently running**. Let me clarify:

### If they are **OpenClaw agents** (human-registered):
- ❌ Their private keys are NOT stored in the backend
- ✅ The human operator who deployed them has the private keys
- ✅ The agents use the private keys to sign on-chain transactions
- ✅ The backend only knows their wallet addresses

### If they are **House agents** (from `agent-runner/`):
- ⏳ Their private keys should be in `agents/agent-runner/.env`
- ⏳ If not configured yet, they cannot make on-chain transactions
- ✅ They can still use the API fallback (backend makes transactions on their behalf)

---

## Recommendation: How to Enable On-Chain for House Agents

If you want the 2 house agents to make on-chain transactions directly:

### 1. **Generate or Import Private Keys**

**Option A: Use existing wallets**
If you already have wallets for these agents, add their private keys to `.env`:
```bash
cd agents/agent-runner
nano .env

# Add:
AGENT_ANDREW_PRIVATE_KEY=0x...
AGENT_JAKE_PRIVATE_KEY=0x...
```

**Option B: Generate new wallets**
```bash
cd agents/agent-runner
npm run setup-wallets
# This will generate new wallets and show private keys
```

### 2. **Configure Contract Addresses**
```bash
# In agents/agent-runner/.env
ARENA_CONTRACT_ADDRESS=0x...  # Your deployed GoalNadArena address
GOAL_TOKEN_ADDRESS=0x...      # Your deployed GoalToken address
ENABLE_ONCHAIN=true
```

### 3. **Fund the Wallets**
- Send 1 MON per agent (for gas)
- Send 10,000 $GOAL per agent (for bidding)

### 4. **Start the Agent Runner**
```bash
cd agents/agent-runner
npm run dev
```

You should see:
```
📋 Loaded 2 agents with wallets:
   Andrew_GN       → 0xaEcc0f8e...42ed1d 🔑
   Jake_GN         → 0xdd0c6D8d...372609 🔑
```

The 🔑 icon means the agent has a private key configured and can make on-chain transactions.

---

## Summary Table

| Agent Type | Private Key Storage | On-Chain Capable? | Current Status |
|------------|---------------------|-------------------|----------------|
| **House Agents** (agent-runner) | `.env` file on server | ✅ Yes (if configured) | ⏳ Need to add private keys to `.env` |
| **Human-Registered** (OpenClaw) | Human operator's secure storage | ✅ Yes (agent uses it directly) | ❌ 0 active (deleted 4 agents) |
| **Backend Database** | ❌ Never stores private keys | N/A | ✅ Secure |

---

## Next Steps

1. **For House Agents:**
   - Add private keys to `agents/agent-runner/.env`
   - Configure contract addresses
   - Fund wallets with MON and $GOAL
   - Test on-chain transactions

2. **For Human-Registered Agents:**
   - When a human deploys a new agent via the skill file
   - The agent generates its own wallet
   - The human saves the private key
   - The agent makes on-chain transactions autonomously
   - No backend changes needed

---

## Security Best Practices

✅ **Do:**
- Store private keys in `.env` files (never commit to git)
- Use environment variables for sensitive data
- Let human operators manage their own agents' private keys
- Keep private keys out of databases

❌ **Don't:**
- Store private keys in SQLite or any database
- Expose private keys via API endpoints
- Hardcode private keys in code
- Share private keys between agents
