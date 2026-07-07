import { nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { POOL_CONTRACT_ID } from './poolContractConfig';
import {
  addressToScVal,
  assertAddress,
  buildAndSubmit,
  normalizeEnumTag,
  optionAddressToScVal,
  scValToNative,
  simulateOnly,
} from './sorobanClient';

export type PoolStatus = 'Forming' | 'Active' | 'Paused' | 'Closed';
export type ContributionStatus = 'Paid' | 'Missed' | 'Adjusted';
export type DrawType = 'Scheduled' | 'Emergency';

export interface Pool {
  admin: string;
  marketId: string;
  contributionAmount: bigint;
  cycleLengthSecs: bigint;
  maxMembers: number;
  token: string;
  status: PoolStatus;
  currentCycle: number;
  cycleStartTs: bigint;
  memberCount: number;
  createdAt: bigint;
}

export interface Member {
  address: string;
  joinedAt: bigint;
  drawPosition: number;
  guarantor: string | null;
  active: boolean;
}

export interface Contribution {
  member: string;
  cycle: number;
  amount: bigint;
  status: ContributionStatus;
  timestamp: bigint;
}

export interface EmergencyVote {
  drawId: number;
  requester: string;
  reason: string;
  createdAt: bigint;
  approvals: string[];
  memberCountSnapshot: number;
  executed: boolean;
}

function toPool(raw: Record<string, unknown>): Pool {
  return {
    admin: String(raw.admin),
    marketId: String(raw.market_id),
    contributionAmount: BigInt(String(raw.contribution_amount)),
    cycleLengthSecs: BigInt(String(raw.cycle_length_secs)),
    maxMembers: Number(raw.max_members),
    token: String(raw.token),
    status: normalizeEnumTag(raw.status) as PoolStatus,
    currentCycle: Number(raw.current_cycle),
    cycleStartTs: BigInt(String(raw.cycle_start_ts)),
    memberCount: Number(raw.member_count),
    createdAt: BigInt(String(raw.created_at)),
  };
}

function toMember(raw: Record<string, unknown>): Member {
  return {
    address: String(raw.address),
    joinedAt: BigInt(String(raw.joined_at)),
    drawPosition: Number(raw.draw_position),
    guarantor: raw.guarantor ? String(raw.guarantor) : null,
    active: Boolean(raw.active),
  };
}

function toContribution(raw: Record<string, unknown>): Contribution {
  return {
    member: String(raw.member),
    cycle: Number(raw.cycle),
    amount: BigInt(String(raw.amount)),
    status: normalizeEnumTag(raw.status) as ContributionStatus,
    timestamp: BigInt(String(raw.timestamp)),
  };
}

function toEmergencyVote(raw: Record<string, unknown>): EmergencyVote {
  return {
    drawId: Number(raw.draw_id),
    requester: String(raw.requester),
    reason: String(raw.reason),
    createdAt: BigInt(String(raw.created_at)),
    approvals: (raw.approvals as unknown[]).map(String),
    memberCountSnapshot: Number(raw.member_count_snapshot),
    executed: Boolean(raw.executed),
  };
}

const u32 = (n: number) => nativeToScVal(n, { type: 'u32' });
const u64 = (n: bigint | number) => nativeToScVal(n, { type: 'u64' });
const i128 = (n: bigint | number) => nativeToScVal(n, { type: 'i128' });
const str = (s: string) => nativeToScVal(s, { type: 'string' });

export async function createPool(
  adminAddress: string,
  marketId: string,
  contributionAmount: bigint,
  cycleLengthSecs: bigint,
  maxMembers: number,
  token: string
): Promise<number> {
  assertAddress(adminAddress, 'Admin');
  const args = [
    addressToScVal(adminAddress),
    str(marketId),
    i128(contributionAmount),
    u64(cycleLengthSecs),
    u32(maxMembers),
    addressToScVal(token),
  ];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, adminAddress, 'create_pool', args);
  if (!result) throw new Error('No return value from create_pool');
  return Number(scValToNative(result));
}

export async function joinPool(
  walletAddress: string,
  poolId: number,
  guarantor: string | null
): Promise<number> {
  assertAddress(walletAddress, 'Wallet');
  const args = [u32(poolId), addressToScVal(walletAddress), optionAddressToScVal(guarantor)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, walletAddress, 'join_pool', args);
  if (!result) throw new Error('No return value from join_pool');
  return Number(scValToNative(result));
}

export async function contribute(walletAddress: string, poolId: number, amount: bigint): Promise<boolean> {
  assertAddress(walletAddress, 'Wallet');
  const args = [u32(poolId), addressToScVal(walletAddress), i128(amount)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, walletAddress, 'contribute', args);
  return result ? Boolean(scValToNative(result)) : false;
}

export async function requestDraw(walletAddress: string, poolId: number): Promise<number> {
  assertAddress(walletAddress, 'Wallet');
  const args = [u32(poolId), addressToScVal(walletAddress)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, walletAddress, 'request_draw', args);
  if (!result) throw new Error('No return value from request_draw');
  return Number(scValToNative(result));
}

export async function requestEmergencyDraw(
  walletAddress: string,
  poolId: number,
  reason: string
): Promise<number> {
  assertAddress(walletAddress, 'Wallet');
  const args = [u32(poolId), addressToScVal(walletAddress), str(reason)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, walletAddress, 'request_emergency_draw', args);
  if (!result) throw new Error('No return value from request_emergency_draw');
  return Number(scValToNative(result));
}

export async function approveEmergencyDraw(
  walletAddress: string,
  poolId: number,
  drawId: number
): Promise<boolean> {
  assertAddress(walletAddress, 'Wallet');
  const args = [u32(poolId), u32(drawId), addressToScVal(walletAddress)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, walletAddress, 'approve_emergency_draw', args);
  return result ? Boolean(scValToNative(result)) : false;
}

export async function cancelEmergencyDraw(
  adminAddress: string,
  poolId: number,
  drawId: number
): Promise<boolean> {
  assertAddress(adminAddress, 'Admin');
  const args = [u32(poolId), u32(drawId), addressToScVal(adminAddress)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, adminAddress, 'cancel_emergency_draw', args);
  return result ? Boolean(scValToNative(result)) : false;
}

export async function executeDraw(walletAddress: string, poolId: number, drawId: number): Promise<number> {
  assertAddress(walletAddress, 'Wallet');
  const args = [u32(poolId), u32(drawId), addressToScVal(walletAddress)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, walletAddress, 'execute_draw', args);
  if (!result) throw new Error('No return value from execute_draw');
  return Number(scValToNative(result));
}

export async function markMissedContribution(
  adminAddress: string,
  poolId: number,
  member: string,
  cycle: number
): Promise<boolean> {
  assertAddress(adminAddress, 'Admin');
  const args = [u32(poolId), addressToScVal(adminAddress), addressToScVal(member), u32(cycle)];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, adminAddress, 'mark_missed_contribution', args);
  return result ? Boolean(scValToNative(result)) : false;
}

export async function markAdjustedContribution(
  adminAddress: string,
  poolId: number,
  member: string,
  cycle: number,
  amount: bigint
): Promise<boolean> {
  assertAddress(adminAddress, 'Admin');
  const args = [
    u32(poolId),
    addressToScVal(adminAddress),
    addressToScVal(member),
    u32(cycle),
    i128(amount),
  ];
  const result = await buildAndSubmit(POOL_CONTRACT_ID, adminAddress, 'mark_adjusted_contribution', args);
  return result ? Boolean(scValToNative(result)) : false;
}

export async function getPool(walletAddress: string, poolId: number): Promise<Pool> {
  const args = [u32(poolId)];
  const result = await simulateOnly(POOL_CONTRACT_ID, walletAddress, 'get_pool', args);
  if (!result) throw new Error('Pool not found');
  return toPool(scValToNative(result) as Record<string, unknown>);
}

export async function getMember(walletAddress: string, poolId: number, vendor: string): Promise<Member> {
  const args = [u32(poolId), addressToScVal(vendor)];
  const result = await simulateOnly(POOL_CONTRACT_ID, walletAddress, 'get_member', args);
  if (!result) throw new Error('Member not found');
  return toMember(scValToNative(result) as Record<string, unknown>);
}

export async function getAllMembers(walletAddress: string, poolId: number): Promise<Member[]> {
  const args = [u32(poolId)];
  const result = await simulateOnly(POOL_CONTRACT_ID, walletAddress, 'get_all_members', args);
  if (!result) return [];
  const native = scValToNative(result) as Record<string, unknown>[];
  return native.map(toMember);
}

export async function getContribution(
  walletAddress: string,
  poolId: number,
  cycle: number,
  vendor: string
): Promise<Contribution | null> {
  const args = [u32(poolId), u32(cycle), addressToScVal(vendor)];
  const result = await simulateOnly(POOL_CONTRACT_ID, walletAddress, 'get_contribution', args);
  if (!result) return null;
  const native = scValToNative(result);
  if (native === null || native === undefined) return null;
  return toContribution(native as Record<string, unknown>);
}

export async function getEmergencyVoteInfo(
  walletAddress: string,
  poolId: number,
  drawId: number
): Promise<EmergencyVote> {
  const args = [u32(poolId), u32(drawId)];
  const result = await simulateOnly(POOL_CONTRACT_ID, walletAddress, 'get_emergency_vote_info', args);
  if (!result) throw new Error('Emergency vote not found');
  return toEmergencyVote(scValToNative(result) as Record<string, unknown>);
}

export function requiredEmergencyApprovals(memberCountSnapshot: number): number {
  return Math.floor(memberCountSnapshot / 2) + 1;
}

export { xdr };
