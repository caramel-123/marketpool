//! Dynamic (non-crate-dependency) cross-calls into reputation_contract.
//!
//! Production pool_contract code deliberately does NOT depend on the
//! reputation_contract crate -- depending on it would pull that crate's
//! `#[contractimpl]`-generated entry points into pool_contract's own cdylib
//! as a `lib` (rlib) dependency, risking duplicate/confused contract exports
//! in one Wasm binary. Instead we call it by address via
//! `env.invoke_contract`, decoding the return value through the shared
//! `shared_types` shapes both contracts agree on. (Integration tests, by
//! contrast, register a real reputation_contract instance in-process via a
//! dev-dependency -- see Cargo.toml -- purely for test convenience.)

use shared_types::{ReputationEventType, ReputationScore};
use soroban_sdk::{vec, Address, Env, IntoVal, Symbol};

use crate::storage;

pub fn get_score(env: &Env, vendor: &Address) -> ReputationScore {
    match storage::get_reputation_contract(env) {
        Some(reputation_contract) => {
            let args = vec![env, vendor.into_val(env)];
            env.invoke_contract(&reputation_contract, &Symbol::new(env, "get_score"), args)
        }
        None => ReputationScore {
            vendor: vendor.clone(),
            clean_cycles: 0,
            missed_count: 0,
            adjusted_count: 0,
            total_events: 0,
            score: 0,
            last_updated: 0,
        },
    }
}

pub fn record_event(
    env: &Env,
    vendor: &Address,
    pool_id: u32,
    cycle: u32,
    event_type: ReputationEventType,
) {
    if let Some(reputation_contract) = storage::get_reputation_contract(env) {
        let args = vec![
            env,
            env.current_contract_address().into_val(env),
            vendor.into_val(env),
            pool_id.into_val(env),
            cycle.into_val(env),
            event_type.into_val(env),
        ];
        let _: () = env.invoke_contract(&reputation_contract, &Symbol::new(env, "record_event"), args);
    }
}
