use shared_types::{BadgeType, ReputationScore};
use soroban_sdk::{Address, Env, Vec};

use crate::types::{DataKey, ReputationEvent};

const LEDGERS_PER_DAY: u32 = 17_280;
const TTL_THRESHOLD: u32 = LEDGERS_PER_DAY * 30;
const TTL_EXTEND_TO: u32 = LEDGERS_PER_DAY * 120;

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn is_authorized_caller(env: &Env, caller: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::AuthorizedCaller(caller.clone()))
        .unwrap_or(false)
}

pub fn set_authorized_caller(env: &Env, caller: &Address, value: bool) {
    let key = DataKey::AuthorizedCaller(caller.clone());
    env.storage().persistent().set(&key, &value);
    bump_persistent(env, &key);
}

pub fn get_score(env: &Env, vendor: &Address) -> Option<ReputationScore> {
    env.storage().persistent().get(&DataKey::Score(vendor.clone()))
}

pub fn set_score(env: &Env, vendor: &Address, score: &ReputationScore) {
    let key = DataKey::Score(vendor.clone());
    env.storage().persistent().set(&key, score);
    bump_persistent(env, &key);
}

pub fn next_event_index(env: &Env, vendor: &Address) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::EventCount(vendor.clone()))
        .unwrap_or(0)
}

pub fn set_event_count(env: &Env, vendor: &Address, count: u32) {
    let key = DataKey::EventCount(vendor.clone());
    env.storage().persistent().set(&key, &count);
    bump_persistent(env, &key);
}

pub fn set_event_log(env: &Env, vendor: &Address, index: u32, event: &ReputationEvent) {
    let key = DataKey::EventLog(vendor.clone(), index);
    env.storage().persistent().set(&key, event);
    bump_persistent(env, &key);
}

pub fn get_event_log(env: &Env, vendor: &Address, index: u32) -> ReputationEvent {
    env.storage()
        .persistent()
        .get(&DataKey::EventLog(vendor.clone(), index))
        .expect("Event not found")
}

pub fn is_badge_minted(env: &Env, vendor: &Address, badge_type: BadgeType) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::BadgeMinted(vendor.clone(), badge_type))
        .unwrap_or(false)
}

pub fn set_badge_minted(env: &Env, vendor: &Address, badge_type: BadgeType, value: bool) {
    let key = DataKey::BadgeMinted(vendor.clone(), badge_type);
    env.storage().persistent().set(&key, &value);
    bump_persistent(env, &key);
}

pub fn get_badges_for_vendor(env: &Env, vendor: &Address) -> Vec<BadgeType> {
    env.storage()
        .persistent()
        .get(&DataKey::BadgesForVendor(vendor.clone()))
        .unwrap_or(Vec::new(env))
}

pub fn push_badge_for_vendor(env: &Env, vendor: &Address, badge_type: BadgeType) {
    let mut badges = get_badges_for_vendor(env, vendor);
    badges.push_back(badge_type);
    let key = DataKey::BadgesForVendor(vendor.clone());
    env.storage().persistent().set(&key, &badges);
    bump_persistent(env, &key);
}
