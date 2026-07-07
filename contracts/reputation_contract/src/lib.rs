#![no_std]

mod storage;
mod types;

use shared_types::{BadgeType, ReputationEventType, ReputationScore};
use soroban_sdk::{contract, contractimpl, Address, Env, Vec};

pub use types::ReputationEvent;

#[contract]
pub struct ReputationContract;

fn badge_threshold(badge_type: BadgeType) -> u32 {
    match badge_type {
        BadgeType::Bronze => 5,
        BadgeType::Silver => 10,
        BadgeType::Gold => 20,
    }
}

fn get_score_internal(env: &Env, vendor: &Address) -> ReputationScore {
    storage::get_score(env, vendor).unwrap_or(ReputationScore {
        vendor: vendor.clone(),
        clean_cycles: 0,
        missed_count: 0,
        adjusted_count: 0,
        total_events: 0,
        score: 0,
        last_updated: 0,
    })
}

/// Idempotent write: no-ops (returns false) if this tier is already minted.
/// Eligibility is NOT checked here -- callers decide whether to enforce it
/// (the public `mint_badge` panics if ineligible; the auto-mint path only
/// calls this once it has already confirmed the threshold is crossed).
fn mint_if_not_already(env: &Env, vendor: &Address, badge_type: BadgeType) -> bool {
    if storage::is_badge_minted(env, vendor, badge_type) {
        return false;
    }
    storage::set_badge_minted(env, vendor, badge_type, true);
    storage::push_badge_for_vendor(env, vendor, badge_type);
    true
}

fn auto_mint_eligible_badges(env: &Env, vendor: &Address, clean_cycles: u32) {
    for badge_type in [BadgeType::Bronze, BadgeType::Silver, BadgeType::Gold] {
        if clean_cycles >= badge_threshold(badge_type) {
            mint_if_not_already(env, vendor, badge_type);
        }
    }
}

#[contractimpl]
impl ReputationContract {
    /// One-time bootstrap: sets the admin allowed to register authorized
    /// callers (i.e. deployed pool_contract instances).
    pub fn initialize(env: Env, admin: Address) {
        assert!(storage::get_admin(&env).is_none(), "Already initialized");
        storage::set_admin(&env, &admin);
    }

    pub fn add_authorized_caller(env: Env, admin: Address, caller: Address) {
        admin.require_auth();
        let stored_admin = storage::get_admin(&env).expect("Not initialized");
        assert!(admin == stored_admin, "Not admin");
        storage::set_authorized_caller(&env, &caller, true);
    }

    /// `caller` must be the pool_contract instance itself (its own contract
    /// address), and must `require_auth()` -- Soroban auto-authorizes a
    /// contract's own address for calls it is directly making, so this
    /// cannot be spoofed by a third party passing an arbitrary address it
    /// doesn't actually control the invocation for.
    pub fn record_event(
        env: Env,
        caller: Address,
        vendor: Address,
        pool_id: u32,
        cycle: u32,
        event_type: ReputationEventType,
    ) {
        caller.require_auth();
        assert!(storage::is_authorized_caller(&env, &caller), "Caller not authorized");

        let mut score = get_score_internal(&env, &vendor);
        match event_type {
            ReputationEventType::CycleCompleted => score.clean_cycles += 1,
            ReputationEventType::Defaulted => score.missed_count += 1,
            ReputationEventType::Adjusted => score.adjusted_count += 1,
            ReputationEventType::GuarantorVouch | ReputationEventType::BadgeEarned => {}
        }
        score.total_events += 1;

        let raw = (score.clean_cycles as i64) * 10 - (score.missed_count as i64) * 15
            + (score.adjusted_count as i64) * 2;
        score.score = if raw < 0 { 0 } else { raw };
        score.last_updated = env.ledger().timestamp();
        storage::set_score(&env, &vendor, &score);

        let index = storage::next_event_index(&env, &vendor);
        storage::set_event_count(&env, &vendor, index + 1);
        storage::set_event_log(
            &env,
            &vendor,
            index,
            &ReputationEvent {
                vendor: vendor.clone(),
                pool_id,
                cycle,
                event_type,
                timestamp: env.ledger().timestamp(),
            },
        );

        if event_type == ReputationEventType::CycleCompleted {
            auto_mint_eligible_badges(&env, &vendor, score.clean_cycles);
        }
    }

    /// Explicit/manual mint path (e.g. admin re-trigger, migration backfill).
    /// Idempotent: a second call for an already-minted tier returns `false`
    /// rather than panicking. Panics if the vendor is not yet eligible.
    pub fn mint_badge(env: Env, vendor: Address, badge_type: BadgeType) -> bool {
        if storage::is_badge_minted(&env, &vendor, badge_type) {
            return false;
        }
        let score = get_score_internal(&env, &vendor);
        assert!(
            score.clean_cycles >= badge_threshold(badge_type),
            "Vendor does not yet qualify for this badge"
        );
        mint_if_not_already(&env, &vendor, badge_type)
    }

    pub fn get_score(env: Env, vendor: Address) -> ReputationScore {
        get_score_internal(&env, &vendor)
    }

    pub fn get_badges(env: Env, vendor: Address) -> Vec<BadgeType> {
        storage::get_badges_for_vendor(&env, &vendor)
    }

    /// Event history for the "My Reputation" page. Append-only, chronological.
    pub fn get_event_count(env: Env, vendor: Address) -> u32 {
        storage::next_event_index(&env, &vendor)
    }

    pub fn get_event(env: Env, vendor: Address, index: u32) -> ReputationEvent {
        storage::get_event_log(&env, &vendor, index)
    }
}

mod test;
