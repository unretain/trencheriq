# Trencher IQ - Solana Escrow Deployment Guide

This guide explains how to deploy the Trencher IQ escrow smart contract to Solana mainnet.

## Prerequisites

1. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   rustup component add rustfmt
   ```

2. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

3. **Install Anchor**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

## Setup Wallet

1. **Create a new wallet** (or use existing):
   ```bash
   solana-keygen new --outfile ~/.config/solana/deployer.json
   ```

2. **Set Solana to mainnet**:
   ```bash
   solana config set --url https://api.mainnet-beta.solana.com
   ```

3. **Fund your wallet** with SOL for deployment (approximately 2-5 SOL needed):
   ```bash
   solana address
   # Send SOL to this address from an exchange or another wallet
   ```

4. **Check balance**:
   ```bash
   solana balance
   ```

## Build the Program

1. **Navigate to project directory**:
   ```bash
   cd /path/to/trencheriq
   ```

2. **Build the Anchor program**:
   ```bash
   anchor build
   ```

   This will compile the Rust program in `programs/trencher-escrow/src/lib.rs`

3. **Get the program ID**:
   ```bash
   solana address -k target/deploy/trencher_escrow-keypair.json
   ```

   Copy this address (it will look like: `TrenchXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

4. **Update the program ID** in two places:
   - In `programs/trencher-escrow/src/lib.rs` - Line 4: `declare_id!("YOUR_PROGRAM_ID");`
   - In `Anchor.toml` - Line 7: `trencher_escrow = "YOUR_PROGRAM_ID"`
   - In `escrow-client.js` - Line 14: `const PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID');`

5. **Rebuild after updating program ID**:
   ```bash
   anchor build
   ```

## Deploy to Mainnet

1. **Deploy the program**:
   ```bash
   anchor deploy --provider.cluster mainnet
   ```

   This will:
   - Upload your program to Solana mainnet
   - Cost approximately 2-5 SOL in deployment fees
   - Return a Program ID (should match the one you got earlier)

2. **Verify deployment**:
   ```bash
   solana program show YOUR_PROGRAM_ID
   ```

   You should see details about your deployed program.

## Update Frontend

After successful deployment:

1. **Update `escrow-client.js`** with your actual program ID (if not done already)

2. **Restart your server**:
   ```bash
   npm start
   ```

## Testing on Mainnet

⚠️ **WARNING: You will be using real SOL on mainnet!**

### Test with Small Amounts First

1. Create a test game with **0.0001 SOL** prize
2. Join with a test wallet
3. Complete the game
4. Verify prize is transferred correctly

### Monitor Transactions

View all transactions for your program:
```bash
solana program show YOUR_PROGRAM_ID --programs
```

View specific game escrow account:
```bash
solana account ESCROW_PDA_ADDRESS
```

## Alternative: Deploy to Devnet First

For testing without real SOL:

1. **Switch to devnet**:
   ```bash
   solana config set --url https://api.devnet.solana.com
   ```

2. **Get devnet SOL** (free):
   ```bash
   solana airdrop 2
   ```

3. **Deploy to devnet**:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

4. **Update `server.js`** to use devnet:
   ```javascript
   const SOLANA_NETWORK = 'https://api.devnet.solana.com';
   ```

## Security Considerations

### Program Authority

The deployed program is **immutable** by default, meaning:
- No one can upgrade it after deployment
- All funds in escrow are completely secure
- Only the host wallet can trigger payouts (via signed transactions)

### Upgradeable vs Immutable

Current implementation is **immutable** for maximum security.

If you want an **upgradeable** program (to fix bugs):
```bash
solana program deploy target/deploy/trencher_escrow.so --program-id target/deploy/trencher_escrow-keypair.json --upgradeable
```

⚠️ **Security Trade-off**: Upgradeable programs are less secure as the upgrade authority can modify the program.

## Costs

### Deployment Costs
- **Program deployment**: 2-5 SOL (one-time)
- **Program rent**: Included in deployment cost

### Per-Game Costs
- **Creating escrow account**: ~0.001 SOL (rent-exempt)
- **Transaction fees**: ~0.00001 SOL per transaction

### Rent Exemption
Escrow accounts are rent-exempt, meaning once created, they don't require ongoing payments.

## Troubleshooting

### Insufficient Funds
```
Error: Insufficient funds
```
**Solution**: Add more SOL to your deployer wallet

### Program ID Mismatch
```
Error: Program ID mismatch
```
**Solution**: Make sure you updated the program ID in all files after running `anchor build`

### Transaction Failed
```
Error: Transaction simulation failed
```
**Solution**: Check Solana Explorer for detailed error: https://explorer.solana.com/

### Program Already Deployed
If you want to redeploy:
```bash
solana program close YOUR_PROGRAM_ID
anchor deploy --provider.cluster mainnet
```

## Mainnet RPC Providers

Default RPC can be rate-limited. For production, use a dedicated RPC provider:

### Recommended Providers:
1. **Helius**: https://helius.xyz (Free tier available)
2. **QuickNode**: https://quicknode.com (Best performance)
3. **Alchemy**: https://alchemy.com (Enterprise-grade)
4. **Triton**: https://triton.one (High throughput)

Update in `server.js` and HTML files:
```javascript
const SOLANA_NETWORK = 'https://your-custom-rpc-url.com';
```

## Monitoring & Analytics

### View Program Transactions
```bash
solana transaction-history YOUR_PROGRAM_ID
```

### Solana Explorer
View your program on Solana Explorer:
- Mainnet: https://explorer.solana.com/address/YOUR_PROGRAM_ID
- Devnet: https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet

### Track Escrow Accounts
Each game creates an escrow account at a Program Derived Address (PDA).
Formula: `[b"game_escrow", game_code.as_bytes()]`

## Support

For issues deploying the program:
- Anchor Discord: https://discord.gg/anchor
- Solana Stack Exchange: https://solana.stackexchange.com
- Solana Discord: https://discord.gg/solana

## Next Steps

After successful deployment:
1. Update environment variables with program ID
2. Test with small amounts
3. Monitor for any issues
4. Scale to production with dedicated RPC

## Program Features

✅ **Secure Escrow**: Funds locked in PDA until game completion
✅ **Host Control**: Only host can trigger payout or cancel
✅ **Automatic Distribution**: Winner receives full prize
✅ **Refund Support**: Host can cancel and get refund before game starts
✅ **Immutable**: Program cannot be changed after deployment

## License

This program is provided as-is. Test thoroughly before using with large amounts!
