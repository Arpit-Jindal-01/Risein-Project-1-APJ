# 🛠️ Stellar CLI Setup Guide

## ⚡ Quick Start (3 Steps)

### **Step 1: Add Your Wallet to CLI**

You need to add your wallet's **secret key** to the Stellar CLI so it can sign transactions.

```bash
stellar keys add wallet --secret-key YOUR_SECRET_KEY_HERE
```

**Example:**
```bash
stellar keys add wallet --secret-key SDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> ⚠️ **Important**: Use your **SECRET KEY** (starts with S), NOT your public address (starts with G)

---

### **Step 2: Verify Your Wallet**

Check that your wallet was added correctly:

```bash
stellar keys address wallet
```

This should output your public address (starts with G).

---

### **Step 3: Fund Your Wallet (Testnet Only)**

Get free testnet XLM:

```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"
```

You should see a success message with transaction details.

---

## 🔑 Understanding the Error

### **❌ Wrong Command:**
```bash
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ \  # ❌ This is a PUBLIC KEY
  --network testnet \
  -- create_prediction ...
```

**Error**: `Address cannot be used to sign GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ`

### **✅ Correct Command:**
```bash
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source wallet \  # ✅ This refers to your saved identity
  --network testnet \
  -- create_prediction ...
```

---

## 🎯 How It Works

### **Identity System**

Stellar CLI uses an **identity system** to manage keys securely:

1. **Add Identity**: `stellar keys add wallet --secret-key S...`
   - Stores your secret key securely
   - Gives it a name (e.g., "wallet")

2. **Use Identity**: `--source wallet`
   - CLI automatically signs with the stored secret key
   - No need to paste secret keys in commands

3. **List Identities**: `stellar keys ls`
   - Shows all your saved identities

### **Why Not Use Public Keys?**

- Public keys **cannot sign transactions**
- They can only **receive** funds and be used as addresses
- Secret keys are needed to **authorize** transactions

---

## 📋 Complete Example Workflow

### **1. Setup (One Time)**

```bash
# Add your wallet
stellar keys add wallet --secret-key SDXXXXXXXXXXXXXXXXXXXXXX

# Verify it worked
stellar keys address wallet
# Output: GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ

# Fund with testnet XLM
curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"
```

### **2. Create Prediction**

```bash
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source wallet \
  --network testnet \
  -- create_prediction \
  --creator $(stellar keys address wallet) \
  --question "Will Bitcoin hit $100k by 2025?" \
  --unlock_time 1762276980 \
  --initial_choice true \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

### **3. Stake on Prediction**

```bash
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source wallet \
  --network testnet \
  -- stake \
  --prediction_id 1 \
  --user $(stellar keys address wallet) \
  --choice true \
  --amount 1000000000 \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

---

## 🔐 Security Best Practices

### **✅ DO:**
- Store secret keys in the CLI identity system
- Use identity names in commands (`--source wallet`)
- Keep secret keys private
- Use testnet for learning/testing

### **❌ DON'T:**
- Share your secret key with anyone
- Paste secret keys in commands (use identities instead)
- Use mainnet keys on testnet or vice versa
- Commit secret keys to git

---

## 🆘 Troubleshooting

### **Error: "Address cannot be used to sign"**

**Problem**: You're using a public key (G...) instead of an identity name

**Solution**:
```bash
# Add your wallet first
stellar keys add wallet --secret-key YOUR_SECRET_KEY

# Then use the identity name
--source wallet  # ✅ Correct
--source GXXXXX  # ❌ Wrong
```

### **Error: "identity not found: wallet"**

**Problem**: You haven't added the wallet identity yet

**Solution**:
```bash
stellar keys add wallet --secret-key YOUR_SECRET_KEY
```

### **Error: "account not found"**

**Problem**: Your wallet doesn't have any XLM

**Solution**:
```bash
# Fund your wallet with testnet XLM
curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"
```

### **Error: "contract not found"**

**Problem**: Wrong contract ID or network

**Solution**:
- Verify contract ID: `CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD`
- Ensure you're on testnet: `--network testnet`

---

## 🎓 Learn More

### **Get Your Secret Key**

If you connected with Freighter and don't know your secret key:

1. Open Freighter extension
2. Click Settings ⚙️
3. Click "Show Backup Phrase" or "Export Private Key"
4. Copy your secret key (starts with S)
5. Add to CLI: `stellar keys add wallet --secret-key SXXXXXX`

### **Alternative: Generate New Wallet**

Don't have a wallet? Generate one:

```bash
# Generate new wallet
stellar keys generate my-wallet --network testnet

# Get the address
stellar keys address my-wallet

# Fund it
curl "https://friendbot.stellar.org?addr=$(stellar keys address my-wallet)"
```

### **Check Your Balance**

```bash
# Using stellar CLI
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source wallet \
  --network testnet \
  -- get_prediction_count
```

---

## 📚 Helpful Commands

```bash
# List all identities
stellar keys ls

# Remove an identity
stellar keys rm wallet

# Show public address
stellar keys address wallet

# Generate new identity
stellar keys generate new-wallet --network testnet

# Check Stellar CLI version
stellar --version

# Get help
stellar --help
stellar contract invoke --help
```

---

## ✅ Summary

1. **Add wallet**: `stellar keys add wallet --secret-key SXXXXXX`
2. **Verify**: `stellar keys address wallet`
3. **Fund**: `curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"`
4. **Use**: `--source wallet` in all commands

**The key point**: Always use `--source wallet` (identity name), NOT `--source GXXXXXX` (public address)!

---

**Need Help?** Check the error messages carefully - they usually tell you exactly what's wrong! 🚀
