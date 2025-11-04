# 🔗 Connect Freighter Wallet to TimeLock Predictions

## Quick Start Guide

### Step 1: Install Freighter Wallet (if not already installed)

1. **Install the Extension:**
   - Chrome/Brave: [Chrome Web Store](https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk)
   - Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/freighter/)
   - Edge: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk)

2. **Set Up Your Wallet:**
   - Click the Freighter icon in your browser
   - Create a new wallet OR import existing wallet
   - **SAVE YOUR SECRET KEY SAFELY!** ⚠️
   - Set a password

3. **Switch to Testnet:**
   - Click Settings (gear icon) in Freighter
   - Select "Change Network"
   - Choose **"Testnet"** (important for testing)

4. **Fund Your Testnet Account:**
   ```bash
   # Get your address from Freighter
   # Then visit: https://laboratory.stellar.org/#account-creator?network=test
   # OR use friendbot:
   curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS_HERE"
   ```

---

## Step 2: Test Your Freighter Connection

### Option A: Use the Test Page (Recommended)

1. **Open the test page:**
   ```bash
   cd "/Users/arpitjindal/VS Code/Bootcamp 2/TimeLock-Predictions/frontend"
   open freighter-test.html
   ```

2. **Follow the 4 steps on the test page:**
   - ✅ Check Installation
   - ✅ Connect Wallet
   - ✅ View Address
   - ✅ Check Network

3. **If all steps pass:** Your Freighter is working! ✅

### Option B: Quick Browser Test

1. Open browser console (F12)
2. Paste this code:
   ```javascript
   // Check if Freighter is installed
   console.log('Freighter API:', typeof freighterApi !== 'undefined' ? 'Found ✅' : 'Not Found ❌');
   
   // Try to connect
   if (typeof freighterApi !== 'undefined') {
       freighterApi.requestAccess()
           .then(address => console.log('Connected! Address:', address))
           .catch(err => console.error('Error:', err));
   }
   ```

---

## Step 3: Use TimeLock Predictions App

### Start the App:

1. **Open the main app:**
   ```bash
   cd "/Users/arpitjindal/VS Code/Bootcamp 2/TimeLock-Predictions/frontend"
   open index.html
   ```

2. **Click "Connect Freighter Wallet"**
   - Freighter popup will appear
   - Click "Connect" or "Approve"
   - Your address will show in the header

3. **You're ready to use the app!** 🎉

---

## Troubleshooting

### Problem 1: "Freighter not found"

**Solution:**
```
1. Make sure Freighter is installed
2. Refresh the page (Ctrl/Cmd + R)
3. Check browser console for errors (F12)
4. Try disabling other crypto extensions temporarily
```

### Problem 2: "Connection declined"

**Solution:**
```
1. Click "Connect Wallet" button again
2. In Freighter popup, click "Connect" or "Approve"
3. Make sure Freighter is unlocked (enter password)
```

### Problem 3: "Wrong Network"

**Solution:**
```
1. Open Freighter extension
2. Click Settings (gear icon)
3. Select "Change Network"
4. Choose "Testnet"
5. Refresh the app page
```

### Problem 4: Connection works but can't create predictions

**Solution:**
```
1. Make sure you have testnet XLM
2. Get free testnet XLM from friendbot:
   curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS"
3. Wait a few seconds for the transaction to confirm
4. Refresh the page and try again
```

### Problem 5: Freighter popup doesn't appear

**Solution:**
```
1. Check if browser is blocking popups
2. Click the Freighter extension icon manually
3. Make sure Freighter is not already connected to another site
4. Clear browser cache and try again
```

---

## Testing Your Connection

### Quick Verification Checklist:

- [ ] Freighter extension installed
- [ ] Wallet created/imported
- [ ] Password set
- [ ] Network set to "Testnet"
- [ ] Test page shows all green checkmarks
- [ ] Address visible in app header
- [ ] No errors in browser console

---

## Using a Development Server (Recommended)

For better functionality, use a local server:

### Option 1: Python
```bash
cd "/Users/arpitjindal/VS Code/Bootcamp 2/TimeLock-Predictions/frontend"
python3 -m http.server 8000
# Then open: http://localhost:8000
```

### Option 2: Node.js
```bash
npx http-server . -p 8000
# Then open: http://localhost:8000
```

### Option 3: VS Code Live Server
```
1. Install "Live Server" extension in VS Code
2. Right-click index.html
3. Select "Open with Live Server"
```

---

## Expected Behavior

### When Everything Works:

1. **On Page Load:**
   - App checks for Freighter
   - Shows "Connect Wallet" button

2. **After Clicking Connect:**
   - Freighter popup appears
   - You approve the connection
   - Your address appears in the header
   - Button changes to "Disconnect"

3. **While Connected:**
   - Can create predictions
   - Can stake on predictions
   - Can view your stats
   - Address stays visible

4. **After Refresh:**
   - App remembers your connection
   - Auto-connects if previously approved
   - No need to connect again

---

## Next Steps After Connecting

1. **Fund Your Account:**
   ```bash
   # Get testnet XLM (you need ~200 XLM to create a prediction)
   curl "https://friendbot.stellar.org?addr=$(freighterApi.getPublicKey())"
   ```

2. **Create a Test Prediction:**
   - Fill in the form
   - Set unlock time (at least 1 hour from now)
   - Choose YES or NO
   - Click "Create Prediction"
   - Approve in Freighter

3. **Monitor on Stellar Expert:**
   - View your transactions
   - Check contract interactions
   - See your XLM balance

---

## Security Best Practices

⚠️ **IMPORTANT:**

1. **Never share your secret key** (24-word phrase)
2. **Only use Testnet** for testing (fake XLM)
3. **Double-check network** before transactions
4. **Bookmark the real Freighter site** (freighter.app)
5. **Be careful with mainnet** (real XLM)

---

## Helpful Resources

- **Freighter Docs:** https://docs.freighter.app/
- **Stellar Expert:** https://stellar.expert/explorer/testnet
- **Friendbot:** https://laboratory.stellar.org/#account-creator?network=test
- **Stellar Docs:** https://developers.stellar.org/docs

---

## Quick Commands Reference

### Get Your Address:
```javascript
// In browser console
freighterApi.getPublicKey().then(console.log)
```

### Check Connection:
```javascript
freighterApi.isConnected().then(console.log)
```

### Get Network:
```javascript
freighterApi.getNetworkDetails().then(console.log)
```

### Fund Testnet Account:
```bash
curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS_HERE"
```

---

## Success! 🎉

If you can:
- ✅ Connect your wallet
- ✅ See your address
- ✅ Have testnet XLM
- ✅ No errors in console

**You're ready to use TimeLock Predictions!**

---

## Need More Help?

1. **Check the test page:** Open `freighter-test.html`
2. **View browser console:** Press F12
3. **Check Freighter logs:** Open Freighter → Settings → View Logs
4. **Read the analysis:** See `ANALYSIS_AND_IMPROVEMENTS.md`

---

**Created:** November 4, 2025  
**Status:** ✅ Ready to Use  
**Network:** Testnet  
