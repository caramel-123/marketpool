use shared_types::{BadgeType, ReputationEventType};
use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug)]
pub struct ReputationEvent {
    pub vendor: Address,
    pub pool_id: u32,
    pub cycle: u32,
    pub event_type: ReputationEventType,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    /// Allow-list of contract addresses (deployed pool_contract instances)
    /// permitted to call `record_event` -- prevents arbitrary callers from
    /// inflating scores.
    AuthorizedCaller(Address),
    Score(Address),
    EventLog(Address, u32),
    EventCount(Address),
    /// Idempotency guard: presence+true means this tier was already minted.
    BadgeMinted(Address, BadgeType),
    BadgesForVendor(Address),
}
