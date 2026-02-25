use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL");

// ─── Constants ────────────────────────────────────────────────────────────────
/// 1% fee in basis points
const FEE_BPS: u64 = 100;
const BPS_DENOM: u64 = 10_000;

/// Outcomes
const OUTCOME_HOME: u8 = 0;
const OUTCOME_DRAW: u8 = 1;
const OUTCOME_AWAY: u8 = 2;
const OUTCOME_NONE: u8 = 255;

#[program]
pub mod goalscore_arena {
    use super::*;

    /// Oracle creates a match market on-chain.
    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: u64,
        kickoff_time: i64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.match_id = match_id;
        market.oracle = ctx.accounts.oracle.key();
        market.treasury = ctx.accounts.treasury.key();
        market.kickoff_time = kickoff_time;
        market.result = OUTCOME_NONE;
        market.resolved = false;
        market.total_pot = 0;
        market.total_home = 0;
        market.total_draw = 0;
        market.total_away = 0;
        market.bump = ctx.bumps.market;

        emit!(MatchCreated {
            match_id,
            oracle: ctx.accounts.oracle.key(),
            kickoff_time,
        });

        Ok(())
    }

    /// User places a bet in SOL on an outcome.
    /// 1% fee taken at bet time → treasury.
    /// Net amount goes into market PDA vault.
    /// Each user gets one bet per match (outcome locked on first bet).
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        match_id: u64,
        outcome: u8,
        amount: u64, // total lamports user sends (fee deducted from this)
    ) -> Result<()> {
        require!(
            outcome == OUTCOME_HOME || outcome == OUTCOME_DRAW || outcome == OUTCOME_AWAY,
            GoalScoreError::InvalidOutcome
        );
        require!(amount > 0, GoalScoreError::ZeroAmount);

        let market = &ctx.accounts.market;
        require!(!market.resolved, GoalScoreError::MarketResolved);

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < market.kickoff_time,
            GoalScoreError::BettingClosed
        );

        // 1% fee
        let fee = amount.checked_mul(FEE_BPS).unwrap()
            .checked_div(BPS_DENOM).unwrap();
        let net_amount = amount.checked_sub(fee).unwrap();
        require!(net_amount > 0, GoalScoreError::ZeroAmount);

        // Transfer fee → treasury
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            fee,
        )?;

        // Transfer net amount → market PDA (acts as vault)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.market.to_account_info(),
                },
            ),
            net_amount,
        )?;

        // Record / update bet account
        let bet = &mut ctx.accounts.bet;
        if bet.user == Pubkey::default() {
            bet.user = ctx.accounts.user.key();
            bet.match_id = match_id;
            bet.outcome = outcome;
            bet.amount = 0;
            bet.claimed = false;
            bet.refunded = false;
            bet.bump = ctx.bumps.bet;
        }
        require!(bet.outcome == outcome, GoalScoreError::OutcomeMismatch);
        bet.amount = bet.amount.checked_add(net_amount).unwrap();

        // Update market totals
        let market = &mut ctx.accounts.market;
        market.total_pot = market.total_pot.checked_add(net_amount).unwrap();
        match outcome {
            OUTCOME_HOME => market.total_home = market.total_home.checked_add(net_amount).unwrap(),
            OUTCOME_DRAW => market.total_draw = market.total_draw.checked_add(net_amount).unwrap(),
            OUTCOME_AWAY => market.total_away = market.total_away.checked_add(net_amount).unwrap(),
            _ => unreachable!(),
        }

        emit!(BetPlaced {
            match_id,
            user: ctx.accounts.user.key(),
            outcome,
            amount: net_amount,
            fee,
        });

        Ok(())
    }

    /// Oracle resolves a match. Only oracle authority can call this.
    pub fn resolve_match(
        ctx: Context<ResolveMatch>,
        match_id: u64,
        result: u8,
    ) -> Result<()> {
        require!(
            result == OUTCOME_HOME || result == OUTCOME_DRAW || result == OUTCOME_AWAY,
            GoalScoreError::InvalidOutcome
        );

        let market = &mut ctx.accounts.market;
        require!(!market.resolved, GoalScoreError::MarketResolved);
        require!(market.oracle == ctx.accounts.oracle.key(), GoalScoreError::Unauthorized);

        market.result = result;
        market.resolved = true;

        emit!(MatchResolved {
            match_id,
            result,
            total_pot: market.total_pot,
        });

        Ok(())
    }

    /// Winner claims proportional payout. 1% fee taken at claim time.
    pub fn claim(ctx: Context<Claim>, match_id: u64) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.resolved, GoalScoreError::MarketNotResolved);
        require!(market.result != OUTCOME_DRAW, GoalScoreError::DrawUseRefund);

        let bet = &ctx.accounts.bet;
        require!(!bet.claimed, GoalScoreError::AlreadyClaimed);
        require!(!bet.refunded, GoalScoreError::AlreadyRefunded);
        require!(bet.outcome == market.result, GoalScoreError::WrongOutcome);

        let winning_total = match market.result {
            OUTCOME_HOME => market.total_home,
            OUTCOME_AWAY => market.total_away,
            _ => return err!(GoalScoreError::DrawUseRefund),
        };
        require!(winning_total > 0, GoalScoreError::ZeroAmount);

        // Proportional: user_share = (bet / winning_total) * total_pot
        let gross_payout = (bet.amount as u128)
            .checked_mul(market.total_pot as u128).unwrap()
            .checked_div(winning_total as u128).unwrap() as u64;

        let fee = gross_payout.checked_mul(FEE_BPS).unwrap()
            .checked_div(BPS_DENOM).unwrap();
        let net_payout = gross_payout.checked_sub(fee).unwrap();
        require!(net_payout > 0, GoalScoreError::ZeroAmount);

        // Mark claimed before transfers (reentrancy guard)
        ctx.accounts.bet.claimed = true;

        let match_id_bytes = match_id.to_le_bytes();
        let seeds = &[b"market".as_ref(), match_id_bytes.as_ref(), &[market.bump]];
        let signer = &[&seeds[..]];

        // Fee → treasury
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.market.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
                signer,
            ),
            fee,
        )?;

        // Net payout → user
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.market.to_account_info(),
                    to: ctx.accounts.user.to_account_info(),
                },
                signer,
            ),
            net_payout,
        )?;

        emit!(Claimed {
            match_id,
            user: ctx.accounts.user.key(),
            gross_payout,
            fee,
            net_payout,
        });

        Ok(())
    }

    /// Refund on draw — full net bet returned, no fee.
    pub fn refund(ctx: Context<Refund>, match_id: u64) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.resolved, GoalScoreError::MarketNotResolved);
        require!(market.result == OUTCOME_DRAW, GoalScoreError::NotADraw);

        let bet = &ctx.accounts.bet;
        require!(!bet.claimed, GoalScoreError::AlreadyClaimed);
        require!(!bet.refunded, GoalScoreError::AlreadyRefunded);
        require!(bet.amount > 0, GoalScoreError::ZeroAmount);

        let refund_amount = bet.amount;
        ctx.accounts.bet.refunded = true;

        let match_id_bytes = match_id.to_le_bytes();
        let seeds = &[b"market".as_ref(), match_id_bytes.as_ref(), &[market.bump]];
        let signer = &[&seeds[..]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.market.to_account_info(),
                    to: ctx.accounts.user.to_account_info(),
                },
                signer,
            ),
            refund_amount,
        )?;

        emit!(Refunded {
            match_id,
            user: ctx.accounts.user.key(),
            amount: refund_amount,
        });

        Ok(())
    }
}

// ─── Account Structs ──────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(match_id: u64)]
pub struct CreateMatch<'info> {
    #[account(
        init,
        payer = oracle,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub oracle: Signer<'info>,

    /// CHECK: wallet address only, no data read
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: u64)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [b"market", match_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", match_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: validated against market.treasury
    #[account(mut, constraint = treasury.key() == market.treasury @ GoalScoreError::Unauthorized)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: u64, result: u8)]
pub struct ResolveMatch<'info> {
    #[account(
        mut,
        seeds = [b"market", match_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(mut, constraint = oracle.key() == market.oracle @ GoalScoreError::Unauthorized)]
    pub oracle: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: u64)]
pub struct Claim<'info> {
    #[account(
        mut,
        seeds = [b"market", match_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"bet", match_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = bet.bump,
        constraint = bet.user == user.key() @ GoalScoreError::Unauthorized,
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: validated against market.treasury
    #[account(mut, constraint = treasury.key() == market.treasury @ GoalScoreError::Unauthorized)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: u64)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [b"market", match_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"bet", match_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = bet.bump,
        constraint = bet.user == user.key() @ GoalScoreError::Unauthorized,
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ─── State ────────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub match_id: u64,
    pub oracle: Pubkey,
    pub treasury: Pubkey,
    pub kickoff_time: i64,
    pub result: u8,
    pub resolved: bool,
    pub total_pot: u64,
    pub total_home: u64,
    pub total_draw: u64,
    pub total_away: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub user: Pubkey,
    pub match_id: u64,
    pub outcome: u8,
    pub amount: u64,
    pub claimed: bool,
    pub refunded: bool,
    pub bump: u8,
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct MatchCreated {
    pub match_id: u64,
    pub oracle: Pubkey,
    pub kickoff_time: i64,
}

#[event]
pub struct BetPlaced {
    pub match_id: u64,
    pub user: Pubkey,
    pub outcome: u8,
    pub amount: u64,
    pub fee: u64,
}

#[event]
pub struct MatchResolved {
    pub match_id: u64,
    pub result: u8,
    pub total_pot: u64,
}

#[event]
pub struct Claimed {
    pub match_id: u64,
    pub user: Pubkey,
    pub gross_payout: u64,
    pub fee: u64,
    pub net_payout: u64,
}

#[event]
pub struct Refunded {
    pub match_id: u64,
    pub user: Pubkey,
    pub amount: u64,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum GoalScoreError {
    #[msg("Invalid outcome. Must be 0 (Home), 1 (Draw), or 2 (Away).")]
    InvalidOutcome,
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Market is already resolved.")]
    MarketResolved,
    #[msg("Market is not yet resolved.")]
    MarketNotResolved,
    #[msg("Betting is closed — match has started.")]
    BettingClosed,
    #[msg("You have already claimed your winnings.")]
    AlreadyClaimed,
    #[msg("You have already been refunded.")]
    AlreadyRefunded,
    #[msg("You did not pick the winning outcome.")]
    WrongOutcome,
    #[msg("Match ended in a draw — use refund instead of claim.")]
    DrawUseRefund,
    #[msg("Match result was not a draw — use claim instead of refund.")]
    NotADraw,
    #[msg("Unauthorized.")]
    Unauthorized,
    #[msg("Cannot change outcome on an existing bet.")]
    OutcomeMismatch,
}
