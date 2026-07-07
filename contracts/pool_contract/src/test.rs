#![cfg(test)]
extern crate std;

use super::*;
use reputation_contract::{ReputationContract, ReputationContractClient};
use shared_types::ReputationEventType;
use soroban_sdk::{testutils::Address as _, token};

const CONTRIBUTION: i128 = 1000;
const CYCLE_SECS: u64 = 86_400;
const MAX_MEMBERS: u32 = 10;

struct TestCtx<'a> {
    env: Env,
    admin: Address,
    vendors: std::vec::Vec<Address>,
    token: Address,
    pool: PoolContractClient<'a>,
    reputation: ReputationContractClient<'a>,
}

fn setup(num_vendors: u32, max_members: u32) -> TestCtx<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let mut vendors = std::vec::Vec::new();
    for _ in 0..num_vendors {
        vendors.push(Address::generate(&env));
    }

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);
    for v in vendors.iter() {
        token_admin_client.mint(v, &1_000_000_000);
    }

    let reputation_id = env.register(ReputationContract, ());
    let reputation = ReputationContractClient::new(&env, &reputation_id);
    reputation.initialize(&admin);

    let pool_id = env.register(PoolContract, ());
    let pool = PoolContractClient::new(&env, &pool_id);
    reputation.add_authorized_caller(&admin, &pool_id);
    pool.initialize(&reputation_id);

    let _ = max_members;
    TestCtx { env, admin, vendors, token: token_address, pool, reputation }
}

fn create_default_pool(ctx: &TestCtx, max_members: u32) -> u32 {
    ctx.pool.create_pool(
        &ctx.admin,
        &String::from_str(&ctx.env, "market-1"),
        &CONTRIBUTION,
        &CYCLE_SECS,
        &max_members,
        &ctx.token,
    )
}

/// Joins `ctx.vendors[0..count]` into `pool_id`, using `ctx.admin` as a
/// stand-in guarantor for every join (vendors start with zero reputation).
fn join_n(ctx: &TestCtx, pool_id: u32, count: usize) {
    for i in 0..count {
        ctx.pool.join_pool(&pool_id, &ctx.vendors[i], &Some(ctx.admin.clone()));
    }
}

fn contribute_all(ctx: &TestCtx, pool_id: u32, count: usize) {
    for i in 0..count {
        ctx.pool.contribute(&pool_id, &ctx.vendors[i], &CONTRIBUTION);
    }
}

#[test]
fn test_create_pool_sets_defaults() {
    let ctx = setup(0, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    let pool = ctx.pool.get_pool(&pool_id);
    assert_eq!(pool.admin, ctx.admin);
    assert_eq!(pool.contribution_amount, CONTRIBUTION);
    assert_eq!(pool.max_members, MAX_MEMBERS);
    assert_eq!(pool.current_cycle, 0);
    assert_eq!(pool.member_count, 0);
    assert_eq!(pool.status, PoolStatus::Forming);
}

#[test]
fn test_join_pool_assigns_sequential_draw_positions() {
    let ctx = setup(3, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 3);

    for i in 0..3usize {
        let member = ctx.pool.get_member(&pool_id, &ctx.vendors[i]);
        assert_eq!(member.draw_position, i as u32);
    }
    let pool = ctx.pool.get_pool(&pool_id);
    assert_eq!(pool.member_count, 3);
    assert_eq!(pool.status, PoolStatus::Active);
}

#[test]
fn test_get_all_members_returns_full_roster_in_draw_order() {
    let ctx = setup(3, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 3);

    let members = ctx.pool.get_all_members(&pool_id);
    assert_eq!(members.len(), 3);
    for i in 0..3usize {
        let m = members.get(i as u32).unwrap();
        assert_eq!(m.address, ctx.vendors[i]);
        assert_eq!(m.draw_position, i as u32);
    }
}

#[test]
#[should_panic(expected = "Guarantor required")]
fn test_join_pool_requires_guarantor_when_no_reputation() {
    let ctx = setup(1, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    ctx.pool.join_pool(&pool_id, &ctx.vendors[0], &None);
}

#[test]
fn test_join_pool_no_guarantor_needed_after_prior_reputation() {
    let ctx = setup(1, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);

    // Simulate the vendor already having reputation history from elsewhere.
    let pool_contract_addr = ctx.pool.address.clone();
    ctx.reputation.record_event(
        &pool_contract_addr,
        &ctx.vendors[0],
        &999u32,
        &0u32,
        &ReputationEventType::CycleCompleted,
    );

    let position = ctx.pool.join_pool(&pool_id, &ctx.vendors[0], &None);
    assert_eq!(position, 0);
}

#[test]
#[should_panic(expected = "Pool is full")]
fn test_join_pool_rejects_when_pool_full() {
    let ctx = setup(3, 2);
    let pool_id = create_default_pool(&ctx, 2);
    join_n(&ctx, pool_id, 2);
    ctx.pool.join_pool(&pool_id, &ctx.vendors[2], &Some(ctx.admin.clone()));
}

#[test]
fn test_contribute_records_paid_status() {
    let ctx = setup(1, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 1);
    ctx.pool.contribute(&pool_id, &ctx.vendors[0], &CONTRIBUTION);

    let contribution = ctx.pool.get_contribution(&pool_id, &0u32, &ctx.vendors[0]).unwrap();
    assert_eq!(contribution.status, ContributionStatus::Paid);
    assert_eq!(contribution.amount, CONTRIBUTION);
}

#[test]
#[should_panic(expected = "Amount must equal")]
fn test_contribute_wrong_amount_rejected() {
    let ctx = setup(1, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 1);
    ctx.pool.contribute(&pool_id, &ctx.vendors[0], &(CONTRIBUTION - 1));
}

#[test]
#[should_panic(expected = "Already contributed")]
fn test_contribute_twice_same_cycle_rejected() {
    let ctx = setup(1, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 1);
    ctx.pool.contribute(&pool_id, &ctx.vendors[0], &CONTRIBUTION);
    ctx.pool.contribute(&pool_id, &ctx.vendors[0], &CONTRIBUTION);
}

#[test]
fn test_draw_order_correctness_full_rotation() {
    let ctx = setup(4, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 4);

    for round in 0..4u32 {
        contribute_all(&ctx, pool_id, 4);
        let expected_recipient = ctx.vendors[round as usize].clone();
        let balance_before = token::Client::new(&ctx.env, &ctx.token).balance(&expected_recipient);

        ctx.pool.request_draw(&pool_id, &expected_recipient);

        let balance_after = token::Client::new(&ctx.env, &ctx.token).balance(&expected_recipient);
        assert_eq!(balance_after - balance_before, CONTRIBUTION * 4);

        let pool = ctx.pool.get_pool(&pool_id);
        assert_eq!(pool.current_cycle, round + 1);
    }

    // Rotation wrapped back to position 0 and reset for a new round.
    let pool = ctx.pool.get_pool(&pool_id);
    assert_eq!(pool.current_cycle, 4);
}

#[test]
#[should_panic(expected = "Not this member's turn")]
fn test_draw_out_of_order_rejected() {
    let ctx = setup(3, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 3);
    contribute_all(&ctx, pool_id, 3);
    ctx.pool.request_draw(&pool_id, &ctx.vendors[1]);
}

#[test]
#[should_panic(expected = "Not this member's turn")]
fn test_double_draw_same_cycle_rejected() {
    // Because `request_draw` advances both `current_cycle` and
    // `NextDrawPosition` atomically in one call, a same-caller replay is
    // always caught by the turn-order check before it can ever reach the
    // `CycleExecuted`/`DrawPositionExecuted` guards -- those two remain
    // defense-in-depth for scenarios outside the public API (e.g. storage
    // corruption), not independently triggerable through normal calls.
    let ctx = setup(2, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 2);
    contribute_all(&ctx, pool_id, 2);
    ctx.pool.request_draw(&pool_id, &ctx.vendors[0]);
    ctx.pool.request_draw(&pool_id, &ctx.vendors[0]);
}

#[test]
#[should_panic(expected = "Cannot overwrite a paid contribution")]
fn test_mark_missed_contribution_rejects_overwriting_paid() {
    let ctx = setup(1, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 1);
    ctx.pool.contribute(&pool_id, &ctx.vendors[0], &CONTRIBUTION);
    ctx.pool.mark_missed_contribution(&pool_id, &ctx.admin, &ctx.vendors[0], &0u32);
}

#[test]
fn test_mark_adjusted_contribution_overwrites_status() {
    let ctx = setup(1, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 1);
    ctx.pool.mark_missed_contribution(&pool_id, &ctx.admin, &ctx.vendors[0], &0u32);
    ctx.pool.mark_adjusted_contribution(&pool_id, &ctx.admin, &ctx.vendors[0], &0u32, &(CONTRIBUTION / 2));

    let contribution = ctx.pool.get_contribution(&pool_id, &0u32, &ctx.vendors[0]).unwrap();
    assert_eq!(contribution.status, ContributionStatus::Adjusted);
    assert_eq!(contribution.amount, CONTRIBUTION / 2);
}

#[test]
fn test_emergency_draw_request_auto_approves_requester() {
    let ctx = setup(2, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 2);
    let draw_id = ctx.pool.request_emergency_draw(
        &pool_id,
        &ctx.vendors[0],
        &String::from_str(&ctx.env, "medical emergency"),
    );
    let vote = ctx.pool.get_emergency_vote_info(&pool_id, &draw_id);
    assert_eq!(vote.approvals.len(), 1);
    assert_eq!(vote.approvals.get(0).unwrap(), ctx.vendors[0]);
}

#[test]
#[should_panic(expected = "already pending")]
fn test_emergency_draw_second_request_rejected_while_pending() {
    let ctx = setup(2, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 2);
    ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[0], &String::from_str(&ctx.env, "reason"));
    ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[1], &String::from_str(&ctx.env, "reason 2"));
}

#[test]
#[should_panic(expected = "Insufficient approvals")]
fn test_emergency_draw_threshold_even_members_exact_half_rejected() {
    let ctx = setup(8, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 8);
    contribute_all(&ctx, pool_id, 8);

    let draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[0], &String::from_str(&ctx.env, "reason"));
    // requester auto-approves (1) + 3 more = 4 total = exactly 50% of 8.
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[1]);
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[2]);
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[3]);

    ctx.pool.execute_draw(&pool_id, &draw_id, &ctx.vendors[0]);
}

#[test]
fn test_emergency_draw_threshold_even_members_majority_passes() {
    let ctx = setup(8, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 8);
    contribute_all(&ctx, pool_id, 8);

    let draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[0], &String::from_str(&ctx.env, "reason"));
    // requester (1) + 4 more = 5 total = required for N=8 (8/2+1=5).
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[1]);
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[2]);
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[3]);
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[4]);

    ctx.pool.execute_draw(&pool_id, &draw_id, &ctx.vendors[0]);
    let vote = ctx.pool.get_emergency_vote_info(&pool_id, &draw_id);
    assert!(vote.executed);
}

#[test]
fn test_emergency_draw_threshold_odd_members() {
    let ctx = setup(7, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 7);
    contribute_all(&ctx, pool_id, 7);

    let draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[0], &String::from_str(&ctx.env, "reason"));
    // requester (1) + 2 more = 3 total, required for N=7 is 7/2+1=4 -> must fail.
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[1]);
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[2]);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        ctx.pool.execute_draw(&pool_id, &draw_id, &ctx.vendors[0]);
    }));
    assert!(result.is_err(), "expected execute_draw to fail with only 3 of 4 required approvals");

    // One more approval reaches the required 4-of-7 and execution now succeeds.
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[3]);
    ctx.pool.execute_draw(&pool_id, &draw_id, &ctx.vendors[0]);
}

#[test]
#[should_panic(expected = "Already voted")]
fn test_emergency_draw_double_vote_rejected() {
    let ctx = setup(3, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 3);
    let draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[0], &String::from_str(&ctx.env, "reason"));
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[1]);
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[1]);
}

#[test]
fn test_cancel_emergency_draw_allows_new_request() {
    let ctx = setup(2, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 2);
    let draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[0], &String::from_str(&ctx.env, "reason"));
    ctx.pool.cancel_emergency_draw(&pool_id, &draw_id, &ctx.admin);

    let new_draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[1], &String::from_str(&ctx.env, "reason 2"));
    assert_ne!(draw_id, new_draw_id);
}

#[test]
fn test_emergency_draw_does_not_consume_rotation_slot() {
    let ctx = setup(3, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 3);

    contribute_all(&ctx, pool_id, 3);
    ctx.pool.request_draw(&pool_id, &ctx.vendors[0]);
    contribute_all(&ctx, pool_id, 3);

    let pool_before = ctx.pool.get_pool(&pool_id);
    assert_eq!(pool_before.current_cycle, 1);

    let draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[1], &String::from_str(&ctx.env, "reason"));
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[2]);
    ctx.pool.execute_draw(&pool_id, &draw_id, &ctx.vendors[1]);

    let pool_after = ctx.pool.get_pool(&pool_id);
    assert_eq!(pool_after.current_cycle, pool_before.current_cycle);
}

#[test]
#[should_panic(expected = "Only the requester or pool admin")]
fn test_only_requester_or_admin_can_execute_passed_vote() {
    let ctx = setup(3, MAX_MEMBERS);
    let pool_id = create_default_pool(&ctx, MAX_MEMBERS);
    join_n(&ctx, pool_id, 3);
    contribute_all(&ctx, pool_id, 3);

    let draw_id = ctx.pool.request_emergency_draw(&pool_id, &ctx.vendors[0], &String::from_str(&ctx.env, "reason"));
    ctx.pool.approve_emergency_draw(&pool_id, &draw_id, &ctx.vendors[1]);
    ctx.pool.execute_draw(&pool_id, &draw_id, &ctx.vendors[2]);
}
