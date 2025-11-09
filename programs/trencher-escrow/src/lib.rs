use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("TrenchEscrowProgramXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod trencher_escrow {
    use super::*;

    /// Initialize a game and deposit prize pool into escrow
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_code: String,
        prize_pool: u64,
    ) -> Result<()> {
        let game_escrow = &mut ctx.accounts.game_escrow;

        // Set game data
        game_escrow.host = ctx.accounts.host.key();
        game_escrow.game_code = game_code;
        game_escrow.prize_pool = prize_pool;
        game_escrow.winner = None;
        game_escrow.is_completed = false;
        game_escrow.is_cancelled = false;
        game_escrow.bump = ctx.bumps.game_escrow;

        // Transfer SOL from host to escrow PDA
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.host.to_account_info(),
                to: ctx.accounts.game_escrow.to_account_info(),
            },
        );
        transfer(transfer_ctx, prize_pool)?;

        msg!("Game initialized: {} with prize: {} lamports", game_escrow.game_code, prize_pool);
        Ok(())
    }

    /// Complete game and pay winner
    pub fn complete_game(
        ctx: Context<CompleteGame>,
        winner_address: Pubkey,
    ) -> Result<()> {
        let game_escrow = &mut ctx.accounts.game_escrow;

        // Validate host is calling this
        require!(
            game_escrow.host == ctx.accounts.host.key(),
            EscrowError::UnauthorizedHost
        );

        // Check game is not already completed
        require!(
            !game_escrow.is_completed && !game_escrow.is_cancelled,
            EscrowError::GameAlreadyFinalized
        );

        // Set winner
        game_escrow.winner = Some(winner_address);
        game_escrow.is_completed = true;

        // Transfer prize to winner
        let game_code = game_escrow.game_code.clone();
        let bump = game_escrow.bump;
        let seeds = &[
            b"game_escrow",
            game_code.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.game_escrow.to_account_info(),
                to: ctx.accounts.winner.to_account_info(),
            },
            signer,
        );
        transfer(transfer_ctx, game_escrow.prize_pool)?;

        msg!("Prize of {} lamports paid to winner: {}", game_escrow.prize_pool, winner_address);
        Ok(())
    }

    /// Cancel game and refund host
    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game_escrow = &mut ctx.accounts.game_escrow;

        // Validate host is calling this
        require!(
            game_escrow.host == ctx.accounts.host.key(),
            EscrowError::UnauthorizedHost
        );

        // Check game is not already completed
        require!(
            !game_escrow.is_completed && !game_escrow.is_cancelled,
            EscrowError::GameAlreadyFinalized
        );

        game_escrow.is_cancelled = true;

        // Refund prize to host
        let game_code = game_escrow.game_code.clone();
        let bump = game_escrow.bump;
        let seeds = &[
            b"game_escrow",
            game_code.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.game_escrow.to_account_info(),
                to: ctx.accounts.host.to_account_info(),
            },
            signer,
        );
        transfer(transfer_ctx, game_escrow.prize_pool)?;

        msg!("Game cancelled and {} lamports refunded to host", game_escrow.prize_pool);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_code: String)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = host,
        space = 8 + GameEscrow::INIT_SPACE,
        seeds = [b"game_escrow", game_code.as_bytes()],
        bump
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteGame<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(mut)]
    pub host: Signer<'info>,

    /// CHECK: Winner account to receive prize
    #[account(mut)]
    pub winner: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(mut)]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct GameEscrow {
    pub host: Pubkey,           // 32 bytes
    #[max_len(6)]
    pub game_code: String,      // 4 + 6 bytes
    pub prize_pool: u64,        // 8 bytes
    pub winner: Option<Pubkey>, // 1 + 32 bytes
    pub is_completed: bool,     // 1 byte
    pub is_cancelled: bool,     // 1 byte
    pub bump: u8,               // 1 byte
}

#[error_code]
pub enum EscrowError {
    #[msg("Only the host can perform this action")]
    UnauthorizedHost,
    #[msg("Game has already been completed or cancelled")]
    GameAlreadyFinalized,
}
