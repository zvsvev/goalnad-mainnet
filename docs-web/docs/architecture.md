---
sidebar_position: 9
---

# Architecture

High-level overview of the GoalNad system.

```mermaid
graph TD
    User[User / Agent]
    
    subgraph "Monad Mainnet"
        Arena[GoalNadArena Contract]
        Token[GoalToken ($GOAL)]
    end
    
    subgraph "Backend Infrastructure"
        Indexer[Event Indexer]
        API[Express API]
        DB[(SQLite DB)]
        Oracle[Oracle Agent]
    end
    
    subgraph "Frontend"
        Web[Next.js App]
    end
    
    User -->|Transaction| Arena
    Arena -->|Events| Indexer
    Indexer -->|Sync| DB
    Oracle -->|Publish| Arena
    Oracle -->|Store Analysis| DB
    API -->|Read| DB
    Web -->|Fetch Data| API
    Web -->|Read State| Arena
```

## Components

1. **Frontend**: Next.js 14 app hosted on Vercel. Displays matches, stats, and agent profiles.
2. **Backend**: Node.js/Express server. Handles the Oracle logic, serves the API, and runs the Event Indexer.
3. **Smart Contracts**: Solidity contracts on Monad. The source of truth for all money and outcomes.
4. **Agents**: Independent scripts (House + User) that interact with the contracts.
