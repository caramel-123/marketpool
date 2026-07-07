use soroban_sdk::{contracttype, Address, String, Vec};

#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum PoolStatus {
    /// Created, still accepting members below `max_members`.
    Forming,
    /// Rotation is running.
    Active,
    /// Admin-paused (e.g. mid-dispute). No contributions/draws allowed.
    Paused,
    /// Wound down. Terminal.
    Closed,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Pool {
    pub admin: Address,
    /// Off-chain Market UUID (as text) this pool belongs to, for Supabase linkage.
    pub market_id: String,
    pub contribution_amount: i128,
    pub cycle_length_secs: u64,
    pub max_members: u32,
    /// Token contributions are paid in (native XLM SAC on testnet).
    pub token: Address,
    pub status: PoolStatus,
    /// 0-based, increments each time a scheduled draw executes.
    pub current_cycle: u32,
    pub cycle_start_ts: u64,
    pub member_count: u32,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Member {
    pub address: Address,
    pub joined_at: u64,
    /// Fixed rotation slot assigned at join time (first-come-first-served order).
    pub draw_position: u32,
    pub guarantor: Option<Address>,
    /// No `leave_pool` exists in v1; this exists so a future admin action has
    /// somewhere to record a member being deactivated without deleting history.
    pub active: bool,
}

#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum ContributionStatus {
    Paid,
    Missed,
    Adjusted,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Contribution {
    pub member: Address,
    pub cycle: u32,
    pub amount: i128,
    pub status: ContributionStatus,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum DrawType {
    Scheduled,
    Emergency,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Draw {
    pub id: u32,
    pub cycle: u32,
    pub recipient: Address,
    pub amount: i128,
    pub draw_type: DrawType,
    pub executed_at: u64,
    pub approvals_snapshot: u32,
    pub member_count_snapshot: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct EmergencyVote {
    pub draw_id: u32,
    pub requester: Address,
    pub reason: String,
    pub created_at: u64,
    pub approvals: Vec<Address>,
    /// Member count at the moment the vote opened -- the threshold is
    /// snapshotted here and never recomputed, so a passed vote can't be
    /// un-passed by new members joining while it's open (see plan section on
    /// emergency-draw threshold timing).
    pub member_count_snapshot: u32,
    pub executed: bool,
}

#[contracttype]
pub enum DataKey {
    // ---- Instance-level (small, cheap, always-resident) ----
    NextPoolId,
    /// Set once via `initialize`; the reputation_contract this instance cross-calls.
    ReputationContract,

    // ---- Per-pool (persistent tier) ----
    Pool(u32),
    MemberByPosition(u32, u32),
    MemberInfo(u32, Address),
    NextDrawPosition(u32),
    NextDrawId(u32),
    NextEmergencyDrawId(u32),

    Contribution(u32, u32, Address),

    Draw(u32, u32),
    /// Double-draw guard #1: one scheduled draw per numbered cycle.
    CycleExecuted(u32, u32),
    /// Double-draw guard #2: one payout per rotation slot per round; reset
    /// for all slots when the rotation wraps back to position 0.
    DrawPositionExecuted(u32, u32),

    EmergencyVote(u32, u32),
    /// O(1) double-vote guard, avoids scanning EmergencyVote.approvals.
    EmergencyVoteApproved(u32, u32, Address),
    /// At most one open (unexecuted) emergency draw per pool at a time.
    ActiveEmergencyDrawForPool(u32),
}
