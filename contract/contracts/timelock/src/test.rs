#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env, String,
};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(env, &contract_address.address()),
        token::StellarAssetClient::new(env, &contract_address.address()),
    )
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);

    client.initialize(&admin);

    assert_eq!(client.get_prediction_count(), 0);
    assert_eq!(client.get_treasury(), 0);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.initialize(&admin); // Should panic
}

#[test]
fn test_create_prediction() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    // Create token
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);

    // Setup contract
    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    // Set ledger time
    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Will Bitcoin hit $100k by 2025?");
    let unlock_time = 1000000 + 7200; // 2 hours from now
    let initial_choice = true; // YES

    let prediction_id = client.create_prediction(
        &creator,
        &question,
        &unlock_time,
        &initial_choice,
        &token.address,
    );

    assert_eq!(prediction_id, 1);
    assert_eq!(client.get_prediction_count(), 1);

    let prediction = client.get_prediction(&prediction_id);
    assert_eq!(prediction.id, 1);
    assert_eq!(prediction.question, question);
    assert_eq!(prediction.yes_pool, MIN_STAKE);
    assert_eq!(prediction.no_pool, 0);
}

#[test]
#[should_panic(expected = "Unlock time must be at least 1 hour in the future")]
fn test_create_prediction_invalid_time() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);

    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Will Bitcoin hit $100k?");
    let unlock_time = 1000000 + 1800; // Only 30 minutes - should fail

    client.create_prediction(&creator, &question, &unlock_time, &true, &token.address);
}

#[test]
#[should_panic(expected = "Question must be 10-200 characters")]
fn test_create_prediction_short_question() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);

    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Too short"); // Only 9 chars
    let unlock_time = 1000000 + 7200;

    client.create_prediction(&creator, &question, &unlock_time, &true, &token.address);
}

#[test]
fn test_stake() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);
    token_admin.mint(&user, &1000_0000000);

    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Will Bitcoin hit $100k by 2025?");
    let unlock_time = 1000000 + 7200;

    let prediction_id = client.create_prediction(
        &creator,
        &question,
        &unlock_time,
        &true,
        &token.address,
    );

    // User stakes on NO
    client.stake(&prediction_id, &user, &false, &200_0000000, &token.address);

    let prediction = client.get_prediction(&prediction_id);
    assert_eq!(prediction.yes_pool, MIN_STAKE);
    assert_eq!(prediction.no_pool, 200_0000000);

    let user_stake = client.get_stake(&prediction_id, &user).unwrap();
    assert_eq!(user_stake.choice, false);
    assert_eq!(user_stake.amount, 200_0000000);
}

#[test]
#[should_panic(expected = "Already staked on this prediction")]
fn test_double_stake() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);
    token_admin.mint(&user, &1000_0000000);

    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Will Bitcoin hit $100k?");
    let unlock_time = 1000000 + 7200;

    let prediction_id = client.create_prediction(
        &creator,
        &question,
        &unlock_time,
        &true,
        &token.address,
    );

    client.stake(&prediction_id, &user, &false, &200_0000000, &token.address);
    client.stake(&prediction_id, &user, &true, &100_0000000, &token.address); // Should panic
}

#[test]
fn test_resolve_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);
    token_admin.mint(&user1, &1000_0000000);
    token_admin.mint(&user2, &1000_0000000);

    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Will Bitcoin hit $100k?");
    let unlock_time = 1000000 + 7200;

    let prediction_id = client.create_prediction(
        &creator,
        &question,
        &unlock_time,
        &true,
        &token.address,
    );

    // user1 stakes on YES, user2 stakes on NO
    client.stake(&prediction_id, &user1, &true, &200_0000000, &token.address);
    client.stake(&prediction_id, &user2, &false, &300_0000000, &token.address);

    // Move time forward past unlock_time
    env.ledger().set(LedgerInfo {
        timestamp: unlock_time + 100,
        protocol_version: 23,
        sequence_number: 20,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Admin resolves: YES wins
    client.resolve(&admin, &prediction_id, &true);

    let prediction = client.get_prediction(&prediction_id);
    assert_eq!(prediction.winner, Some(true));

    // Creator and user1 can claim (both voted YES)
    let creator_payout = client.claim(&prediction_id, &creator, &token.address);
    let user1_payout = client.claim(&prediction_id, &user1, &token.address);

    assert!(creator_payout > 0);
    assert!(user1_payout > 0);

    // Total YES pool = 100 (creator) + 200 (user1) = 300
    // Total pool = 300 (YES) + 300 (NO) = 600
    // After 5% fee = 570
    // Creator gets: (100/300) * 570 = 190
    // User1 gets: (200/300) * 570 = 380
}

#[test]
#[should_panic(expected = "Cannot resolve before unlock time")]
fn test_resolve_too_early() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);

    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Will Bitcoin hit $100k?");
    let unlock_time = 1000000 + 7200;

    let prediction_id = client.create_prediction(
        &creator,
        &question,
        &unlock_time,
        &true,
        &token.address,
    );

    // Try to resolve immediately - should fail
    client.resolve(&admin, &prediction_id, &true);
}

#[test]
#[should_panic(expected = "You lost this prediction")]
fn test_claim_loser() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let loser = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1000_0000000);
    token_admin.mint(&loser, &1000_0000000);

    let contract_id = env.register(TimeLockContract, ());
    let client = TimeLockContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    env.ledger().set(LedgerInfo {
        timestamp: 1000000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    let question = String::from_str(&env, "Will Bitcoin hit $100k?");
    let unlock_time = 1000000 + 7200;

    let prediction_id = client.create_prediction(
        &creator,
        &question,
        &unlock_time,
        &true,
        &token.address,
    );

    client.stake(&prediction_id, &loser, &false, &200_0000000, &token.address);

    env.ledger().set(LedgerInfo {
        timestamp: unlock_time + 100,
        protocol_version: 23,
        sequence_number: 20,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    client.resolve(&admin, &prediction_id, &true); // YES wins

    // Loser voted NO, should panic
    client.claim(&prediction_id, &loser, &token.address);
}
