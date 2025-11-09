// Trencher IQ Escrow Client
// Client-side library for interacting with the escrow smart contract

import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';

// Program ID - This will be set after deploying the program
// For now, using a placeholder that needs to be replaced
const PROGRAM_ID = new PublicKey('TrenchEscrowProgramXXXXXXXXXXXXXXXXXXXXXXXXXX');

// IDL (Interface Definition Language) for the program
const IDL = {
    "version": "0.1.0",
    "name": "trencher_escrow",
    "instructions": [
        {
            "name": "initializeGame",
            "accounts": [
                { "name": "gameEscrow", "isMut": true, "isSigner": false },
                { "name": "host", "isMut": true, "isSigner": true },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "gameCode", "type": "string" },
                { "name": "prizePool", "type": "u64" }
            ]
        },
        {
            "name": "completeGame",
            "accounts": [
                { "name": "gameEscrow", "isMut": true, "isSigner": false },
                { "name": "host", "isMut": true, "isSigner": true },
                { "name": "winner", "isMut": true, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "winnerAddress", "type": "publicKey" }
            ]
        },
        {
            "name": "cancelGame",
            "accounts": [
                { "name": "gameEscrow", "isMut": true, "isSigner": false },
                { "name": "host", "isMut": true, "isSigner": true },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": []
        }
    ],
    "accounts": [
        {
            "name": "GameEscrow",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "host", "type": "publicKey" },
                    { "name": "gameCode", "type": "string" },
                    { "name": "prizePool", "type": "u64" },
                    { "name": "winner", "type": { "option": "publicKey" } },
                    { "name": "isCompleted", "type": "bool" },
                    { "name": "isCancelled", "type": "bool" },
                    { "name": "bump", "type": "u8" }
                ]
            }
        }
    ]
};

class EscrowClient {
    constructor(connection, wallet) {
        this.connection = connection;
        this.wallet = wallet;
    }

    // Get the Program Derived Address (PDA) for a game
    async getGameEscrowPDA(gameCode) {
        const [pda, bump] = await PublicKey.findProgramAddress(
            [
                Buffer.from('game_escrow'),
                Buffer.from(gameCode)
            ],
            PROGRAM_ID
        );
        return { pda, bump };
    }

    // Initialize a game and deposit funds into escrow
    async initializeGame(gameCode, prizePoolSOL) {
        try {
            const provider = new AnchorProvider(
                this.connection,
                this.wallet,
                AnchorProvider.defaultOptions()
            );

            const program = new Program(IDL, PROGRAM_ID, provider);

            const { pda: gameEscrowPDA } = await this.getGameEscrowPDA(gameCode);
            const prizePoolLamports = Math.floor(prizePoolSOL * LAMPORTS_PER_SOL);

            // Build and send transaction
            const tx = await program.methods
                .initializeGame(gameCode, prizePoolLamports)
                .accounts({
                    gameEscrow: gameEscrowPDA,
                    host: this.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Game initialized. Transaction:', tx);
            return { success: true, signature: tx, escrowAddress: gameEscrowPDA.toBase58() };
        } catch (error) {
            console.error('Error initializing game:', error);
            return { success: false, error: error.message };
        }
    }

    // Complete game and pay winner
    async completeGame(gameCode, winnerAddress) {
        try {
            const provider = new AnchorProvider(
                this.connection,
                this.wallet,
                AnchorProvider.defaultOptions()
            );

            const program = new Program(IDL, PROGRAM_ID, provider);

            const { pda: gameEscrowPDA } = await this.getGameEscrowPDA(gameCode);
            const winnerPubkey = new PublicKey(winnerAddress);

            // Build and send transaction
            const tx = await program.methods
                .completeGame(winnerPubkey)
                .accounts({
                    gameEscrow: gameEscrowPDA,
                    host: this.wallet.publicKey,
                    winner: winnerPubkey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Game completed and prize paid. Transaction:', tx);
            return { success: true, signature: tx };
        } catch (error) {
            console.error('Error completing game:', error);
            return { success: false, error: error.message };
        }
    }

    // Cancel game and refund host
    async cancelGame(gameCode) {
        try {
            const provider = new AnchorProvider(
                this.connection,
                this.wallet,
                AnchorProvider.defaultOptions()
            );

            const program = new Program(IDL, PROGRAM_ID, provider);

            const { pda: gameEscrowPDA } = await this.getGameEscrowPDA(gameCode);

            // Build and send transaction
            const tx = await program.methods
                .cancelGame()
                .accounts({
                    gameEscrow: gameEscrowPDA,
                    host: this.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Game cancelled and refunded. Transaction:', tx);
            return { success: true, signature: tx };
        } catch (error) {
            console.error('Error cancelling game:', error);
            return { success: false, error: error.message };
        }
    }

    // Get game escrow account data
    async getGameData(gameCode) {
        try {
            const provider = new AnchorProvider(
                this.connection,
                this.wallet,
                AnchorProvider.defaultOptions()
            );

            const program = new Program(IDL, PROGRAM_ID, provider);

            const { pda: gameEscrowPDA } = await this.getGameEscrowPDA(gameCode);
            const gameData = await program.account.gameEscrow.fetch(gameEscrowPDA);

            return {
                success: true,
                data: {
                    host: gameData.host.toBase58(),
                    gameCode: gameData.gameCode,
                    prizePool: gameData.prizePool / LAMPORTS_PER_SOL,
                    winner: gameData.winner ? gameData.winner.toBase58() : null,
                    isCompleted: gameData.isCompleted,
                    isCancelled: gameData.isCancelled
                }
            };
        } catch (error) {
            console.error('Error fetching game data:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.EscrowClient = EscrowClient;
    window.ESCROW_PROGRAM_ID = PROGRAM_ID.toBase58();
}

export { EscrowClient, PROGRAM_ID };
