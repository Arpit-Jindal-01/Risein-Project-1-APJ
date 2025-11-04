# 🚀 Deployment Guide - TimeLock Predictions

## 📋 Overview
This guide walks you through deploying the enhanced TimeLock Predictions platform to GitHub Pages.

## ✨ What's New in Enhanced Version

### Smart Contract Improvements
- ✅ **Event Emission** - Track all contract activities
- ✅ **Prediction Cancellation** - Cancel predictions before unlock
- ✅ **Category System** - Organize predictions (Finance, Tech, Sports, etc.)
- ✅ **Enhanced Stats** - Track burned tokens, total volume, categories
- ✅ **13 Functions** - vs 9 in original (4 new functions added)

### Frontend Enhancements
- ✅ **Animated UI** - Rising logo, floating particles, smooth transitions
- ✅ **Analytics Dashboard** - 4 interactive charts with Chart.js
- ✅ **User Profiles** - Track personal stats, history, achievements
- ✅ **Enhanced UX** - Modals, better error handling, command generation
- ✅ **Responsive Design** - Works on all devices

## 🔧 Prerequisites

```bash
# Required tools
- Git
- Stellar CLI (v23.1.4+)
- Freighter Wallet
- GitHub Account
```

## 📦 Deploy Smart Contract

### 1. Build the Enhanced Contract

```bash
cd contract
stellar contract build
```

### 2. Deploy to Testnet

```bash
# Deploy contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/timelock_predictions.wasm \
  --source YOUR_ADMIN_KEY \
  --network testnet

# Save the contract ID (e.g., CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD)
```

### 3. Initialize Contract

```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_ADMIN_KEY \
  --network testnet \
  -- initialize \
  --admin YOUR_ADMIN_ADDRESS
```

## 🌐 Deploy Frontend to GitHub Pages

### Method 1: Automated Deployment

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Update CONFIG in index.html with your contract ID
# Edit line 157: contractId: 'YOUR_NEW_CONTRACT_ID'

# 3. Create gh-pages branch
git checkout -b gh-pages

# 4. Add all frontend files
git add *.html *.css *.js

# 5. Commit and push
git commit -m "Deploy enhanced frontend to GitHub Pages"
git push origin gh-pages

# 6. Enable GitHub Pages
# Go to: Repository Settings > Pages
# Source: gh-pages branch
# Root: / (root)
# Click Save
```

### Method 2: Manual Setup

1. **Go to Repository Settings**
   - Navigate to your GitHub repository
   - Click "Settings"
   - Scroll to "Pages" section

2. **Configure Source**
   - Source: Deploy from a branch
   - Branch: `gh-pages`
   - Folder: `/ (root)`
   - Click "Save"

3. **Wait for Deployment**
   - GitHub will build and deploy (1-2 minutes)
   - Your site will be live at: `https://USERNAME.github.io/REPO_NAME`

## 🔗 Update Contract Configuration

Update the `CONFIG` object in all HTML files:

### index.html (Line ~157)
```javascript
const CONFIG = {
    contractId: 'YOUR_NEW_CONTRACT_ID_HERE',
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    nativeTokenId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'
};
```

## 🧪 Testing Deployment

### 1. Test Local Server
```bash
cd frontend
python3 -m http.server 8080
# Open: http://localhost:8080
```

### 2. Test Features
- ✅ Connect Freighter Wallet
- ✅ View animated landing page
- ✅ Navigate to Analytics page
- ✅ Check Profile page
- ✅ Create prediction (via CLI command)
- ✅ Stake on prediction
- ✅ Resolve prediction

### 3. Test Production
```bash
# After GitHub Pages deployment
# Visit: https://YOUR_USERNAME.github.io/TimeLock-Predictions
```

## 📊 Enhanced Features Available

### 1. Analytics Dashboard (`/analytics.html`)
- **Prediction Outcomes Chart** - Doughnut chart showing YES/NO/Pending
- **Pool Distribution** - Bar chart of YES vs NO pools
- **Weekly Activity** - Line chart of prediction creation trends
- **Category Breakdown** - Pie chart of prediction categories
- **Top Predictors Leaderboard** - Ranked by earnings

### 2. User Profile (`/profile.html`)
- **Personal Stats** - Total predictions, wins, win rate, earnings
- **Prediction History** - All user predictions with outcomes
- **Achievements** - Unlock badges and milestones
- **Wallet Integration** - Auto-connect with Freighter

### 3. Enhanced Main Page
- **Animated Background** - 10 floating particles
- **Rising Logo** - Appears on page load
- **6 Stat Cards** - Total, active, resolved, treasury, burned, volume
- **Real-time Countdowns** - Dynamic time remaining displays
- **Modal System** - Command generation for contract interactions

## 🔐 Security Notes

### Never Commit:
- ❌ Private keys
- ❌ Seed phrases
- ❌ Admin credentials

### Best Practices:
- ✅ Use environment variables for secrets
- ✅ Test on testnet first
- ✅ Verify contract code before deployment
- ✅ Keep Freighter password secure

## 📱 Mobile Optimization

The site is responsive and works on:
- 📱 Mobile phones (320px+)
- 📱 Tablets (768px+)
- 💻 Desktops (1024px+)
- 🖥️ Large screens (1440px+)

## 🐛 Troubleshooting

### Issue: GitHub Pages not updating
```bash
# Force refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
# Clear GitHub Pages cache (wait 5-10 minutes)
# Check Actions tab for build errors
```

### Issue: Contract interaction fails
```bash
# Verify contract ID is correct
# Check Freighter is on Testnet
# Ensure account has XLM balance
# Run commands from terminal first
```

### Issue: Animations not working
```bash
# Check styles_animated.css is loaded
# Verify JavaScript is enabled
# Clear browser cache
# Try different browser
```

## 🎯 Next Steps

1. **Deploy Contract** ✓ Build → Deploy → Initialize
2. **Update Frontend** ✓ Replace contract ID in HTML files
3. **Test Locally** ✓ Run local server and test all features
4. **Deploy to GitHub Pages** ✓ Push to gh-pages branch
5. **Share** ✓ Share your live URL!

## 🌟 Features Comparison

| Feature | Original | Enhanced |
|---------|----------|----------|
| Functions | 9 | **13** (+4) |
| Events | ❌ | ✅ |
| Cancellation | ❌ | ✅ |
| Categories | ❌ | ✅ |
| Stats Tracking | Basic | **Advanced** |
| UI Animation | ❌ | ✅ |
| Analytics | ❌ | **4 Charts** |
| User Profiles | ❌ | ✅ |
| Achievements | ❌ | ✅ |
| Modals | ❌ | ✅ |
| Charts | ❌ | **Chart.js** |

## 🆘 Support

- **Documentation**: See `ANALYSIS_AND_IMPROVEMENTS.md`
- **Contract Code**: `contract/contracts/timelock/src/lib.rs`
- **Original Version**: `lib_original_backup.rs`
- **Frontend**: All HTML files in `frontend/`

## 🎉 Congratulations!

Your enhanced TimeLock Predictions platform is now deployed with:
- ✨ Beautiful animated UI
- 📊 Advanced analytics
- 👤 User profiles
- 🎯 Enhanced contract features
- 🚀 Live on GitHub Pages

Share your URL and start making predictions! 🔮
