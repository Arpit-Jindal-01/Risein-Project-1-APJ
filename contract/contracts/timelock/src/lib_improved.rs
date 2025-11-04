#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Vec, symbol_short,
};

// Constants
const CREATION_FEE: i128 = 50_0000000; // 50 XLM (7 decimals)
const MIN_STAKE: i128 = 100_0000000; // 100 XLM
const ONE_HOUR: u64 = 3600; // 1 hour in seconds
const PLATFORM_FEE_PERCENT: i128 = 5; // 5%
const TREASURY_SPLIT: i128 = 70; // 70%

// Data Types
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    PredictionCount,
    Prediction(u64),
    UserStake(u64, Address),
    Treasury,
    TotalBurned,
    Categories,
}

#[derive(Clone, PartialEq)]
#[contracttype]
pub enum PredictionStatus {
    Open,
    Locked,
    Resolved,
    Cancelled,
}

#[derive(Clone, PartialEq)]
#[contracttype]
pub enum Category {
    Finance,
    Technology,
    Sports,
    Politics,
    Entertainment,
    Other,
}

#[derive(Clone)]
#[contracttype]
pub struct Prediction {
    pub id: u64,
    pub creator: Address,
    pub question: String,
    pub unlock_time: u64,
    pub created_at: u64,
    pub yes_pool: i128,
    pub no_pool: i128,
    pub status: PredictionStatus,
    pub winner: Option<bool>,
    pub category: Category,
    pub total_participants: u32,
}

#[derive(Clone)]
#[contracttype]
pub struct Stake {
    pub user: Address,
    pub choice: bool,
    pub amount: i128,
    pub claimed: bool,
    pub staked_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct Stats {
    pub total_predictions: u64,
    pub active_predictions: u64,
    pub resolved_predictions: u64,
    pub total_volume: i128,
    pub treasury_balance: i128,
    pub total_burned: i128,
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
        env.storage().instance().set(&DataKey::TotalBurned, &0i128);
        
        // Emit initialization event
        env.events().publish((symbol_short!("init"), admin.clone()), true);
    }

    /// Create a new prediction with enhanced features
    pub fn create_prediction(
        env: Env,
        creator: Address,
        question: String,
        unlock_time: u64,
        initial_choice: bool,
        token: Address,
        category: Category,
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

        // Update treasury (70% to treasury, 30% burned)
        let treasury_amount = (CREATION_FEE * TREASURY_SPLIT) / 100;
        let burn_amount = CREATION_FEE - treasury_amount;
        
        let current_treasury: i128 = env.storage().instance().get(&DataKey::Treasury).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Treasury, &(current_treasury + treasury_amount));
        
        let current_burned: i128 = env.storage().instance().get(&DataKey::TotalBurned).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalBurned, &(current_burned + burn_amount));

        // Create prediction with enhanced fields
        let prediction = Prediction {
            id: count,
            creator: creator.clone(),
            question: question.clone(),
            unlock_time,
            created_at: current_time,
            yes_pool: if initial_choice { MIN_STAKE } else { 0 },
            no_pool: if !initial_choice { MIN_STAKE } else { 0 },
            status: PredictionStatus::Open,
            winner: None,
            category,
            total_participants: 1,
        };

        // Use persistent storage for long-lived data
        env.storage()
            .persistent()
            .set(&DataKey::Prediction(count), &prediction);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Prediction(count), 100000, 200000);
            
        env.storage()
            .instance()
            .set(&DataKey::PredictionCount, &count);

        // Store creator's stake
        let stake = Stake {
            user: creator.clone(),
            choice: initial_choice,
            amount: MIN_STAKE,
            claimed: false,
            staked_at: current_time,
        };
        env.storage()
            .persistent()
            .set(&DataKey::UserStake(count, stake.user.clone()), &stake);

        // Emit creation event
        env.events().publish(
            (symbol_short!("create"), creator.clone()),
            (count, question, unlock_time)
        );

        count
    }

    /// Stake on a prediction with enhanced validation
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
            .persistent()
            .has(&DataKey::UserStake(prediction_id, user.clone()))
        {
            panic!("User already staked on prediction #{}", prediction_id);
        }

        // Validate amount
        if amount < MIN_STAKE {
            panic!("Minimum stake is 100 XLM ({}), got {}", MIN_STAKE, amount);
        }

        // Get prediction
        let mut prediction: Prediction = env
            .storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect(&format!("Prediction #{} not found", prediction_id));

        // Check status
        if prediction.status != PredictionStatus::Open {
            panic!("Prediction #{} is not open for staking (status: {:?})", prediction_id, prediction.status);
        }

        // Check time
        let current_time = env.ledger().timestamp();
        if current_time >= prediction.unlock_time {
            panic!("Prediction #{} has expired (unlock time: {})", prediction_id, prediction.unlock_time);
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
        prediction.total_participants += 1;

        // Store updated prediction
        env.storage()
            .persistent()
            .set(&DataKey::Prediction(prediction_id), &prediction);

        // Store user stake
        let stake = Stake {
            user: user.clone(),
            choice,
            amount,
            claimed: false,
            staked_at: current_time,
        };
        env.storage()
            .persistent()
            .set(&DataKey::UserStake(prediction_id, user.clone()), &stake);

        // Emit stake event
        env.events().publish(
            (symbol_short!("stake"), user),
            (prediction_id, choice, amount)
        );
    }

    /// Resolve a prediction (admin only) with enhanced checks
    pub fn resolve(env: Env, admin: Address, prediction_id: u64, winner_choice: bool) {
        admin.require_auth();

        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        if admin != stored_admin {
            panic!("Only admin can resolve predictions");
        }

        // Get prediction
        let mut prediction: Prediction = env
            .storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect(&format!("Prediction #{} not found", prediction_id));

        // Check time
        let current_time = env.ledger().timestamp();
        if current_time < prediction.unlock_time {
            panic!("Cannot resolve prediction #{} before unlock time (current: {}, unlock: {})", 
                prediction_id, current_time, prediction.unlock_time);
        }

        // Check status
        if prediction.status != PredictionStatus::Open {
            panic!("Prediction #{} already resolved", prediction_id);
        }

        // Update prediction
        prediction.status = PredictionStatus::Resolved;
        prediction.winner = Some(winner_choice);

        env.storage()
            .persistent()
            .set(&DataKey::Prediction(prediction_id), &prediction);

        // Emit resolution event
        env.events().publish(
            (symbol_short!("resolve"), admin),
            (prediction_id, winner_choice)
        );
    }

    /// Claim winnings with enhanced calculation
    pub fn claim(env: Env, prediction_id: u64, user: Address, token: Address) -> i128 {
        user.require_auth();

        // Get prediction
        let prediction: Prediction = env
            .storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect(&format!("Prediction #{} not found", prediction_id));

        // Check if resolved
        let winner_choice = match prediction.winner {
            Some(w) => w,
            None => panic!("Prediction #{} not resolved yet", prediction_id),
        };

        // Get user stake
        let mut stake: Stake = env
            .storage()
            .persistent()
            .get(&DataKey::UserStake(prediction_id, user.clone()))
            .expect(&format!("No stake found for user in prediction #{}", prediction_id));

        // Check if already claimed
        if stake.claimed {
            panic!("User already claimed winnings from prediction #{}", prediction_id);
        }

        // Check if user won
        if stake.choice != winner_choice {
            panic!("User lost prediction #{} (staked on {}, winner was {})", 
                prediction_id, 
                if stake.choice { "YES" } else { "NO" },
                if winner_choice { "YES" } else { "NO" }
            );
        }

        // Calculate payout with enhanced precision
        let total_pool = prediction.yes_pool + prediction.no_pool;
        let winning_pool = if winner_choice {
            prediction.yes_pool
        } else {
            prediction.no_pool
        };

        // Ensure we have a winning pool (should never be zero if user won)
        if winning_pool == 0 {
            panic!("Invalid winning pool for prediction #{}", prediction_id);
        }

        // Take platform fee (5%)
        let prize_pool = (total_pool * (100 - PLATFORM_FEE_PERCENT)) / 100;
        let platform_fee = total_pool - prize_pool;

        // Update treasury
        let current_treasury: i128 = env.storage().instance().get(&DataKey::Treasury).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Treasury, &(current_treasury + platform_fee));

        // Calculate user's proportional share
        let user_payout = (stake.amount * prize_pool) / winning_pool;

        // Mark as claimed
        stake.claimed = true;
        env.storage()
            .persistent()
            .set(&DataKey::UserStake(prediction_id, user.clone()), &stake);

        // Transfer winnings
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &user, &user_payout);

        // Emit claim event
        env.events().publish(
            (symbol_short!("claim"), user),
            (prediction_id, user_payout)
        );

        user_payout
    }

    /// Cancel a prediction (admin only, edge case)
    pub fn cancel_prediction(env: Env, admin: Address, prediction_id: u64, token: Address) {
        admin.require_auth();

        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        if admin != stored_admin {
            panic!("Only admin can cancel predictions");
        }

        // Get prediction
        let mut prediction: Prediction = env
            .storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect(&format!("Prediction #{} not found", prediction_id));

        // Can only cancel if still open
        if prediction.status != PredictionStatus::Open {
            panic!("Can only cancel open predictions");
        }

        // Can only cancel within 1 hour of creation if only creator staked
        let current_time = env.ledger().timestamp();
        if current_time > prediction.created_at + ONE_HOUR || prediction.total_participants > 1 {
            panic!("Cannot cancel after 1 hour or if others have staked");
        }

        // Mark as cancelled
        prediction.status = PredictionStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Prediction(prediction_id), &prediction);

        // Refund creator
        let refund_amount = CREATION_FEE + MIN_STAKE;
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &prediction.creator, &refund_amount);

        // Emit cancel event
        env.events().publish(
            (symbol_short!("cancel"), admin),
            prediction_id
        );
    }

    /// Get prediction details
    pub fn get_prediction(env: Env, prediction_id: u64) -> Prediction {
        env.storage()
            .persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect(&format!("Prediction #{} not found", prediction_id))
    }

    /// Get user stake
    pub fn get_stake(env: Env, prediction_id: u64, user: Address) -> Option<Stake> {
        env.storage()
            .persistent()
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

    /// Get total burned amount
    pub fn get_total_burned(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalBurned).unwrap_or(0)
    }

    /// Get comprehensive stats
    pub fn get_stats(env: Env) -> Stats {
        let total_predictions = Self::get_prediction_count(env.clone());
        let mut active = 0u64;
        let mut resolved = 0u64;
        let mut total_volume = 0i128;

        // Count active/resolved predictions
        for i in 1..=total_predictions {
            if let Some(pred) = env.storage().persistent().get::<DataKey, Prediction>(&DataKey::Prediction(i)) {
                match pred.status {
                    PredictionStatus::Open => active += 1,
                    PredictionStatus::Resolved => resolved += 1,
                    _ => {}
                }
                total_volume += pred.yes_pool + pred.no_pool;
            }
        }

        Stats {
            total_predictions,
            active_predictions: active,
            resolved_predictions: resolved,
            total_volume,
            treasury_balance: Self::get_treasury(env.clone()),
            total_burned: Self::get_total_burned(env),
        }
    }

    /// Withdraw treasury (admin only)
    pub fn withdraw_treasury(env: Env, admin: Address, amount: i128, token: Address) {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        if admin != stored_admin {
            panic!("Only admin can withdraw treasury");
        }

        let current_treasury: i128 = env.storage().instance().get(&DataKey::Treasury).unwrap_or(0);
        if amount > current_treasury {
            panic!("Insufficient treasury balance (requested: {}, available: {})", amount, current_treasury);
        }

        env.storage()
            .instance()
            .set(&DataKey::Treasury, &(current_treasury - amount));

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &admin, &amount);

        // Emit withdrawal event
        env.events().publish(
            (symbol_short!("withdraw"), admin),
            amount
        );
    }
}
