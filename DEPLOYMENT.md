# 🚀 Trencher IQ - Railway Deployment Guide

## Current Status
✅ **Deployed on Railway**
✅ **Production-Ready Server**
✅ **Multiple Device Support**
✅ **WebSocket/Socket.io Configured**

---

## 📋 What's Already Done

### ✅ Server Configuration
- CORS enabled for cross-origin requests
- Socket.io configured for multiple transports (WebSocket + Polling)
- Environment variables support
- Automatic port detection from Railway
- Production-ready error handling

### ✅ Features Working
- Real-time multiplayer games
- WebSocket connections
- 6-digit game codes
- Free & Prize games
- Automatic game progression
- Solana wallet integration
- Live leaderboards

---

## 🌐 Setup Your Custom Domain

### Step 1: Get Your Railway URL
1. Go to your Railway dashboard
2. Find your deployment
3. Copy the URL (e.g., `https://trencheriq-production.up.railway.app`)

### Step 2: Add Custom Domain on Railway
1. In Railway dashboard → Click your project
2. Go to **Settings** tab
3. Click **Domains** section
4. Click **Custom Domain**
5. Enter your domain (e.g., `trencheriq.com` or `play.trencheriq.com`)

### Step 3: Configure DNS (At Your Domain Registrar)
Add these DNS records:

**Option A: Root Domain (trencheriq.com)**
```
Type: CNAME
Name: @
Value: your-app.up.railway.app
TTL: Auto or 3600
```

**Option B: Subdomain (play.trencheriq.com)**
```
Type: CNAME
Name: play
Value: your-app.up.railway.app
TTL: Auto or 3600
```

### Step 4: Update Environment Variable (Optional)
In Railway dashboard:
1. Go to **Variables** tab
2. Add variable:
   - Name: `CLIENT_URL`
   - Value: `https://your-domain.com`

*Note: Not required - server accepts all origins by default*

---

## 🔧 Environment Variables on Railway

### Required (Auto-Set by Railway)
- `PORT` - Railway sets this automatically

### Optional (Recommended)
```bash
SOLANA_NETWORK=https://api.mainnet-beta.solana.com
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
```

---

## 🧪 Testing Multi-Device Support

### Test 1: Same WiFi Network
1. Open `https://your-railway-url.railway.app` on laptop
2. Open same URL on phone (same WiFi)
3. Create game on laptop
4. Join game on phone with code
5. ✅ Should work perfectly

### Test 2: Different Networks
1. Laptop on WiFi
2. Phone on mobile data
3. Same test as above
4. ✅ Should work (CORS configured)

### Test 3: Multiple Players
1. Open on 5+ different devices
2. All join same game code
3. Host starts game
4. ✅ All should see questions simultaneously

---

## 🐛 Troubleshooting

### "Connection Failed" Error
- **Issue**: CORS or WebSocket not working
- **Fix**: Check Railway logs, ensure `CLIENT_URL` is set correctly
- **Quick Fix**: Remove `CLIENT_URL` variable (allows all origins)

### "Game Not Found" Error
- **Issue**: Backend not saving games
- **Fix**: Check Railway deployment status
- **Quick Fix**: Redeploy on Railway

### Players Can't Join
- **Issue**: WebSocket connection blocked
- **Fix**: Railway supports WebSocket by default - check browser console
- **Quick Fix**: Try on different browser

### Slow Response Times
- **Issue**: Server cold start
- **Fix**: Railway's free tier sleeps after inactivity
- **Solution**: Upgrade to Railway Pro ($5/mo) for always-on

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────┐
│          CLIENTS (Browsers)              │
│  Laptop, Phone, Tablet, Desktop, etc.   │
└──────────────┬──────────────────────────┘
               │ HTTPS + WebSocket
               ▼
┌─────────────────────────────────────────┐
│         RAILWAY DEPLOYMENT              │
│                                          │
│  ┌────────────────────────────────┐    │
│  │     Node.js Server             │    │
│  │  - Express.js                  │    │
│  │  - Socket.io (WebSocket)       │    │
│  │  - CORS Enabled                │    │
│  │  - Port: Auto (Railway)        │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │     In-Memory Storage          │    │
│  │  - Active Games (Map)          │    │
│  │  - Quizzes (JSON file)         │    │
│  │  - Player Answers              │    │
│  │  - Leaderboards                │    │
│  └────────────────────────────────┘    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       Solana Mainnet (Blockchain)       │
│  - Prize pool transactions              │
│  - Phantom wallet integration           │
└─────────────────────────────────────────┘
```

---

## 🎯 Production Checklist

✅ Server deployed to Railway
✅ CORS configured
✅ Socket.io production settings
✅ Environment variables ready
✅ Automatic scaling enabled
✅ Health checks configured
✅ Error logging active

### Next Steps:
1. ⬜ Add custom domain to Railway
2. ⬜ Configure DNS records
3. ⬜ Test with 10+ concurrent players
4. ⬜ Monitor Railway logs
5. ⬜ Consider upgrading Railway plan for always-on

---

## 💡 Tips

- **Free Tier**: Server sleeps after 5 min inactivity, wakes in ~30s
- **Pro Tier** ($5/mo): Always running, faster, no sleep
- **Custom Domain**: Free SSL certificate included
- **WebSocket**: Fully supported on Railway
- **Logs**: Check Railway dashboard for errors

---

## 🆘 Need Help?

1. Check Railway logs in dashboard
2. Verify all environment variables
3. Test with different browsers
4. Check browser console for errors
5. Ensure Phantom wallet is installed

---

**Your app is PRODUCTION READY! 🚀**

Just add your custom domain and you're live!
