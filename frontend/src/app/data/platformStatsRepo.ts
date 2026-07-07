import { listMarkets } from './marketsRepo';
import { listAllPoolMetadata } from './poolMetadataRepo';
import { getPool } from '../contracts/poolContractService';
import { PUBLIC_READ_ACCOUNT } from '../contracts/networkConfig';
import { stroopsToXlm } from '../lib/format';

export interface PlatformStats {
  marketCount: number;
  poolCount: number;
  memberCount: number;
  totalPooledXlm: string;
}

/**
 * Real, live platform stats for the landing page -- no fabricated marketing
 * numbers. Markets/pools come from Supabase's public-read tables; member
 * counts and pooled totals are read live from the deployed contracts using
 * a public read-only account as the simulation source (no wallet needed).
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [markets, pools] = await Promise.all([listMarkets(), listAllPoolMetadata()]);

  let memberCount = 0;
  let totalPooledStroops = 0n;

  await Promise.all(
    pools.map(async (p) => {
      try {
        const pool = await getPool(PUBLIC_READ_ACCOUNT, Number(p.pool_id));
        memberCount += pool.memberCount;
        totalPooledStroops += pool.contributionAmount * BigInt(pool.memberCount);
      } catch {
        // Pool may not exist on-chain (e.g. stale metadata row) -- skip it.
      }
    })
  );

  return {
    marketCount: markets.length,
    poolCount: pools.length,
    memberCount,
    totalPooledXlm: stroopsToXlm(totalPooledStroops),
  };
}
