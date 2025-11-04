# 🚀 Quick Start - Connect Freighter to TimeLock Predictions

## ✅ You're All Set!

I've opened the **Freighter Wallet Test Page** in your browser at:
**http://localhost:8080/freighter-test.html**

---

## 📋 Step-by-Step Instructions

### Step 1: Install Freighter (if you haven't already)

1. **Download:** Go to https://www.freighter.app/
2. **Install:** Add to your browser (Chrome/Firefox/Edge/Brave)
3. **Setup:** Create new wallet or import existing one
4. **Network:** Switch to **Testnet** (Settings → Change Network → Testnet)

### Step 2: Get Testnet XLM

You need testnet XLM to use the app. Get some free testnet XLM:

**Option 1 - Friendbot (Command Line):**
```bash
# Replace YOUR_ADDRESS with your Freighter address
curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS"
```

**Option 2 - Laboratory (Web):**
1. Go to: https://laboratory.stellar.org/#account-creator?network=test
2. Paste your address
3. Click "Get test network lumens"

### Step 3: Test Your Connection

**The test page should now be open in your browser!**

Follow the 4 steps on the test page:

1. ✅ **Check Installation** - Click to verify Freighter is installed
2. ✅ **Connect Wallet** - Click and approve in Freighter popup
3. ✅ **View Address** - Your wallet address will display
4. ✅ **Check Network** - Verify you're on Testnet

**If all steps pass with green checkmarks:** You're ready! 🎉

### Step 4: Use the Main App

Once testing is successful, open the main app:

**In your browser, go to:**
```
http://localhost:8080/index.html
```

Or click the link at the bottom of the test page!

---

## 🔗 Quick Links

| Page | URL |
|------|-----|
| **Test Page** | http://localhost:8080/freighter-test.html |
| **Main App** | http://localhost:8080/index.html |
| **Get Testnet XLM** | https://laboratory.stellar.org/#account-creator?network=test |
| **Live Contract** | https://stellar.expert/explorer/testnet/contract/CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD |

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Freighter not found"
**Solution:**
- Make sure Freighter extension is installed
- Refresh the page (Ctrl/Cmd + R)
- Check if Freighter is enabled in your browser extensions

### Issue 2: "Connection declined"
**Solution:**
- Click "Connect Wallet" again
- When Freighter popup appears, click "Connect" or "Approve"
- Make sure Freighter is unlocked (enter your password)

### Issue 3: Wrong network
**Solution:**
1. Click Freighter extension icon
2. Click Settings (gear icon)
3. Select "Change Network"
4. Choose **"Testnet"**
5. Refresh the page

### Issue 4: No testnet XLM
**Solution:**
```bash
# Get free testnet XLM (replace YOUR_ADDRESS)
curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS"
```

---

## 🎯 What You Can Do After Connecting

### Create a Prediction:
1. Connect your wallet
2. Fill out the prediction form
3. Set unlock time (at least 1 hour from now)
4. Choose YES or NO
5. Click "Create Prediction" (costs 150 XLM: 50 fee + 100 stake)
6. Approve in Freighter

### Stake on a Prediction:
1. View existing predictions
2. Click "Stake YES" or "Stake NO"
3. Enter amount (minimum 100 XLM)
4. Approve in Freighter

### View Your Activity:
- Check your balance in Freighter
- View transactions on Stellar Expert
- See your predictions in the app

---

## 🔒 Security Reminders

⚠️ **IMPORTANT:**
- This is **TESTNET** (fake money, safe to test)
- Never share your **secret key** or **24-word phrase**
- Always verify you're on **Testnet** before transactions
- Bookmark official sites only

---

## 📊 Server Status

✅ **Local server is running on port 8080**

To stop the server:
- Press `Ctrl + C` in the terminal

To restart the server:
```bash
cd "/Users/arpitjindal/VS Code/Bootcamp 2/TimeLock-Predictions/frontend"
python3 -m http.server 8080
```

---

## 🆘 Need Help?

1. **Read the full guide:** `FREIGHTER_WALLET_GUIDE.md`
2. **Check browser console:** Press F12 to see errors
3. **View Freighter logs:** Freighter → Settings → View Logs
4. **Test page not working:** Try refreshing or opening in incognito mode

---

## ✅ Success Checklist

Before using the main app, make sure:

- [ ] Freighter extension installed
- [ ] Wallet created/imported
- [ ] Network set to Testnet
- [ ] Test page shows all green checkmarks
- [ ] Have testnet XLM in your wallet
- [ ] Address visible when connected
- [ ] No errors in browser console

---

## 🎉 You're Ready!

If everything works on the test page, you can now:

1. **Close the test page**
2. **Open the main app:** http://localhost:8080/index.html
3. **Click "Connect Freighter Wallet"**
4. **Start creating predictions!**

---

**Server:** http://localhost:8080  
**Test Page:** http://localhost:8080/freighter-test.html  
**Main App:** http://localhost:8080/index.html  
**Status:** ✅ Running  

**Created:** November 4, 2025  
**Have fun testing! 🚀**
