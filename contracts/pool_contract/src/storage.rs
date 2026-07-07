use soroban_sdk::{Address, Env};

use crate::types::{Contribution, DataKey, Draw, EmergencyVote, Pool};

/// Ledger math for TTL bumps on persistent entries (~5s/ledger).
const LEDGERS_PER_DAY: u32 = 17_280;
const TTL_THRESHOLD: u32 = LEDGERS_PER_DAY * 30;
const TTL_EXTEND_TO: u32 = LEDGERS_PER_DAY * 120;

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

// ---- Instance-level ----

pub fn next_pool_id(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::NextPoolId)
        .unwrap_or(0)
}

pub fn set_next_pool_id(env: &Env, id: u32) {
    env.storage().instance().set(&DataKey::NextPoolId, &id);
}

pub fn get_reputation_contract(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::ReputationContract)
}

pub fn set_reputation_contract(env: &Env, address: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::ReputationContract, address);
}

// ---- Pool ----

pub fn get_pool(env: &Env, pool_id: u32) -> Pool {
    env.storage()
        .persistent()
        .get(&DataKey::Pool(pool_id))
        .expect("Pool not found")
}

pub fn set_pool(env: &Env, pool_id: u32, pool: &Pool) {
    let key = DataKey::Pool(pool_id);
    env.storage().persistent().set(&key, pool);
    bump_persistent(env, &key);
}

// ---- Members ----

pub fn has_member(env: &Env, pool_id: u32, vendor: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::MemberInfo(pool_id, vendor.clone()))
}

pub fn get_member(env: &Env, pool_id: u32, vendor: &Address) -> crate::types::Member {
    env.storage()
        .persistent()
        .get(&DataKey::MemberInfo(pool_id, vendor.clone()))
        .expect("Member not found")
}

pub fn set_member(env: &Env, pool_id: u32, member: &crate::types::Member) {
    let info_key = DataKey::MemberInfo(pool_id, member.address.clone());
    env.storage().persistent().set(&info_key, member);
    bump_persistent(env, &info_key);

    let pos_key = DataKey::MemberByPosition(pool_id, member.draw_position);
    env.storage().persistent().set(&pos_key, &member.address);
    bump_persistent(env, &pos_key);
}

pub fn get_member_by_position(env: &Env, pool_id: u32, position: u32) -> Address {
    env.storage()
        .persistent()
        .get(&DataKey::MemberByPosition(pool_id, position))
        .expect("No member at this draw position")
}

pub fn next_draw_position(env: &Env, pool_id: u32) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::NextDrawPosition(pool_id))
        .unwrap_or(0)
}

pub fn set_next_draw_position(env: &Env, pool_id: u32, position: u32) {
    let key = DataKey::NextDrawPosition(pool_id);
    env.storage().persistent().set(&key, &position);
    bump_persistent(env, &key);
}

// ---- Draw id counters ----

pub fn next_draw_id(env: &Env, pool_id: u32) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::NextDrawId(pool_id))
        .unwrap_or(0)
}

pub fn set_next_draw_id(env: &Env, pool_id: u32, id: u32) {
    let key = DataKey::NextDrawId(pool_id);
    env.storage().persistent().set(&key, &id);
    bump_persistent(env, &key);
}

pub fn next_emergency_draw_id(env: &Env, pool_id: u32) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::NextEmergencyDrawId(pool_id))
        .unwrap_or(0)
}

pub fn set_next_emergency_draw_id(env: &Env, pool_id: u32, id: u32) {
    let key = DataKey::NextEmergencyDrawId(pool_id);
    env.storage().persistent().set(&key, &id);
    bump_persistent(env, &key);
}

// ---- Contributions ----

pub fn get_contribution(
    env: &Env,
    pool_id: u32,
    cycle: u32,
    member: &Address,
) -> Option<Contribution> {
    env.storage()
        .persistent()
        .get(&DataKey::Contribution(pool_id, cycle, member.clone()))
}

pub fn set_contribution(env: &Env, pool_id: u32, contribution: &Contribution) {
    let key = DataKey::Contribution(pool_id, contribution.cycle, contribution.member.clone());
    env.storage().persistent().set(&key, contribution);
    bump_persistent(env, &key);
}

// ---- Draws ----

pub fn set_draw(env: &Env, pool_id: u32, draw: &Draw) {
    let key = DataKey::Draw(pool_id, draw.id);
    env.storage().persistent().set(&key, draw);
    bump_persistent(env, &key);
}

pub fn is_cycle_executed(env: &Env, pool_id: u32, cycle: u32) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::CycleExecuted(pool_id, cycle))
        .unwrap_or(false)
}

pub fn set_cycle_executed(env: &Env, pool_id: u32, cycle: u32) {
    let key = DataKey::CycleExecuted(pool_id, cycle);
    env.storage().persistent().set(&key, &true);
    bump_persistent(env, &key);
}

pub fn is_draw_position_executed(env: &Env, pool_id: u32, position: u32) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::DrawPositionExecuted(pool_id, position))
        .unwrap_or(false)
}

pub fn set_draw_position_executed(env: &Env, pool_id: u32, position: u32, value: bool) {
    let key = DataKey::DrawPositionExecuted(pool_id, position);
    env.storage().persistent().set(&key, &value);
    bump_persistent(env, &key);
}

/// Called once a full rotation round completes (NextDrawPosition wraps to 0)
/// so every member becomes eligible to draw again next round.
pub fn reset_all_draw_positions_executed(env: &Env, pool_id: u32, member_count: u32) {
    for position in 0..member_count {
        set_draw_position_executed(env, pool_id, position, false);
    }
}

// ---- Emergency votes ----

pub fn get_emergency_vote(env: &Env, pool_id: u32, draw_id: u32) -> EmergencyVote {
    env.storage()
        .persistent()
        .get(&DataKey::EmergencyVote(pool_id, draw_id))
        .expect("Emergency vote not found")
}

pub fn set_emergency_vote(env: &Env, pool_id: u32, vote: &EmergencyVote) {
    let key = DataKey::EmergencyVote(pool_id, vote.draw_id);
    env.storage().persistent().set(&key, vote);
    bump_persistent(env, &key);
}

pub fn is_emergency_vote_approved(
    env: &Env,
    pool_id: u32,
    draw_id: u32,
    voter: &Address,
) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::EmergencyVoteApproved(
            pool_id,
            draw_id,
            voter.clone(),
        ))
        .unwrap_or(false)
}

pub fn set_emergency_vote_approved(env: &Env, pool_id: u32, draw_id: u32, voter: &Address) {
    let key = DataKey::EmergencyVoteApproved(pool_id, draw_id, voter.clone());
    env.storage().persistent().set(&key, &true);
    bump_persistent(env, &key);
}

pub fn active_emergency_draw(env: &Env, pool_id: u32) -> Option<u32> {
    env.storage()
        .persistent()
        .get(&DataKey::ActiveEmergencyDrawForPool(pool_id))
        .unwrap_or(None)
}

pub fn set_active_emergency_draw(env: &Env, pool_id: u32, draw_id: Option<u32>) {
    let key = DataKey::ActiveEmergencyDrawForPool(pool_id);
    env.storage().persistent().set(&key, &draw_id);
    bump_persistent(env, &key);
}
