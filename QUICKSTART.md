# 📝 TimeLock Predictions - Quick Reference

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repo>
cd timelock-predictions/contract

# Build
stellar contract build

# Test
cargo test

# Deploy
./deploy.sh
```

---

## 📋 Common Commands

### **Build Contract**
```bash
cd contract
stellar contract build
```

### **Run Tests**
```bash
cargo test
cargo test -- --nocapture  # With output
```

### **Deploy**
```bash
./deploy.sh
```

---

## 🎮 Contract Interactions

### **1. Initialize Contract**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $(stellar keys address admin)
```

### **2. Create Prediction**

```bash
# Generate unlock time (1 day from now)
UNLOCK_TIME=$(date -v+1d +%s)

stellar contract invoke \
  --id <CONTRACT_ID> \
  --source creator \
  --network testnet \
  -- create_prediction \
  --creator $(stellar keys address creator) \
  --question "Will Bitcoin hit $100k by 2025?" \
  --unlock_time $UNLOCK_TIME \
  --initial_choice true \
  --token <TOKEN_ADDRESS>
```

### **3. Stake on Prediction**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source user \
  --network testnet \
  -- stake \
  --prediction_id 1 \
  --user $(stellar keys address user) \
  --choice false \
  --amount 2000000000 \
  --token <TOKEN_ADDRESS>
```

### **4. Get Prediction Details**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- get_prediction \
  --prediction_id 1
```

### **5. Resolve Prediction**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- resolve \
  --admin $(stellar keys address admin) \
  --prediction_id 1 \
  --winner_choice true
```

### **6. Claim Winnings**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source winner \
  --network testnet \
  -- claim \
  --prediction_id 1 \
  --user $(stellar keys address winner) \
  --token <TOKEN_ADDRESS>
```

---

## 🔑 Identity Management

### **Generate New Identity**
```bash
stellar keys generate alice --network testnet
```

### **Get Address**
```bash
stellar keys address alice
```

### **Fund Account (Testnet)**
```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address alice)"
```

### **List All Identities**
```bash
stellar keys list
```

---

## 💰 Token Amounts

Stellar uses **stroops** (1 XLM = 10,000,000 stroops)

| XLM | Stroops |
|-----|---------|
| 1 XLM | 10000000 |
| 10 XLM | 100000000 |
| 50 XLM | 500000000 |
| 100 XLM | 1000000000 |
| 200 XLM | 2000000000 |

---

## ⏰ Unix Timestamps

### **Generate Timestamps**

```bash
# 1 hour from now
date -v+1H +%s

# 1 day from now
date -v+1d +%s

# 1 week from now
date -v+7d +%s

# Specific date (Dec 31, 2025)
date -j -f "%Y-%m-%d" "2025-12-31" +%s
```

---

## 🧪 Testing Locally

### **Run All Tests**
```bash
cargo test
```

### **Run Specific Test**
```bash
cargo test test_create_prediction
```

### **Run With Output**
```bash
cargo test -- --nocapture
```

### **Watch Tests**
```bash
cargo watch -x test
```

---

## 📊 Query Functions

### **Get Prediction Count**
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  -- get_prediction_count
```

### **Get User Stake**
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  -- get_stake \
  --prediction_id 1 \
  --user $(stellar keys address alice)
```

### **Get Treasury Balance**
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  -- get_treasury
```

---

## 🛠️ Troubleshooting

### **Error: Command not found: stellar**
```bash
cargo install --locked soroban-cli --features opt
```

### **Error: Insufficient funds**
```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address <identity>)"
```

### **Error: Protocol version too old**
Update soroban-sdk in Cargo.toml to latest version

### **Contract not responding**
```bash
# Check if contract is deployed
stellar contract info --id <CONTRACT_ID> --network testnet

# Re-deploy if needed
./deploy.sh
```

---

## 📁 Project Structure

```
timelock-predictions/
├── contract/
│   ├── contracts/
│   │   └── timelock/
│   │       ├── src/
│   │       │   ├── lib.rs      # Main contract
│   │       │   └── test.rs     # Unit tests
│   │       └── Cargo.toml
│   ├── Cargo.toml
│   └── README.md
├── frontend/                    # (Coming soon)
├── deploy.sh                    # Deployment script
├── README.md                    # Main documentation
└── QUICKSTART.md               # This file
```

---

## 🔗 Useful Links

- **Stellar Developers**: https://developers.stellar.org
- **Soroban Docs**: https://soroban.stellar.org
- **Testnet RPC**: https://soroban-testnet.stellar.org
- **Horizon**: https://horizon-testnet.stellar.org
- **Friendbot**: https://friendbot.stellar.org
- **Stellar Laboratory**: https://laboratory.stellar.org

---

## 🎯 Example Workflow

```bash
# 1. Setup
stellar keys generate admin --network testnet
stellar keys generate alice --network testnet
stellar keys generate bob --network testnet

# 2. Fund accounts
curl "https://friendbot.stellar.org?addr=$(stellar keys address admin)"
curl "https://friendbot.stellar.org?addr=$(stellar keys address alice)"
curl "https://friendbot.stellar.org?addr=$(stellar keys address bob)"

# 3. Deploy
./deploy.sh
CONTRACT_ID=<from_deployment_output>

# 4. Create prediction (admin)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network testnet \
  -- create_prediction \
  --creator $(stellar keys address admin) \
  --question "Will BTC hit $100k?" \
  --unlock_time $(date -v+1d +%s) \
  --initial_choice true \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# 5. Alice stakes YES
stellar contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- stake \
  --prediction_id 1 \
  --user $(stellar keys address alice) \
  --choice true \
  --amount 2000000000 \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# 6. Bob stakes NO
stellar contract invoke \
  --id $CONTRACT_ID \
  --source bob \
  --network testnet \
  -- stake \
  --prediction_id 1 \
  --user $(stellar keys address bob) \
  --choice false \
  --amount 3000000000 \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# 7. Wait for unlock time, then resolve (admin)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network testnet \
  -- resolve \
  --admin $(stellar keys address admin) \
  --prediction_id 1 \
  --winner_choice true

# 8. Winners claim (admin + alice won)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network testnet \
  -- claim \
  --prediction_id 1 \
  --user $(stellar keys address admin) \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

stellar contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- claim \
  --prediction_id 1 \
  --user $(stellar keys address alice) \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

---

## ✅ Checklist for Demo

- [ ] Contract builds without errors
- [ ] All 10 tests pass
- [ ] Contract deploys to testnet
- [ ] Can create prediction
- [ ] Can stake on prediction
- [ ] Time lock prevents early resolution
- [ ] Admin can resolve after unlock time
- [ ] Winners can claim payouts
- [ ] Losers cannot claim
- [ ] Treasury accumulates fees

---

## 🎓 Learning Resources

### **Rust**
- https://doc.rust-lang.org/book/
- https://rustlings.cool

### **Soroban**
- https://soroban.stellar.org/docs
- https://github.com/stellar/soroban-examples

### **Stellar**
- https://developers.stellar.org/docs
- https://www.stellar.org/developers

---

**Need help? Check the main README.md or open an issue!**
