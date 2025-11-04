# 🚀 GitHub Pages Deployment Guide

## Quick Deployment Steps

### 1. Push Your Code to GitHub
```bash
git add .
git commit -m "Deploy TimeLock Predictions with all features"
git push origin main
```

### 2. Enable GitHub Pages
1. Go to your GitHub repository: `https://github.com/Arpit-Jindal-01/TimeLock-Predictions`
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/docs`
4. Click **Save**
5. Wait 1-2 minutes for deployment

### 3. Access Your Site
Your site will be available at:
```
https://arpit-jindal-01.github.io/TimeLock-Predictions/
```

Or directly access frontend:
```
https://arpit-jindal-01.github.io/TimeLock-Predictions/frontend/index.html
```

## 📁 File Structure for GitHub Pages

```
TimeLock-Predictions/
├── .nojekyll                 # Disable Jekyll processing
├── docs/
│   └── index.html           # Redirect to frontend
├── frontend/
│   ├── index.html           # Main animated app
│   ├── analytics.html       # Analytics dashboard
│   ├── profile.html         # User profile
│   ├── app_enhanced.js      # Main logic with wallet & balance
│   ├── styles_animated.css  # All animations
│   ├── notifications.js     # Notification system
│   └── social.js           # Social sharing
└── contract/
    └── ...                  # Smart contract (already deployed)
```

## ✅ Pre-Deployment Checklist

- [x] All files are in the correct structure
- [x] `.nojekyll` file created (disables Jekyll)
- [x] Redirect page created in `/docs`
- [x] All frontend features working locally
- [x] Wallet connection tested (Freighter + Manual)
- [x] Balance system working
- [x] Notifications fixed with safe wrappers
- [x] Mobile responsive design
- [x] Contract deployed: `CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD`

## 🔧 Configuration Details

### Contract Configuration
The smart contract is already deployed on Stellar Testnet:
- **Contract ID**: `CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD`
- **Network**: Testnet
- **Functions**: 10 (initialize, create_prediction, stake, resolve, claim, etc.)

### Frontend Features
✅ Animated rising logo and floating particles
✅ Freighter wallet integration
✅ Manual public key login
✅ Live XLM balance display
✅ Instant balance deduction (150 XLM predictions, custom stakes)
✅ Analytics dashboard with 4 charts
✅ User profile with history & achievements
✅ Mobile optimization
✅ Notification system with safe wrappers
✅ Social sharing (Twitter, Telegram, WhatsApp)

## 🌐 Alternative Deployment Options

### Option 1: Root Directory (/)
If you prefer to deploy from root:
1. Settings → Pages → Folder: `/ (root)`
2. Move frontend files to root
3. Access: `https://arpit-jindal-01.github.io/TimeLock-Predictions/index.html`

### Option 2: Frontend Directory
If you prefer `/frontend`:
1. Settings → Pages → Folder: `/ (root)`
2. Keep current structure
3. Access: `https://arpit-jindal-01.github.io/TimeLock-Predictions/frontend/index.html`

### Option 3: Custom Domain
1. Buy a domain (e.g., timelockpredictions.com)
2. Settings → Pages → Custom domain
3. Add CNAME record in your domain provider
4. Enable HTTPS

## 🐛 Troubleshooting

### Issue: 404 Not Found
- **Solution**: Wait 2-3 minutes after enabling Pages
- Check branch is `main` and folder is `/docs`

### Issue: CSS/JS Not Loading
- **Solution**: Check file paths are relative
- Ensure `.nojekyll` file exists (disables Jekyll)

### Issue: Wallet Not Connecting
- **Solution**: Install Freighter extension
- Use manual public key login as alternative

### Issue: Balance Not Updating
- **Solution**: Click refresh button (🔄)
- Check wallet is connected
- Verify you're on Stellar Testnet

## 📊 Post-Deployment Testing

After deployment, test these features:

1. **Wallet Connection**
   - Click "Connect Freighter Wallet"
   - Or use "Enter Public Key" for manual login

2. **Balance System**
   - Check XLM balance displays
   - Click refresh button
   - Try creating prediction (150 XLM deduction)

3. **Pages**
   - Main app (index.html)
   - Analytics dashboard
   - User profile
   - Mobile view

4. **Notifications**
   - Should show without errors
   - Check browser console for logs

## 🎯 Success Metrics

Once deployed, you should see:
- ✅ Live site accessible via GitHub Pages URL
- ✅ All animations working smoothly
- ✅ Wallet connection functional
- ✅ Balance deduction working
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Social sharing working

## 📝 Next Steps After Deployment

1. Share your site URL
2. Test on mobile devices
3. Get testnet XLM from faucet
4. Create test predictions
5. Share on social media
6. Consider custom domain for production

---

**Need Help?** Check the README.md for detailed feature documentation.

**Your Contract**: `CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD`

**Your GitHub Pages URL**: `https://arpit-jindal-01.github.io/TimeLock-Predictions/`
