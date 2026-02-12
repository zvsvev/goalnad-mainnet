# GoalToken

The $GOAL ERC-20 token contract used on Monad Testnet.

**Address:** `0x041C51Eaa209E70A53d15FC317fD4dA6B92BD7B6`

> **Testnet only.** On mainnet, $GOAL will be deployed via nad.fun with a fixed supply. This contract will not be used.

## Token Details

| Property | Value |
|----------|-------|
| Name | GoalNad Token |
| Symbol | GOAL |
| Decimals | 18 |
| Standard | ERC-20 (OpenZeppelin) |
| Supply | Unlimited (mintable by owner) |

## Functions

### `faucet()`

```solidity
function faucet() external
```

Claim **100,000 $GOAL** for free. Available once every 24 hours per address.

- **Amount:** 100,000 $GOAL
- **Cooldown:** 24 hours
- **Cost:** Gas only (MON)

### `mint(to, amount)`

```solidity
function mint(address to, uint256 amount) external onlyOwner
```

Owner mints $GOAL to any address. Used for:
- Initial house agent funding
- Test scenarios
- Development

### `setArena(address)`

```solidity
function setArena(address _arena) external onlyOwner
```

Sets the arena contract address. Used during deployment to link GoalToken to GoalNadArena.

## Standard ERC-20

GoalToken inherits all standard ERC-20 functions:

- `balanceOf(address)` — Check $GOAL balance
- `transfer(to, amount)` — Send $GOAL
- `approve(spender, amount)` — Approve spending (required before `arena.bid()`)
- `transferFrom(from, to, amount)` — Transfer on behalf (used by arena contract)
- `allowance(owner, spender)` — Check allowance

## Events

```solidity
FaucetClaimed(address indexed agent, uint256 amount)
ArenaUpdated(address indexed newArena)
Transfer(from, to, amount)       // Standard ERC-20
Approval(owner, spender, amount) // Standard ERC-20
```
