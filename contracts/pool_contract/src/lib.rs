#![no_std]

mod reputation_bridge;
mod storage;
mod types;

use shared_types::ReputationEventType;
use soroban_sdk::{contract, contractimpl, token, Address, Env, String};

pub use types::{Contribution, ContributionStatus, Draw, DrawType, EmergencyVote, Member, Pool, PoolStatus};

#[contract]
pub struct PoolContract;

#[contractimpl]
impl PoolContract {
    /// One-time bootstrap: registers the reputation_contract this instance
    /// cross-calls for score/badge tracking. No per-pool admin exists yet at
    /// this point, so this is a deploy-time call made once by whoever
    /// deploys this contract instance.
    pub fn initialize(env: Env, reputation_contract: Address) {
        assert!(
            storage::get_reputation_contract(&env).is_none(),
            "Already initialized"
        );
        storage::set_reputation_contract(&env, &reputation_contract);
    }

    pub fn create_pool(
        env: Env,
        admin: Address,
        market_id: String,
        contribution_amount: i128,
        cycle_length_secs: u64,
        max_members: u32,
        token: Address,
    ) -> u32 {
        admin.require_auth();
        assert!(contribution_amount > 0, "contribution_amount must be positive");
        assert!(max_members > 0, "max_members must be positive");

        let pool_id = storage::next_pool_id(&env);
        storage::set_next_pool_id(&env, pool_id + 1);

        let pool = Pool {
            admin,
            market_id,
            contribution_amount,
            cycle_length_secs,
            max_members,
            token,
            status: PoolStatus::Forming,
            current_cycle: 0,
            cycle_start_ts: env.ledger().timestamp(),
            member_count: 0,
            created_at: env.ledger().timestamp(),
        };
        storage::set_pool(&env, pool_id, &pool);
        storage::set_next_draw_position(&env, pool_id, 0);
        storage::set_next_draw_id(&env, pool_id, 0);
        storage::set_next_emergency_draw_id(&env, pool_id, 0);

        pool_id
    }

    /// Requires at least one guarantor if the vendor has no prior reputation
    /// (zero recorded events in reputation_contract). Guarantor vouching is
    /// informational only in v1 -- it is not itself validated against the
    /// guarantor's own standing, and carries no on-chain consequence for the
    /// guarantor if the vouched vendor later defaults.
    pub fn join_pool(env: Env, pool_id: u32, vendor: Address, guarantor: Option<Address>) -> u32 {
        vendor.require_auth();

        let mut pool = storage::get_pool(&env, pool_id);
        assert!(pool.status != PoolStatus::Closed, "Pool is closed");
        assert!(pool.member_count < pool.max_members, "Pool is full");
        assert!(!storage::has_member(&env, pool_id, &vendor), "Already a member");

        if let Some(g) = &guarantor {
            assert!(*g != vendor, "Cannot self-guarantee");
        } else {
            let score = reputation_bridge::get_score(&env, &vendor);
            assert!(
                score.total_events > 0,
                "Guarantor required for vendors with no prior reputation"
            );
        }

        let draw_position = pool.member_count;
        let member = Member {
            address: vendor.clone(),
            joined_at: env.ledger().timestamp(),
            draw_position,
            guarantor,
            active: true,
        };
        storage::set_member(&env, pool_id, &member);

        pool.member_count += 1;
        if pool.status == PoolStatus::Forming {
            pool.status = PoolStatus::Active;
        }
        storage::set_pool(&env, pool_id, &pool);

        draw_position
    }

    /// Requires the exact `contribution_amount` for the pool's current cycle.
    /// Partial/late payments are reconciled afterward via
    /// `mark_adjusted_contribution`, not accepted directly here.
    pub fn contribute(env: Env, pool_id: u32, vendor: Address, amount: i128) -> bool {
        vendor.require_auth();

        let pool = storage::get_pool(&env, pool_id);
        assert!(pool.status == PoolStatus::Active, "Pool is not active");
        assert!(storage::has_member(&env, pool_id, &vendor), "Not a member of this pool");
        assert!(amount == pool.contribution_amount, "Amount must equal contribution_amount");

        let cycle = pool.current_cycle;
        assert!(
            storage::get_contribution(&env, pool_id, cycle, &vendor).is_none(),
            "Already contributed for this cycle"
        );

        let token_client = token::Client::new(&env, &pool.token);
        token_client.transfer(&vendor, &env.current_contract_address(), &amount);

        storage::set_contribution(
            &env,
            pool_id,
            &Contribution {
                member: vendor,
                cycle,
                amount,
                status: ContributionStatus::Paid,
                timestamp: env.ledger().timestamp(),
            },
        );

        true
    }

    /// Only the member whose rotation slot is next may call this. Combines
    /// "request" and "execute" into one money-movement code path so there is
    /// exactly one place that flips the double-draw guards and moves funds.
    pub fn request_draw(env: Env, pool_id: u32, caller: Address) -> u32 {
        caller.require_auth();

        let mut pool = storage::get_pool(&env, pool_id);
        assert!(pool.status == PoolStatus::Active, "Pool is not active");

        let position = storage::next_draw_position(&env, pool_id);
        let expected_recipient = storage::get_member_by_position(&env, pool_id, position);
        assert!(caller == expected_recipient, "Not this member's turn to draw");

        let cycle = pool.current_cycle;
        assert!(!storage::is_cycle_executed(&env, pool_id, cycle), "Cycle already drawn");
        assert!(
            !storage::is_draw_position_executed(&env, pool_id, position),
            "This rotation slot already drew this round"
        );

        // checks-effects-interactions: flip guards before moving funds.
        storage::set_cycle_executed(&env, pool_id, cycle);
        storage::set_draw_position_executed(&env, pool_id, position, true);

        let payout = pool.contribution_amount * (pool.member_count as i128);
        let token_client = token::Client::new(&env, &pool.token);
        token_client.transfer(&env.current_contract_address(), &expected_recipient, &payout);

        let draw_id = storage::next_draw_id(&env, pool_id);
        storage::set_next_draw_id(&env, pool_id, draw_id + 1);
        storage::set_draw(
            &env,
            pool_id,
            &Draw {
                id: draw_id,
                cycle,
                recipient: expected_recipient.clone(),
                amount: payout,
                draw_type: DrawType::Scheduled,
                executed_at: env.ledger().timestamp(),
                approvals_snapshot: 0,
                member_count_snapshot: pool.member_count,
            },
        );

        // Reward every member who paid on time this cycle.
        for i in 0..pool.member_count {
            let member_address = storage::get_member_by_position(&env, pool_id, i);
            if let Some(contribution) = storage::get_contribution(&env, pool_id, cycle, &member_address) {
                if contribution.status == ContributionStatus::Paid {
                    reputation_bridge::record_event(
                        &env,
                        &member_address,
                        pool_id,
                        cycle,
                        ReputationEventType::CycleCompleted,
                    );
                }
            }
        }

        let next_position = (position + 1) % pool.member_count;
        storage::set_next_draw_position(&env, pool_id, next_position);
        if next_position == 0 {
            storage::reset_all_draw_positions_executed(&env, pool_id, pool.member_count);
        }

        pool.current_cycle += 1;
        pool.cycle_start_ts = env.ledger().timestamp();
        storage::set_pool(&env, pool_id, &pool);

        draw_id
    }

    /// Admin-only. Rejects overwriting an existing `Paid` row so a clean
    /// contribution can never be silently marked missed by mistake.
    pub fn mark_missed_contribution(env: Env, pool_id: u32, admin: Address, member: Address, cycle: u32) -> bool {
        admin.require_auth();
        let pool = storage::get_pool(&env, pool_id);
        assert!(admin == pool.admin, "Not pool admin");

        if let Some(existing) = storage::get_contribution(&env, pool_id, cycle, &member) {
            assert!(existing.status != ContributionStatus::Paid, "Cannot overwrite a paid contribution");
        }

        storage::set_contribution(
            &env,
            pool_id,
            &Contribution {
                member: member.clone(),
                cycle,
                amount: 0,
                status: ContributionStatus::Missed,
                timestamp: env.ledger().timestamp(),
            },
        );

        reputation_bridge::record_event(&env, &member, pool_id, cycle, ReputationEventType::Defaulted);
        true
    }

    /// Admin-only escape hatch: overwrites a contribution's status (e.g. to
    /// correct a wrong Missed mark, or record a partial/late payment the
    /// admin/kolektor accepted off-chain).
    pub fn mark_adjusted_contribution(
        env: Env,
        pool_id: u32,
        admin: Address,
        member: Address,
        cycle: u32,
        amount: i128,
    ) -> bool {
        admin.require_auth();
        let pool = storage::get_pool(&env, pool_id);
        assert!(admin == pool.admin, "Not pool admin");

        storage::set_contribution(
            &env,
            pool_id,
            &Contribution {
                member: member.clone(),
                cycle,
                amount,
                status: ContributionStatus::Adjusted,
                timestamp: env.ledger().timestamp(),
            },
        );

        reputation_bridge::record_event(&env, &member, pool_id, cycle, ReputationEventType::Adjusted);
        true
    }

    /// Auto-approves the requester's own vote. Only one open emergency draw
    /// is allowed per pool at a time -- a second request while one is
    /// pending panics until it is executed or cancelled.
    pub fn request_emergency_draw(env: Env, pool_id: u32, requester: Address, reason: String) -> u32 {
        requester.require_auth();

        let pool = storage::get_pool(&env, pool_id);
        assert!(pool.status == PoolStatus::Active, "Pool is not active");
        assert!(storage::has_member(&env, pool_id, &requester), "Not a member of this pool");
        assert!(
            storage::active_emergency_draw(&env, pool_id).is_none(),
            "An emergency draw is already pending for this pool"
        );

        let draw_id = storage::next_emergency_draw_id(&env, pool_id);
        storage::set_next_emergency_draw_id(&env, pool_id, draw_id + 1);

        let mut approvals = soroban_sdk::Vec::new(&env);
        approvals.push_back(requester.clone());

        storage::set_emergency_vote(
            &env,
            pool_id,
            &EmergencyVote {
                draw_id,
                requester: requester.clone(),
                reason,
                created_at: env.ledger().timestamp(),
                approvals,
                member_count_snapshot: pool.member_count,
                executed: false,
            },
        );
        storage::set_emergency_vote_approved(&env, pool_id, draw_id, &requester);
        storage::set_active_emergency_draw(&env, pool_id, Some(draw_id));

        draw_id
    }

    pub fn approve_emergency_draw(env: Env, pool_id: u32, draw_id: u32, approver: Address) -> bool {
        approver.require_auth();
        assert!(storage::has_member(&env, pool_id, &approver), "Not a member of this pool");

        let mut vote = storage::get_emergency_vote(&env, pool_id, draw_id);
        assert!(!vote.executed, "Vote already executed");
        assert!(
            !storage::is_emergency_vote_approved(&env, pool_id, draw_id, &approver),
            "Already voted"
        );

        vote.approvals.push_back(approver.clone());
        storage::set_emergency_vote(&env, pool_id, &vote);
        storage::set_emergency_vote_approved(&env, pool_id, draw_id, &approver);

        true
    }

    /// Admin-only. Clears a stalled vote so the pool isn't permanently
    /// blocked from opening a new emergency request.
    pub fn cancel_emergency_draw(env: Env, pool_id: u32, draw_id: u32, admin: Address) -> bool {
        admin.require_auth();
        let pool = storage::get_pool(&env, pool_id);
        assert!(admin == pool.admin, "Not pool admin");

        let mut vote = storage::get_emergency_vote(&env, pool_id, draw_id);
        assert!(!vote.executed, "Vote already executed");

        vote.executed = true;
        storage::set_emergency_vote(&env, pool_id, &vote);
        storage::set_active_emergency_draw(&env, pool_id, None);

        true
    }

    /// Executes a passed emergency vote. Only the original requester or the
    /// pool admin may trigger it. Threshold is `member_count_snapshot / 2 +
    /// 1`, computed once against the snapshot taken when the vote opened --
    /// not recomputed against current membership at execution time. Pays out
    /// the full current pool balance to the requester. Does not consume a
    /// rotation slot or advance the scheduled-draw position.
    pub fn execute_draw(env: Env, pool_id: u32, draw_id: u32, caller: Address) -> u32 {
        caller.require_auth();

        let pool = storage::get_pool(&env, pool_id);
        let mut vote = storage::get_emergency_vote(&env, pool_id, draw_id);
        assert!(!vote.executed, "Vote already executed");
        assert!(
            caller == vote.requester || caller == pool.admin,
            "Only the requester or pool admin may execute this draw"
        );

        let required = vote.member_count_snapshot / 2 + 1;
        assert!(vote.approvals.len() >= required, "Insufficient approvals");

        let token_client = token::Client::new(&env, &pool.token);
        let payout = token_client.balance(&env.current_contract_address());
        token_client.transfer(&env.current_contract_address(), &vote.requester, &payout);

        vote.executed = true;
        storage::set_emergency_vote(&env, pool_id, &vote);
        storage::set_active_emergency_draw(&env, pool_id, None);

        storage::set_draw(
            &env,
            pool_id,
            &Draw {
                id: draw_id,
                cycle: pool.current_cycle,
                recipient: vote.requester,
                amount: payout,
                draw_type: DrawType::Emergency,
                executed_at: env.ledger().timestamp(),
                approvals_snapshot: vote.approvals.len(),
                member_count_snapshot: vote.member_count_snapshot,
            },
        );

        draw_id
    }

    // ---- Read-only views ----

    pub fn get_pool(env: Env, pool_id: u32) -> Pool {
        storage::get_pool(&env, pool_id)
    }

    pub fn get_member(env: Env, pool_id: u32, vendor: Address) -> Member {
        storage::get_member(&env, pool_id, &vendor)
    }

    pub fn get_contribution(env: Env, pool_id: u32, cycle: u32, vendor: Address) -> Option<Contribution> {
        storage::get_contribution(&env, pool_id, cycle, &vendor)
    }

    pub fn get_emergency_vote_info(env: Env, pool_id: u32, draw_id: u32) -> EmergencyVote {
        storage::get_emergency_vote(&env, pool_id, draw_id)
    }

    pub fn get_member_by_position(env: Env, pool_id: u32, position: u32) -> Address {
        storage::get_member_by_position(&env, pool_id, position)
    }

    /// Convenience for frontends: the full member roster in draw order,
    /// avoiding N round-trip calls to `get_member_by_position` + `get_member`.
    pub fn get_all_members(env: Env, pool_id: u32) -> soroban_sdk::Vec<Member> {
        let pool = storage::get_pool(&env, pool_id);
        let mut members = soroban_sdk::Vec::new(&env);
        for position in 0..pool.member_count {
            let address = storage::get_member_by_position(&env, pool_id, position);
            members.push_back(storage::get_member(&env, pool_id, &address));
        }
        members
    }
}

mod test;
