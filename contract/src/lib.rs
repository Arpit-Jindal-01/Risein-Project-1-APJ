#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Symbol, Vec,
};

// Constants
const CREATION_FEE: i128 = 50_0000000; // 50 XLM (7 decimals)
const MIN_STAKE: i128 = 100_0000000; // 100 XLM
const PLATFORM_FEE_PERCENT: u32 = 5; // 5%
const TREASURY_SPLIT: u32 = 70; // 70% to treasury, 30% burned

// Data structures
#[derive(Clone)]
#[contracttype]
pub enum PredictionStatus {
    Open,
    Locked,
    Resolved,
}

#[derive(Clone)]
#[contracttype]
pub struct Prediction {
    pub id: u64,
    pub creator: Address,
    pub question: String,
    pub unlock_time: u64,
    pub yes_pool: i128,
    pub no_pool: i128,
    pub status: PredictionStatus,
    pub winner: Option<bool>, // None = not resolved, Some(true) = YES wins, Some(false) = NO wins
    pub total_participants: u32,
}

#[derive(Clone)]
#[contracttype]
pub struct Stake {
    pub user: Address,
    pub prediction_id: u64,
    pub choice: bool, // true = YES, false = NO
    pub amount: i128,
    pub timestamp: u64,
    pub claimed: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Prediction(u64),
    Stake(Address, u64),
    PredictionCount,
    Treasury,
    TotalBurned,
    Admin,
    TokenAddress,
}

#[contract]
pub struct TimeLockContract;

#[contractimpl]
impl TimeLockContract {
    /// Initialize the contract with admin and token address
    pub fn initialize(env: Env, admin: Address, token_address: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenAddress, &token_address);
        env.storage().instance().set(&DataKey::PredictionCount, &0u64);
        env.storage().instance().set(&DataKey::Treasury, &0i128);
        env.storage().instance().set(&DataKey::TotalBurned, &0i128);
    }

    /// Create a new prediction (community-created)
    pub fn create_prediction(
        env: Env,
        creator: Address,
        question: String,
        unlock_time: u64,
        initial_stake: i128,
        choice: bool,
    ) -> u64 {
        creator.require_auth();

        // Validation
        if question.len() < 10 || question.len() > 200 {
            panic!("Question must be 10-200 characters");
        }

        let current_time = env.ledger().timestamp();
        if unlock_time <= current_time {
            panic!("Unlock time must be in the future");
        }

        if unlock_time < current_time + 60 {
            panic!("Minimum 60 seconds from now");
        }

        if initial_stake < MIN_STAKE {
            panic!("Initial stake must be at least 100 XLM");
        }

        // Get token client
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .unwrap();
        let token = token::Client::new(&env, &token_address);

        // Charge creation fee
        let total_fee = CREATION_FEE + initial_stake;
        token.transfer(&creator, &env.current_contract_address(), &total_fee);

        // Split creation fee
        let to_treasury = (CREATION_FEE * TREASURY_SPLIT as i128) / 100;
        let to_burn = CREATION_FEE - to_treasury;

        let mut treasury: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Treasury)
            .unwrap_or(0);
        let mut total_burned: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalBurned)
            .unwrap_or(0);

        treasury += to_treasury;
        total_burned += to_burn;

        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage()
            .instance()
            .set(&DataKey::TotalBurned, &total_burned);

        // Burn tokens (transfer to burn address - all zeros)
        let burn_address = Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"));
        token.transfer(&env.current_contract_address(), &burn_address, &to_burn);

        // Create prediction
        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PredictionCount)
            .unwrap_or(0);
        count += 1;

        let prediction = Prediction {
            id: count,
            creator: creator.clone(),
            question,
            unlock_time,
            yes_pool: if choice { initial_stake } else { 0 },
            no_pool: if !choice { initial_stake } else { 0 },
            status: PredictionStatus::Open,
            winner: None,
            total_participants: 1,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Prediction(count), &prediction);
        env.storage()
            .instance()
            .set(&DataKey::PredictionCount, &count);

        // Record creator's stake
        let stake = Stake {
            user: creator.clone(),
            prediction_id: count,
            choice,
            amount: initial_stake,
            timestamp: current_time,
            claimed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Stake(creator, count), &stake);

        count
    }

    /// Stake on an existing prediction
    pub fn stake(
        env: Env,
        user: Address,
        prediction_id: u64,
        choice: bool,
        amount: i128,
    ) {
        user.require_auth();

        // Validate amount
        if amount < MIN_STAKE {
            panic!("Minimum stake is 100 XLM");
        }

        // Get prediction
        let mut prediction: Prediction = env
            .storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found");

        // Validate status
        match prediction.status {
            PredictionStatus::Open => {}
            _ => panic!("Prediction is not open for staking"),
        }

        // Check if user already staked
        if env
            .storage()
            .persistent()
            .has(&DataKey::Stake(user.clone(), prediction_id))
        {
            panic!("User already staked on this prediction");
        }

        // Check if prediction is still open (not past unlock time)
        let current_time = env.ledger().timestamp();
        if current_time >= prediction.unlock_time {
            panic!("Prediction has already unlocked");
        }

        // Transfer tokens
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .unwrap();
        let token = token::Client::new(&env, &token_address);
        token.transfer(&user, &env.current_contract_address(), &amount);

        // Update pools
        if choice {
            prediction.yes_pool += amount;
        } else {
            prediction.no_pool += amount;
        }
        prediction.total_participants += 1;

        env.storage()
            .persistent()
            .set(&DataKey::Prediction(prediction_id), &prediction);

        // Record stake
        let stake = Stake {
            user: user.clone(),
            prediction_id,
            choice,
            amount,
            timestamp: current_time,
            claimed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Stake(user, prediction_id), &stake);
    }

    /// Resolve a prediction (admin only)
    pub fn resolve(env: Env, caller: Address, prediction_id: u64, winner: bool) {
        caller.require_auth();

        // Check admin
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if caller != admin {
            panic!("Only admin can resolve predictions");
        }

        // Get prediction
        let mut prediction: Prediction = env
            .storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found");

        // Validate status
        match prediction.status {
            PredictionStatus::Open => {}
            _ => panic!("Prediction already resolved"),
        }

        // Check if unlock time has passed
        let current_time = env.ledger().timestamp();
        if current_time < prediction.unlock_time {
            panic!("Cannot resolve before unlock time");
        }

        // Calculate platform fee
        let total_pool = prediction.yes_pool + prediction.no_pool;
        let platform_fee = (total_pool * PLATFORM_FEE_PERCENT as i128) / 100;

        // Add to treasury
        let mut treasury: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Treasury)
            .unwrap_or(0);
        treasury += platform_fee;
        env.storage().instance().set(&DataKey::Treasury, &treasury);

        // Mark as resolved
        prediction.status = PredictionStatus::Resolved;
        prediction.winner = Some(winner);

        env.storage()
            .persistent()
            .set(&DataKey::Prediction(prediction_id), &prediction);
    }

    /// Claim winnings after resolution
    pub fn claim_winnings(env: Env, user: Address, prediction_id: u64) -> i128 {
        user.require_auth();

        // Get stake
        let mut stake: Stake = env
            .storage()
            .persistent()
            .get(&DataKey::Stake(user.clone(), prediction_id))
            .expect("No stake found");

        if stake.claimed {
            panic!("Winnings already claimed");
        }

        // Get prediction
        let prediction: Prediction = env
            .storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found");

        // Check if resolved
        match prediction.status {
            PredictionStatus::Resolved => {}
            _ => panic!("Prediction not yet resolved"),
        }

        let winner = prediction.winner.expect("Winner not set");

        // Check if user won
        if stake.choice != winner {
            panic!("You did not win this prediction");
        }

        // Calculate payout
        let total_pool = prediction.yes_pool + prediction.no_pool;
        let platform_fee = (total_pool * PLATFORM_FEE_PERCENT as i128) / 100;
        let prize_pool = total_pool - platform_fee;

        let winning_pool = if winner {
            prediction.yes_pool
        } else {
            prediction.no_pool
        };

        let payout = (stake.amount * prize_pool) / winning_pool;

        // Mark as claimed
        stake.claimed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Stake(user.clone(), prediction_id), &stake);

        // Transfer winnings
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .unwrap();
        let token = token::Client::new(&env, &token_address);
        token.transfer(&env.current_contract_address(), &user, &payout);

        payout
    }

    /// Get prediction details
    pub fn get_prediction(env: Env, prediction_id: u64) -> Prediction {
        env.storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found")
    }

    /// Get user's stake
    pub fn get_stake(env: Env, user: Address, prediction_id: u64) -> Option<Stake> {
        env.storage()
            .persistent()
            .get(&DataKey::Stake(user, prediction_id))
    }

    /// Get total predictions count
    pub fn get_prediction_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::PredictionCount)
            .unwrap_or(0)
    }

    /// Get treasury balance
    pub fn get_treasury(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Treasury).unwrap_or(0)
    }

    /// Get total burned tokens
    pub fn get_total_burned(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalBurned)
            .unwrap_or(0)
    }

    /// Withdraw treasury (admin only)
    pub fn withdraw_treasury(env: Env, admin: Address, amount: i128) {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Only admin can withdraw");
        }

        let mut treasury: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Treasury)
            .unwrap_or(0);

        if amount > treasury {
            panic!("Insufficient treasury balance");
        }

        treasury -= amount;
        env.storage().instance().set(&DataKey::Treasury, &treasury);

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .unwrap();
        let token = token::Client::new(&env, &token_address);
        token.transfer(&env.current_contract_address(), &admin, &amount);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TimeLockContract);
        let client = TimeLockContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);

        client.initialize(&admin, &token);

        assert_eq!(client.get_prediction_count(), 0);
        assert_eq!(client.get_treasury(), 0);
    }

    #[test]
    fn test_create_prediction() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TimeLockContract);
        let client = TimeLockContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());

        // Initialize
        client.initialize(&admin, &token_id);

        // Create user and mint tokens
        let user = Address::generate(&env);
        let token = token::Client::new(&env, &token_id);
        token.mint(&user, &1000_0000000);

        // Create prediction
        let question = String::from_str(&env, "Will Bitcoin hit $100k by 2025?");
        let unlock_time = env.ledger().timestamp() + 3600; // 1 hour from now
        let initial_stake = 100_0000000;

        let prediction_id = client.create_prediction(
            &user,
            &question,
            &unlock_time,
            &initial_stake,
            &true, // YES
        );

        assert_eq!(prediction_id, 1);

        let prediction = client.get_prediction(&prediction_id);
        assert_eq!(prediction.id, 1);
        assert_eq!(prediction.yes_pool, 100_0000000);
        assert_eq!(prediction.no_pool, 0);
    }

    #[test]
    fn test_stake_on_prediction() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TimeLockContract);
        let client = TimeLockContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());

        client.initialize(&admin, &token_id);

        // Create prediction
        let creator = Address::generate(&env);
        let token = token::Client::new(&env, &token_id);
        token.mint(&creator, &1000_0000000);

        let question = String::from_str(&env, "Will Bitcoin hit $100k?");
        let unlock_time = env.ledger().timestamp() + 3600;

        let prediction_id = client.create_prediction(
            &creator,
            &question,
            &unlock_time,
            &100_0000000,
            &true,
        );

        // Another user stakes
        let user2 = Address::generate(&env);
        token.mint(&user2, &500_0000000);

        client.stake(&user2, &prediction_id, &false, &200_0000000);

        let prediction = client.get_prediction(&prediction_id);
        assert_eq!(prediction.yes_pool, 100_0000000);
        assert_eq!(prediction.no_pool, 200_0000000);
        assert_eq!(prediction.total_participants, 2);
    }

    #[test]
    #[should_panic(expected = "User already staked")]
    fn test_cannot_stake_twice() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TimeLockContract);
        let client = TimeLockContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin);

        client.initialize(&admin, &token_id);

        let creator = Address::generate(&env);
        let token = token::Client::new(&env, &token_id);
        token.mint(&creator, &1000_0000000);

        let question = String::from_str(&env, "Test question?");
        let unlock_time = env.ledger().timestamp() + 3600;

        let prediction_id = client.create_prediction(
            &creator,
            &question,
            &unlock_time,
            &100_0000000,
            &true,
        );

        // Try to stake again - should panic
        client.stake(&creator, &prediction_id, &false, &100_0000000);
    }

    #[test]
    fn test_resolve_and_claim() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TimeLockContract);
        let client = TimeLockContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin);

        client.initialize(&admin, &token_id);

        let token = token::Client::new(&env, &token_id);

        // Create prediction
        let creator = Address::generate(&env);
        token.mint(&creator, &1000_0000000);

        let question = String::from_str(&env, "Will Bitcoin hit $100k?");
        let unlock_time = env.ledger().timestamp() + 100;

        let prediction_id = client.create_prediction(
            &creator,
            &question,
            &unlock_time,
            &100_0000000,
            &true, // YES
        );

        // User stakes on NO
        let user2 = Address::generate(&env);
        token.mint(&user2, &500_0000000);
        client.stake(&user2, &prediction_id, &false, &200_0000000);

        // Fast forward time
        env.ledger().with_mut(|li| {
            li.timestamp = unlock_time + 1;
        });

        // Resolve with YES as winner
        client.resolve(&admin, &prediction_id, &true);

        // Creator claims winnings
        let balance_before = token.balance(&creator);
        let payout = client.claim_winnings(&creator, &prediction_id);

        assert!(payout > 100_0000000); // Should win more than initial stake
        let balance_after = token.balance(&creator);
        assert_eq!(balance_after - balance_before, payout);
    }
}
