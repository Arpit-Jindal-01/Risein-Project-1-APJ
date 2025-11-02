# 🔮 TimeLock Predictions

**Decentralized prediction markets with immutable time-locked commitments on Stellar Soroban**

---

## 🎯 **What is TimeLock Predictions?**

TimeLock Predictions is a blockchain-based prediction market where users stake tokens on future outcomes, but with a unique twist: **answers are permanently locked in time capsules** until the resolution date.

Unlike traditional prediction markets where users can change their minds, TimeLock creates immutable commitments. Users can't chicken out, can't change positions, and can't manipulate outcomes.

---

## ✨ **Key Features**

- ✅ **Immutable Commitments** - Once staked, answers are locked on-chain forever
- ✅ **Time-Locked** - Enforced by Stellar smart contracts
- ✅ **Proportional Payouts** - Stake more, win more
- ✅ **Anti-Spam** - Creation fee + initial stake requirement
- ✅ **Transparent Revenue** - 5% platform fee, 70% creation fee to treasury
- ✅ **Fully Tested** - 10/10 comprehensive unit tests passing

---

## 🔧 **Tech Stack**

| Component | Technology |
|-----------|------------|
| **Blockchain** | Stellar Soroban (Testnet) |
| **Smart Contract** | Rust |
| **CLI Tool** | Stellar CLI v23.1.4 |
| **Token** | XLM (Stellar Lumens) |
| **Network** | Testnet |
| **RPC URL** | https://soroban-testnet.stellar.org |
| **Horizon URL** | https://horizon-testnet.stellar.org |

---

## 📦 **Smart Contract Functions**

### **Core Functions:**

```rust
// Initialize contract
initialize(admin: Address)

// Create new prediction
create_prediction(
    creator: Address,
    question: String,
    unlock_time: u64,
    initial_choice: bool,
    token: Address
) -> u64

// Stake on prediction
stake(
    prediction_id: u64,
    user: Address,
    choice: bool,
    amount: i128,
    token: Address
)

// Resolve prediction (admin only)
resolve(
    admin: Address,
    prediction_id: u64,
    winner_choice: bool
)

// Claim winnings
claim(
    prediction_id: u64,
    user: Address,
    token: Address
) -> i128
```

### **Query Functions:**

```rust
get_prediction(prediction_id: u64) -> Prediction
get_stake(prediction_id: u64, user: Address) -> Option<Stake>
get_prediction_count() -> u64
get_treasury() -> i128
```

### **Admin Functions:**

```rust
withdraw_treasury(admin: Address, amount: i128, token: Address)
```

---

## 🚀 **How It Works**

### **1. Create Prediction**

```
User → Pays 50 XLM creation fee + 100 XLM initial stake
     → Chooses YES or NO
     → Sets unlock time (must be 1+ hour in future)
     → Question stored on-chain
```

### **2. Others Stake**

```
Users → Choose YES or NO
      → Lock minimum 100 XLM
      → Can't change answer once locked
      → Tokens go into prize pool
```

### **3. Time Lock**

```
⏳ Prediction sealed until unlock time
❌ Cannot withdraw
❌ Cannot change answer
❌ Cannot resolve early
```

### **4. Resolution**

```
After unlock time → Admin picks winner (YES/NO)
                 → Smart contract calculates payouts
                 → 5% platform fee deducted
                 → 95% distributed to winners proportionally
```

### **5. Claim Winnings**

```
Winners → Call claim() function
       → Receive proportional share
       → Formula: (your_stake / winning_pool) × prize_pool
```

---

## 💰 **Economics**

### **Creation Fee: 50 XLM**
- 70% (35 XLM) → Platform treasury
- 30% (15 XLM) → Burned (deflationary)

### **Platform Fee: 5% of prize pool**
- Deducted on resolution
- Goes to platform treasury
- Industry standard rate

### **Minimum Stake: 100 XLM**
- Prevents spam staking
- Ensures meaningful participation
- Required for prediction creators

---

## 🏗️ **Installation & Setup**

### **Prerequisites:**

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Stellar CLI
cargo install --locked soroban-cli --features opt

# Verify installation
stellar --version
```

### **Build Contract:**

```bash
cd contract
stellar contract build
```

### **Run Tests:**

```bash
cargo test
```

---

## 📝 **Deployment**

### **1. Configure Identity**

```bash
stellar keys generate admin --network testnet
stellar keys address admin
```

### **2. Fund Account (Friendbot)**

```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address admin)"
```

### **3. Deploy Contract**

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/timelock_predictions.wasm \
  --source admin \
  --network testnet
```

### **4. Initialize Contract**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $(stellar keys address admin)
```

---

## 🧪 **Testing**

### **All Tests Passing ✅**

```
running 10 tests
test test::test_initialize ... ok
test test::test_double_initialize - should panic ... ok
test test::test_create_prediction ... ok
test test::test_create_prediction_invalid_time - should panic ... ok
test test::test_create_prediction_short_question - should panic ... ok
test test::test_stake ... ok
test test::test_double_stake - should panic ... ok
test test::test_resolve_and_claim ... ok
test test::test_resolve_too_early - should panic ... ok
test test::test_claim_loser - should panic ... ok

test result: ok. 10 passed; 0 failed
```

### **Test Coverage:**

- ✅ Contract initialization
- ✅ Prediction creation (valid & invalid)
- ✅ Staking mechanism
- ✅ Double-staking prevention
- ✅ Time lock enforcement
- ✅ Resolution logic
- ✅ Proportional payout calculation
- ✅ Winner/loser validation
- ✅ Edge cases & error handling

---

## 📊 **Contract Constants**

```rust
CREATION_FEE: 50 XLM (50_0000000 stroops)
MIN_STAKE: 100 XLM (100_0000000 stroops)
ONE_HOUR: 3600 seconds
PLATFORM_FEE: 5% of prize pool
TREASURY_SPLIT: 70% to treasury, 30% burned
```

---

## 🎮 **Example Usage**

### **Create Prediction:**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source creator \
  --network testnet \
  -- create_prediction \
  --creator $(stellar keys address creator) \
  --question "Will Bitcoin hit $100k by 2025?" \
  --unlock_time 1735689600 \
  --initial_choice true \
  --token <NATIVE_TOKEN_ADDRESS>
```

### **Stake on Prediction:**

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
  --token <NATIVE_TOKEN_ADDRESS>
```

### **Resolve Prediction:**

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

### **Claim Winnings:**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source winner \
  --network testnet \
  -- claim \
  --prediction_id 1 \
  --user $(stellar keys address winner) \
  --token <NATIVE_TOKEN_ADDRESS>
```

---

## 🔒 **Security Features**

- ✅ **Authorization Checks** - `require_auth()` on all user actions
- ✅ **Admin Validation** - Only admin can resolve predictions
- ✅ **Time Lock Enforcement** - Cannot resolve before unlock_time
- ✅ **Double-Stake Prevention** - One stake per user per prediction
- ✅ **Input Validation** - Question length, minimum stakes, time limits
- ✅ **Overflow Protection** - Safe integer math
- ✅ **Reentrancy Safe** - State updates before external calls

---

## 📈 **Future Enhancements**

### **Phase 2:**
- [ ] Oracle integration (Chainlink) for automatic resolution
- [ ] Community voting for subjective questions
- [ ] Group predictions (friends compete)
- [ ] Reputation system

### **Phase 3:**
- [ ] NFT achievement badges
- [ ] Streak tracking (5-win, 10-win bonuses)
- [ ] Leaderboard (best forecasters)
- [ ] Prediction categories (Finance, Tech, Sports, Culture)

### **Phase 4:**
- [ ] Frontend (React + TypeScript + Vite)
- [ ] Freighter wallet integration
- [ ] Mobile app
- [ ] Push notifications

---

## 🐛 **Known Limitations**

- **Manual Resolution**: Currently requires admin to resolve predictions (oracle integration coming in Phase 2)
- **Testnet Only**: Not audited for mainnet deployment yet
- **Single Token**: Only supports native XLM token currently
- **No Cancellation**: Predictions cannot be cancelled once created (by design)

---

## 📄 **License**

MIT License - See LICENSE file for details

---

## 🤝 **Contributing**

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

---

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/yourusername/timelock-predictions/issues)
- **Stellar Discord**: [Stellar Developers](https://discord.gg/stellardev)
- **Documentation**: [Stellar Docs](https://developers.stellar.org/docs)

---

## ⚠️ **Disclaimer**

This is experimental software. Use at your own risk. Not audited for production use. Test thoroughly before deploying to mainnet.

---

## 🎉 **Built With**

- 💚 Stellar Soroban
- 🦀 Rust
- ⚡ Stellar CLI
- 🧪 Thoroughly Tested

---

**Made with 🔥 for the Stellar ecosystem**
