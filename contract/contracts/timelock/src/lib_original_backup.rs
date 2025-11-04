#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String,
};

// Constants
const CREATION_FEE: i128 = 50_0000000; // 50 XLM (7 decimals)
const MIN_STAKE: i128 = 100_0000000; // 100 XLM
const ONE_HOUR: u64 = 3600; // 1 hour in seconds

// Data Types
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    PredictionCount,
    Prediction(u64),
    UserStake(u64, Address),
    Treasury,
}

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
}

#[derive(Clone)]
#[contracttype]
pub struct Stake {
    pub user: Address,
    pub choice: bool, // true = YES, false = NO
    pub amount: i128,
    pub claimed: bool,
}

#[contract]
pub struct TimeLockContract;

#[contractimpl]
impl TimeLockContract {
    /// Initialize the contract with an admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PredictionCount, &0u64);
        env.storage().instance().set(&DataKey::Treasury, &0i128);
    }

    /// Create a new prediction
    pub fn create_prediction(
        env: Env,
        creator: Address,
        question: String,
        unlock_time: u64,
        initial_choice: bool,
        token: Address,
    ) -> u64 {
        creator.require_auth();

        // Validate inputs
        let current_time = env.ledger().timestamp();
        if unlock_time <= current_time + ONE_HOUR {
            panic!("Unlock time must be at least 1 hour in the future");
        }

        if question.len() < 10 || question.len() > 200 {
            panic!("Question must be 10-200 characters");
        }

        // Get next prediction ID
        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PredictionCount)
            .unwrap_or(0);
        count += 1;

        // Transfer creation fee + initial stake from creator
        let total_payment = CREATION_FEE + MIN_STAKE;
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&creator, &env.current_contract_address(), &total_payment);

        // Update treasury with creation fee (70% to treasury, 30% stays in contract for burning)
        let treasury_amount = (CREATION_FEE * 7) / 10;
        let current_treasury: i128 = env.storage().instance().get(&DataKey::Treasury).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Treasury, &(current_treasury + treasury_amount));

        // Create prediction
        let prediction = Prediction {
            id: count,
            creator: creator.clone(),
            question,
            unlock_time,
            yes_pool: if initial_choice { MIN_STAKE } else { 0 },
            no_pool: if !initial_choice { MIN_STAKE } else { 0 },
            status: PredictionStatus::Open,
            winner: None,
        };

        // Store prediction
        env.storage()
            .instance()
            .set(&DataKey::Prediction(count), &prediction);
        env.storage()
            .instance()
            .set(&DataKey::PredictionCount, &count);

        // Store creator's stake
        let stake = Stake {
            user: creator,
            choice: initial_choice,
            amount: MIN_STAKE,
            claimed: false,
        };
        env.storage()
            .instance()
            .set(&DataKey::UserStake(count, stake.user.clone()), &stake);

        count
    }

    /// Stake on a prediction
    pub fn stake(
        env: Env,
        prediction_id: u64,
        user: Address,
        choice: bool,
        amount: i128,
        token: Address,
    ) {
        user.require_auth();

        // Check if user already staked
        if env
            .storage()
            .instance()
            .has(&DataKey::UserStake(prediction_id, user.clone()))
        {
            panic!("Already staked on this prediction");
        }

        // Validate amount
        if amount < MIN_STAKE {
            panic!("Minimum stake is 100 XLM");
        }

        // Get prediction
        let mut prediction: Prediction = env
            .storage()
            .instance()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found");

        // Check status
        match prediction.status {
            PredictionStatus::Open => {}
            _ => panic!("Prediction is not open for staking"),
        }

        // Check time
        let current_time = env.ledger().timestamp();
        if current_time >= prediction.unlock_time {
            panic!("Prediction has expired");
        }

        // Transfer tokens
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        // Update pools
        if choice {
            prediction.yes_pool += amount;
        } else {
            prediction.no_pool += amount;
        }

        // Store updated prediction
        env.storage()
            .instance()
            .set(&DataKey::Prediction(prediction_id), &prediction);

        // Store user stake
        let stake = Stake {
            user: user.clone(),
            choice,
            amount,
            claimed: false,
        };
        env.storage()
            .instance()
            .set(&DataKey::UserStake(prediction_id, user), &stake);
    }

    /// Resolve a prediction (admin only)
    pub fn resolve(env: Env, admin: Address, prediction_id: u64, winner_choice: bool) {
        admin.require_auth();

        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        if admin != stored_admin {
            panic!("Only admin can resolve");
        }

        // Get prediction
        let mut prediction: Prediction = env
            .storage()
            .instance()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found");

        // Check time
        let current_time = env.ledger().timestamp();
        if current_time < prediction.unlock_time {
            panic!("Cannot resolve before unlock time");
        }

        // Check status
        match prediction.status {
            PredictionStatus::Open => {}
            _ => panic!("Prediction already resolved"),
        }

        // Update prediction
        prediction.status = PredictionStatus::Resolved;
        prediction.winner = Some(winner_choice);

        env.storage()
            .instance()
            .set(&DataKey::Prediction(prediction_id), &prediction);
    }

    /// Claim winnings
    pub fn claim(env: Env, prediction_id: u64, user: Address, token: Address) -> i128 {
        user.require_auth();

        // Get prediction
        let prediction: Prediction = env
            .storage()
            .instance()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found");

        // Check if resolved
        let winner_choice = match prediction.winner {
            Some(w) => w,
            None => panic!("Prediction not resolved yet"),
        };

        // Get user stake
        let mut stake: Stake = env
            .storage()
            .instance()
            .get(&DataKey::UserStake(prediction_id, user.clone()))
            .expect("No stake found");

        // Check if already claimed
        if stake.claimed {
            panic!("Already claimed");
        }

        // Check if user won
        if stake.choice != winner_choice {
            panic!("You lost this prediction");
        }

        // Calculate payout
        let total_pool = prediction.yes_pool + prediction.no_pool;
        let winning_pool = if winner_choice {
            prediction.yes_pool
        } else {
            prediction.no_pool
        };

        // Take 5% platform fee
        let prize_pool = (total_pool * 95) / 100;
        let platform_fee = total_pool - prize_pool;

        // Update treasury
        let current_treasury: i128 = env.storage().instance().get(&DataKey::Treasury).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Treasury, &(current_treasury + platform_fee));

        // Calculate user's share: (user_stake / winning_pool) * prize_pool
        let user_payout = (stake.amount * prize_pool) / winning_pool;

        // Mark as claimed
        stake.claimed = true;
        env.storage()
            .instance()
            .set(&DataKey::UserStake(prediction_id, user.clone()), &stake);

        // Transfer winnings
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &user, &user_payout);

        user_payout
    }

    /// Get prediction details
    pub fn get_prediction(env: Env, prediction_id: u64) -> Prediction {
        env.storage()
            .instance()
            .get(&DataKey::Prediction(prediction_id))
            .expect("Prediction not found")
    }

    /// Get user stake
    pub fn get_stake(env: Env, prediction_id: u64, user: Address) -> Option<Stake> {
        env.storage()
            .instance()
            .get(&DataKey::UserStake(prediction_id, user))
    }

    /// Get total prediction count
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

    /// Withdraw treasury (admin only)
    pub fn withdraw_treasury(env: Env, admin: Address, amount: i128, token: Address) {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        if admin != stored_admin {
            panic!("Only admin can withdraw");
        }

        let current_treasury: i128 = env.storage().instance().get(&DataKey::Treasury).unwrap_or(0);
        if amount > current_treasury {
            panic!("Insufficient treasury balance");
        }

        env.storage()
            .instance()
            .set(&DataKey::Treasury, &(current_treasury - amount));

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &admin, &amount);
    }
}

mod test;
