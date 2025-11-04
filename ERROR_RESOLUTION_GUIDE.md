# 🚨 Contract Error Resolution

## Error: `HostError: Error(WasmVm, InvalidAction)`

### **What This Means:**
This error occurs when the Stellar smart contract rejects the transaction for various reasons:

1. ✅ **Contract IS initialized** (we confirmed this - there are 2 predictions already)
2. ❌ **Your transaction is being rejected** by the contract's validation logic

### **Common Causes:**

#### **1. Not Enough XLM in Your Account**
- Creating a prediction costs **150 XLM** (50 fee + 100 stake)
- Staking requires minimum **100 XLM**
- Plus transaction fees (~0.00001 XLM)

**Solution**: Check your balance and fund your account:
```bash
# Check balance
stellar keys address wallet

# Fund with testnet XLM (gives you 10,000 XLM)
curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"
```

#### **2. Missing Wallet Identity Setup**
The error `Address cannot be used to sign` means you're using a public key instead of a wallet identity.

**Solution**: Add your wallet to CLI:
```bash
# Get your secret key from Freighter (Settings → Export)
stellar keys add wallet --secret-key SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Verify it worked
stellar keys address wallet
# Should output: GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ
```

#### **3. Token Address Issues**
The contract requires the native XLM token address.

**Token ID**: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

#### **4. Unlock Time Too Soon**
The contract requires unlock time to be **at least 1 hour in the future**.

**Check your timestamp**:
```bash
# Current timestamp (in seconds)
date +%s

# Your unlock time should be: current + 3600 (1 hour) or more
```

---

## 🔧 Step-by-Step Fix

### **Step 1: Setup Wallet Identity**

```bash
# Add your wallet (use your actual secret key from Freighter)
stellar keys add wallet --secret-key YOUR_SECRET_KEY_HERE

# Verify
stellar keys address wallet
```

### **Step 2: Fund Your Wallet**

```bash
# Get 10,000 testnet XLM
curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"
```

### **Step 3: Try Creating Prediction Again**

```bash
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source wallet \
  --network testnet \
  -- create_prediction \
  --creator $(stellar keys address wallet) \
  --question "Will Bitcoin hit $100k by 2025?" \
  --unlock_time $(($(date +%s) + 86400)) \
  --initial_choice true \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

Note the `$(($(date +%s) + 86400))` which sets unlock time to 24 hours from now.

---

## 🎯 Working Example

Here's a complete working example:

```bash
# 1. Setup (if not done)
stellar keys add wallet --secret-key SXXXXXXXXXXXXXXX
curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"

# 2. Calculate unlock time (24 hours from now)
UNLOCK_TIME=$(($(date +%s) + 86400))
echo "Unlock time: $UNLOCK_TIME"

# 3. Create prediction
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source wallet \
  --network testnet \
  -- create_prediction \
  --creator $(stellar keys address wallet) \
  --question "Will Bitcoin reach $100k in 2025?" \
  --unlock_time $UNLOCK_TIME \
  --initial_choice true \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# If it works, you'll see:
# ✅ Transaction successful
# 🎉 150 XLM deducted from your wallet
```

---

## 📊 Verify Contract State

Check if contract is working:

```bash
# Get total predictions
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source-account $(stellar keys address wallet) \
  --network testnet \
  -- get_prediction_count
# Output: 2 (means contract IS working)

# Get existing prediction
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source-account $(stellar keys address wallet) \
  --network testnet \
  -- get_prediction --prediction_id 1
# Shows prediction details
```

---

## 🔍 Debug Your Transaction

### **Check Account Balance:**
```bash
# Using Stellar CLI
stellar account show $(stellar keys address wallet) --network testnet

# Or using curl
curl "https://horizon-testnet.stellar.org/accounts/$(stellar keys address wallet)"
```

### **Verify Token Address:**
The native XLM token on testnet should be:
```
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

### **Check Unlock Time:**
```bash
# Current time
date +%s
# Output example: 1730698080

# Minimum valid unlock time (1 hour from now)
echo $(($(date +%s) + 3600))
# Output example: 1730701680

# Use a time GREATER than minimum
```

---

## ⚠️ Common Mistakes

### ❌ **Using Public Key as Source**
```bash
--source GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ  # Wrong!
```

### ✅ **Using Wallet Identity**
```bash
--source wallet  # Correct!
```

### ❌ **Unlock Time in Past or Too Soon**
```bash
--unlock_time 1730698080  # Might be too soon or in past!
```

### ✅ **Unlock Time in Future**
```bash
--unlock_time $(($(date +%s) + 86400))  # 24 hours from now - Correct!
```

### ❌ **Not Enough XLM**
Account needs at least 150 XLM + fees

### ✅ **Funded Account**
```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"
# Gives you 10,000 XLM on testnet
```

---

## 🚀 Quick Test

Run this to test everything:

```bash
# Quick test script
echo "Testing TimeLock Predictions..."

# Check if wallet exists
if stellar keys address wallet 2>/dev/null; then
    echo "✅ Wallet identity exists"
else
    echo "❌ Wallet identity not found - run: stellar keys add wallet --secret-key YOUR_KEY"
    exit 1
fi

# Get prediction count
COUNT=$(stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source-account $(stellar keys address wallet) \
  --network testnet \
  -- get_prediction_count 2>&1 | grep -o '[0-9]*')

echo "✅ Contract has $COUNT predictions"

echo "All systems ready! 🎉"
```

---

## 📞 Still Having Issues?

If you're still getting the error after:
1. ✅ Adding wallet identity (`stellar keys add wallet`)
2. ✅ Funding account (friendbot)
3. ✅ Using correct unlock time (future timestamp)
4. ✅ Using `--source wallet` (not public key)

Then the issue might be:
- Wrong network (make sure `--network testnet`)
- Contract-specific validation (check contract code in `lib.rs`)
- Question too short (<10 chars) or too long (>200 chars)

Check the contract requirements in the original `lib.rs` file!

---

**Need the exact command that will work?** Run this:

```bash
stellar contract invoke \
  --id CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD \
  --source wallet \
  --network testnet \
  -- create_prediction \
  --creator $(stellar keys address wallet) \
  --question "Will Bitcoin reach $100k in 2025?" \
  --unlock_time $(($(date +%s) + 86400)) \
  --initial_choice true \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

This should work if you've completed steps 1 and 2! 🚀
