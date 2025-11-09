# Trencher IQ - Remaining Tasks

## ✅ COMPLETED

1. **Free Games Implementation**
   - ✅ Updated [host.html](host.html) with FREE GAME / PRIZE GAME toggle
   - ✅ Updated [server.js](server.js) to handle optional prizes
   - ✅ Made wallet connection optional for free games
   - ✅ Added `isFreeGame` flag to game model

2. **Terminal Theme**
   - ✅ [host.html](host.html) - Fully updated with green/black terminal theme
   - ✅ [index.html](index.html) - Already has terminal theme
   - ✅ Removed emojis from completed pages
   - ✅ Monospace 'Courier New' font
   - ✅ Green glowing borders (#00ff00)

3. **Documentation**
   - ✅ [SMART_CONTRACT_EXPLAINED.md](SMART_CONTRACT_EXPLAINED.md) - Cost analysis
   - ✅ [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md) - Change log
   - ✅ [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
   - ✅ This TODO.md file

4. **System Simplification**
   - ✅ Removed broken escrow deposit logic
   - ✅ Switched to trust-based prize system
   - ✅ Server supports both free and prize games

## ⚠️ REMAINING TASKS

### 1. Update Remaining Pages with Terminal Theme

#### join.html
- [ ] Replace purple gradient with black background
- [ ] Change all colors to #00ff00
- [ ] Remove emoji from nav
- [ ] Update fonts to 'Courier New'
- [ ] Make wallet connection optional (only for prize games)
- [ ] Add game type detection

#### games.html
- [ ] Terminal theme (black + green)
- [ ] Remove emojis
- [ ] Show "FREE" badge for free games
- [ ] Show prize amount for prize games
- [ ] Update card styling

#### play-live.html
- [ ] Terminal theme
- [ ] Remove emojis
- [ ] Keep timer and scoring logic
- [ ] Update UI colors

#### host-control.html
- [ ] Terminal theme
- [ ] Remove emojis
- [ ] Add direct SOL transfer for prize games
- [ ] Show "Free Game" message if no prize
- [ ] Remove escrow payout logic

### 2. Clean Up Smart Contract Files

- [ ] Delete or archive [programs/](programs/) folder
- [ ] Delete [escrow-client.js](escrow-client.js)
- [ ] Delete [Anchor.toml](Anchor.toml)
- [ ] Update [.gitignore](.gitignore) to remove Anchor references
- [ ] Keep [SMART_CONTRACT_EXPLAINED.md](SMART_CONTRACT_EXPLAINED.md) for reference

### 3. Update Host Control Prize Logic

In [host-control.html](host-control.html):
- [ ] Check if game is free or prize
- [ ] If free: Show "No prize - free game" message
- [ ] If prize: Show "Send Prize" button
- [ ] Implement direct transfer using Phantom wallet
- [ ] Show transaction signature after send
- [ ] Link to Solana Explorer

Example code for direct transfer:
```javascript
const transaction = new Transaction().add(
    SystemProgram.transfer({
        fromPubkey: hostWallet,
        toPubkey: winnerWallet,
        lamports: prizeAmount * LAMPORTS_PER_SOL
    })
);
const signature = await provider.signAndSendTransaction(transaction);
```

### 4. Testing Checklist

#### Free Game Flow:
- [ ] Create free game (no wallet)
- [ ] Join free game (no wallet)
- [ ] Play game
- [ ] See winner on leaderboard
- [ ] No prize transfer needed

#### Prize Game Flow:
- [ ] Create prize game (with wallet)
- [ ] Set prize amount
- [ ] Join with wallet
- [ ] Play game
- [ ] Host sends prize to winner
- [ ] Verify transaction on Solana Explorer

### 5. UI/UX Improvements

- [ ] Add "TRUST-BASED" badge to prize games
- [ ] Add disclaimer: "Host promises to send prize after game"
- [ ] Show transaction history
- [ ] Add copy button for game codes
- [ ] Mobile responsive testing

### 6. Error Handling

- [ ] Handle wallet connection failures gracefully
- [ ] Handle transaction failures
- [ ] Show clear error messages
- [ ] Add retry logic for failed joins

## 📝 IMPLEMENTATION NOTES

### Terminal Theme CSS (Copy to All Pages):
```css
body {
    font-family: 'Courier New', monospace;
    background-color: #000;
    color: #00ff00;
}

.navbar {
    background-color: #1a1a1a;
    border-bottom: 2px solid #00ff00;
}

.nav-link {
    border: 2px solid #00ff00;
    color: #00ff00;
}

.nav-link:hover {
    background-color: #00ff00;
    color: #000;
}

.card {
    background-color: #0a0a0a;
    border: 3px solid #00ff00;
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
}

button {
    background: #00ff00;
    color: #000;
    border: none;
    font-family: 'Courier New', monospace;
}
```

### Direct Prize Transfer Code:
```javascript
async function sendPrize(winnerAddress, prizeSOL) {
    const provider = window.phantom?.solana;
    const lamports = prizeSOL * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: provider.publicKey,
            toPubkey: new PublicKey(winnerAddress),
            lamports: lamports
        })
    );

    const signature = await provider.signAndSendTransaction(transaction);
    return signature.signature;
}
```

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:
- [ ] All pages have terminal theme
- [ ] All tests pass
- [ ] Smart contract files removed/archived
- [ ] Documentation updated
- [ ] Trust disclaimers added
- [ ] Error handling complete
- [ ] Mobile responsive
- [ ] Railway environment variables set
- [ ] Custom domain configured

## 📊 PRIORITY ORDER

1. **HIGH** - Update remaining pages with terminal theme
2. **HIGH** - Implement direct prize transfer in host-control
3. **MEDIUM** - Add trust disclaimers
4. **MEDIUM** - Clean up smart contract files
5. **LOW** - UI/UX improvements
6. **LOW** - Advanced error handling

## 💡 FUTURE ENHANCEMENTS

- Deploy smart contract when volume > 100 users
- Add reputation system for hosts
- Add game history and replays
- Add spectator mode
- Add tournament brackets
- Add achievements and badges
- Multi-token support (USDC, BONK, etc.)

## 📞 SUPPORT

If you need help with any of these tasks:
1. Check the documentation files
2. Review the completed [host.html](host.html) as a template
3. Test with devnet first (free!)
4. Ask for help in Discord/X Community

---

**Last Updated**: 2025-11-09
**Status**: In Progress
**Next Step**: Update join.html, games.html, play-live.html, host-control.html
