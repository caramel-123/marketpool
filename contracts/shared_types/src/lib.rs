#![no_std]

//! Types shared between `pool_contract` and `reputation_contract`.
//!
//! This crate is compile-time-only glue (never built to Wasm on its own) so the
//! two contracts agree on the shape of the events/badges passed across the
//! `record_event` cross-contract call. It must stay a plain `#[contracttype]`
//! library — no `#[contract]` struct here.

use soroban_sdk::{contracttype, Address};

// NOTE: pool/cycle identifiers are plain `u32` everywhere in both contracts'
// `#[contracttype]` definitions and `#[contractimpl]` function signatures --
// NOT a `pub type PoolId = u32;` alias. Soroban's contract-spec codegen is
// syntactic (it doesn't resolve plain type aliases), so a bare alias used in
// an ABI-exposed position produces a spec that references a type named
// "PoolId" with no corresponding entry, which the CLI/RPC then reject with
// "Missing Entry PoolId" at invoke time. Aliases are fine for purely
// internal (non-contracttype, non-contractimpl) helper signatures only.

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ReputationEventType {
    /// Vendor paid on time and the pool's scheduled draw for that cycle executed cleanly.
    CycleCompleted,
    /// Vendor's contribution for a cycle was marked missed by the pool admin.
    Defaulted,
    /// A missed/late contribution was reconciled via `mark_adjusted_contribution`.
    Adjusted,
    /// Vendor acted as a guarantor for another vendor joining a pool.
    GuarantorVouch,
    /// A reputation badge tier was minted for the vendor.
    BadgeEarned,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum BadgeType {
    Bronze,
    Silver,
    Gold,
}

/// Returned by `reputation_contract::get_score`. Lives here (not in
/// `reputation_contract` alone) because `pool_contract` decodes this same
/// shape when it cross-calls `get_score` to decide whether `join_pool`
/// requires a guarantor (vendor has zero prior events).
#[contracttype]
#[derive(Clone, Debug)]
pub struct ReputationScore {
    pub vendor: Address,
    pub clean_cycles: u32,
    pub missed_count: u32,
    pub adjusted_count: u32,
    pub total_events: u32,
    pub score: i64,
    pub last_updated: u64,
}
