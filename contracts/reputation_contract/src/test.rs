#![cfg(test)]
use super::*;
use shared_types::ReputationEventType;
use soroban_sdk::testutils::Address as _;

fn setup() -> (Env, Address, Address, ReputationContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let pool_contract = Address::generate(&env);
    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);
    client.initialize(&admin);
    client.add_authorized_caller(&admin, &pool_contract);
    (env, admin, pool_contract, client)
}

#[test]
fn test_record_event_clean_cycle_increments_score() {
    let (env, _admin, pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    for cycle in 0..3u32 {
        client.record_event(&pool_contract, &vendor, &1u32, &cycle, &ReputationEventType::CycleCompleted);
    }
    let score = client.get_score(&vendor);
    assert_eq!(score.clean_cycles, 3);
    assert_eq!(score.score, 30);
}

#[test]
fn test_record_event_missed_reduces_score_but_not_below_zero() {
    let (env, _admin, pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    client.record_event(&pool_contract, &vendor, &1u32, &0u32, &ReputationEventType::CycleCompleted);
    for cycle in 1..5u32 {
        client.record_event(&pool_contract, &vendor, &1u32, &cycle, &ReputationEventType::Defaulted);
    }
    let score = client.get_score(&vendor);
    assert_eq!(score.clean_cycles, 1);
    assert_eq!(score.missed_count, 4);
    // raw = 1*10 - 4*15 = 10 - 60 = -50 -> floored at 0
    assert_eq!(score.score, 0);
}

#[test]
#[should_panic(expected = "Caller not authorized")]
fn test_record_event_rejects_unauthorized_caller() {
    let (env, _admin, _pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    let random_caller = Address::generate(&env);
    client.record_event(&random_caller, &vendor, &1u32, &0u32, &ReputationEventType::CycleCompleted);
}

#[test]
fn test_badge_bronze_minted_at_five_clean_cycles() {
    let (env, _admin, pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    for cycle in 0..5u32 {
        client.record_event(&pool_contract, &vendor, &1u32, &cycle, &ReputationEventType::CycleCompleted);
    }
    let badges = client.get_badges(&vendor);
    assert_eq!(badges.len(), 1);
    assert_eq!(badges.get(0).unwrap(), BadgeType::Bronze);
}

#[test]
fn test_badge_silver_and_gold_thresholds() {
    let (env, _admin, pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    for cycle in 0..20u32 {
        client.record_event(&pool_contract, &vendor, &1u32, &cycle, &ReputationEventType::CycleCompleted);
    }
    let badges = client.get_badges(&vendor);
    assert_eq!(badges.len(), 3);
    assert_eq!(badges.get(0).unwrap(), BadgeType::Bronze);
    assert_eq!(badges.get(1).unwrap(), BadgeType::Silver);
    assert_eq!(badges.get(2).unwrap(), BadgeType::Gold);
}

#[test]
fn test_mint_badge_idempotent_double_call() {
    let (env, _admin, pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    for cycle in 0..5u32 {
        client.record_event(&pool_contract, &vendor, &1u32, &cycle, &ReputationEventType::CycleCompleted);
    }
    // Already auto-minted by record_event; explicit re-call must be a no-op.
    let minted_again = client.mint_badge(&vendor, &BadgeType::Bronze);
    assert_eq!(minted_again, false);
    let badges = client.get_badges(&vendor);
    assert_eq!(badges.len(), 1);
}

#[test]
#[should_panic(expected = "does not yet qualify")]
fn test_mint_badge_rejects_when_not_yet_eligible() {
    let (env, _admin, _pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    client.mint_badge(&vendor, &BadgeType::Gold);
}

#[test]
fn test_get_score_for_unknown_vendor_returns_default() {
    let (env, _admin, _pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    let score = client.get_score(&vendor);
    assert_eq!(score.total_events, 0);
    assert_eq!(score.score, 0);
}

#[test]
fn test_get_badges_empty_for_new_vendor() {
    let (env, _admin, _pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    let badges = client.get_badges(&vendor);
    assert_eq!(badges.len(), 0);
}

#[test]
fn test_event_log_append_only_ordering() {
    let (env, _admin, pool_contract, client) = setup();
    let vendor = Address::generate(&env);
    client.record_event(&pool_contract, &vendor, &1u32, &0u32, &ReputationEventType::CycleCompleted);
    client.record_event(&pool_contract, &vendor, &1u32, &1u32, &ReputationEventType::Defaulted);
    client.record_event(&pool_contract, &vendor, &1u32, &2u32, &ReputationEventType::Adjusted);

    assert_eq!(client.get_event_count(&vendor), 3);
    assert_eq!(client.get_event(&vendor, &0).event_type, ReputationEventType::CycleCompleted);
    assert_eq!(client.get_event(&vendor, &1).event_type, ReputationEventType::Defaulted);
    assert_eq!(client.get_event(&vendor, &2).event_type, ReputationEventType::Adjusted);
}
