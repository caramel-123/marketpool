import { nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { REPUTATION_CONTRACT_ID } from './reputationContractConfig';
import {
  addressToScVal,
  assertAddress,
  buildAndSubmit,
  normalizeEnumTag,
  scValToNative,
  simulateOnly,
} from './sorobanClient';

export type BadgeType = 'Bronze' | 'Silver' | 'Gold';

export interface ReputationScore {
  vendor: string;
  cleanCycles: number;
  missedCount: number;
  adjustedCount: number;
  totalEvents: number;
  score: bigint;
  lastUpdated: bigint;
}

export interface ReputationEvent {
  vendor: string;
  poolId: number;
  cycle: number;
  eventType: string;
  timestamp: bigint;
}

// Unit-variant `#[contracttype]` enums serialize as a one-element vec of a
// symbol (matches BalikBayan's BillType encoding) -- needed here because
// `mint_badge` takes a BadgeType as an *input* argument, not just a return
// value that scValToNative can decode for us.
function badgeTypeToScVal(badgeType: BadgeType): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(badgeType)]);
}

function toScore(raw: Record<string, unknown>): ReputationScore {
  return {
    vendor: String(raw.vendor),
    cleanCycles: Number(raw.clean_cycles),
    missedCount: Number(raw.missed_count),
    adjustedCount: Number(raw.adjusted_count),
    totalEvents: Number(raw.total_events),
    score: BigInt(String(raw.score)),
    lastUpdated: BigInt(String(raw.last_updated)),
  };
}

function toEvent(raw: Record<string, unknown>): ReputationEvent {
  return {
    vendor: String(raw.vendor),
    poolId: Number(raw.pool_id),
    cycle: Number(raw.cycle),
    eventType: normalizeEnumTag(raw.event_type),
    timestamp: BigInt(String(raw.timestamp)),
  };
}

export async function getScore(walletAddress: string, vendor: string): Promise<ReputationScore> {
  const args = [addressToScVal(vendor)];
  const result = await simulateOnly(REPUTATION_CONTRACT_ID, walletAddress, 'get_score', args);
  if (!result) throw new Error('No return value from get_score');
  return toScore(scValToNative(result) as Record<string, unknown>);
}

export async function getBadges(walletAddress: string, vendor: string): Promise<BadgeType[]> {
  const args = [addressToScVal(vendor)];
  const result = await simulateOnly(REPUTATION_CONTRACT_ID, walletAddress, 'get_badges', args);
  if (!result) return [];
  const native = scValToNative(result) as unknown[];
  return native.map((v) => normalizeEnumTag(v) as BadgeType);
}

export async function mintBadge(
  walletAddress: string,
  vendor: string,
  badgeType: BadgeType
): Promise<boolean> {
  assertAddress(walletAddress, 'Wallet');
  const args = [addressToScVal(vendor), badgeTypeToScVal(badgeType)];
  const result = await buildAndSubmit(REPUTATION_CONTRACT_ID, walletAddress, 'mint_badge', args);
  return result ? Boolean(scValToNative(result)) : false;
}

export async function getEventCount(walletAddress: string, vendor: string): Promise<number> {
  const args = [addressToScVal(vendor)];
  const result = await simulateOnly(REPUTATION_CONTRACT_ID, walletAddress, 'get_event_count', args);
  return result ? Number(scValToNative(result)) : 0;
}

export async function getEvent(
  walletAddress: string,
  vendor: string,
  index: number
): Promise<ReputationEvent> {
  const args = [addressToScVal(vendor), nativeToScVal(index, { type: 'u32' })];
  const result = await simulateOnly(REPUTATION_CONTRACT_ID, walletAddress, 'get_event', args);
  if (!result) throw new Error('Event not found');
  return toEvent(scValToNative(result) as Record<string, unknown>);
}

export async function getRecentEvents(
  walletAddress: string,
  vendor: string,
  limit = 20
): Promise<ReputationEvent[]> {
  const count = await getEventCount(walletAddress, vendor);
  const startIndex = Math.max(0, count - limit);
  const events: ReputationEvent[] = [];
  for (let i = count - 1; i >= startIndex; i--) {
    events.push(await getEvent(walletAddress, vendor, i));
  }
  return events;
}

export const BADGE_THRESHOLDS: Record<BadgeType, number> = {
  Bronze: 5,
  Silver: 10,
  Gold: 20,
};
