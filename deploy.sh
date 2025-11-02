#!/bin/bash

# TimeLock Predictions - Deployment Script
# Deploys the smart contract to Stellar Soroban Testnet

set -e

echo "🚀 TimeLock Predictions - Deployment Script"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}❌ Error: Stellar CLI not found${NC}"
    echo "Install it with: cargo install --locked soroban-cli --features opt"
    exit 1
fi

echo -e "${GREEN}✅ Stellar CLI found: $(stellar --version)${NC}"
echo ""

# Step 1: Build Contract
echo -e "${BLUE}📦 Step 1: Building contract...${NC}"
cd contract
stellar contract build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Contract built successfully${NC}"
else
    echo -e "${RED}❌ Contract build failed${NC}"
    exit 1
fi
echo ""

# Step 2: Check if admin identity exists
echo -e "${BLUE}🔑 Step 2: Checking admin identity...${NC}"
if stellar keys address admin --network testnet &> /dev/null; then
    echo -e "${GREEN}✅ Admin identity exists${NC}"
    ADMIN_ADDRESS=$(stellar keys address admin)
    echo "Admin address: $ADMIN_ADDRESS"
else
    echo -e "${YELLOW}⚠️  Admin identity not found. Creating...${NC}"
    stellar keys generate admin --network testnet
    ADMIN_ADDRESS=$(stellar keys address admin)
    echo -e "${GREEN}✅ Admin identity created${NC}"
    echo "Admin address: $ADMIN_ADDRESS"
    
    # Fund the account
    echo -e "${BLUE}💰 Funding admin account from friendbot...${NC}"
    curl -s "https://friendbot.stellar.org?addr=$ADMIN_ADDRESS" > /dev/null
    echo -e "${GREEN}✅ Admin account funded${NC}"
fi
echo ""

# Step 3: Deploy Contract
echo -e "${BLUE}🚀 Step 3: Deploying contract to testnet...${NC}"
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/timelock_predictions.wasm \
  --source admin \
  --network testnet 2>&1 | tail -1)

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed successfully${NC}"
echo "Contract ID: $CONTRACT_ID"
echo ""

# Save contract ID
echo "$CONTRACT_ID" > ../CONTRACT_ID.txt
echo -e "${GREEN}✅ Contract ID saved to CONTRACT_ID.txt${NC}"
echo ""

# Step 4: Initialize Contract
echo -e "${BLUE}⚙️  Step 4: Initializing contract...${NC}"
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN_ADDRESS

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Contract initialized successfully${NC}"
else
    echo -e "${RED}❌ Contract initialization failed${NC}"
    exit 1
fi
echo ""

# Step 5: Verify Deployment
echo -e "${BLUE}🔍 Step 5: Verifying deployment...${NC}"
PREDICTION_COUNT=$(stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network testnet \
  -- get_prediction_count 2>&1 | tail -1)

if [ "$PREDICTION_COUNT" == "0" ]; then
    echo -e "${GREEN}✅ Contract is working! Prediction count: $PREDICTION_COUNT${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected prediction count: $PREDICTION_COUNT${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          🎉 DEPLOYMENT SUCCESSFUL!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Contract Details:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "📄 Contract ID: ${YELLOW}$CONTRACT_ID${NC}"
echo -e "🔑 Admin Address: ${YELLOW}$ADMIN_ADDRESS${NC}"
echo -e "🌐 Network: ${YELLOW}Testnet${NC}"
echo -e "🔗 RPC: ${YELLOW}https://soroban-testnet.stellar.org${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Save the Contract ID: $CONTRACT_ID"
echo "2. Create predictions using the CLI"
echo "3. Test staking functionality"
echo "4. Build the frontend and connect to this contract"
echo ""
echo -e "${BLUE}Example Command:${NC}"
echo "stellar contract invoke \\"
echo "  --id $CONTRACT_ID \\"
echo "  --source admin \\"
echo "  --network testnet \\"
echo "  -- create_prediction \\"
echo "  --creator $ADMIN_ADDRESS \\"
echo "  --question \"Will Bitcoin hit \\$100k by 2025?\" \\"
echo "  --unlock_time \$(date -v+1d +%s) \\"
echo "  --initial_choice true \\"
echo "  --token <NATIVE_TOKEN_ADDRESS>"
echo ""
echo -e "${GREEN}🎊 Happy Predicting!${NC}"
