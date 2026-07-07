import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import { listPoolsForMarket, type PoolMetadata } from '../../data/poolMetadataRepo';
import { getMarket } from '../../data/marketsRepo';
import { getPool, joinPool, type Pool } from '../../contracts/poolContractService';
import { getScore } from '../../contracts/reputationContractService';
import { stroopsToXlm, cycleDays } from '../../lib/format';

type CycleFilter = 'All' | 'Daily' | 'Weekly' | 'Monthly';

function cycleFilterFor(days: number): Exclude<CycleFilter, 'All'> {
  if (days <= 1) return 'Daily';
  if (days <= 7) return 'Weekly';
  return 'Monthly';
}

export default function PoolsBrowsePage() {
  const { walletAddress } = useWallet();
  const { vendorProfile, setActivePoolId } = useSession();

  const [pools, setPools] = useState<Array<{ metadata: PoolMetadata; pool: Pool }>>([]);
  const [marketName, setMarketName] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CycleFilter>('All');
  const [needsGuarantor, setNeedsGuarantor] = useState(false);
  const [guarantorAddress, setGuarantorAddress] = useState('');
  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vendorProfile?.market_id || !walletAddress) return;
    setIsLoading(true);
    try {
      const [metadataRows, score, market] = await Promise.all([
        listPoolsForMarket(vendorProfile.market_id),
        getScore(walletAddress, walletAddress),
        getMarket(vendorProfile.market_id),
      ]);
      setNeedsGuarantor(score.totalEvents === 0);
      setMarketName(market?.name ?? '');
      const withOnChain = await Promise.all(
        metadataRows.map(async (meta) => ({ metadata: meta, pool: await getPool(walletAddress, Number(meta.pool_id)) }))
      );
      setPools(withOnChain);
    } catch (err) {
      console.error('Failed to load pools:', err);
    } finally {
      setIsLoading(false);
    }
  }, [vendorProfile?.market_id, walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleJoin(poolId: string) {
    if (needsGuarantor && !guarantorAddress) {
      toast.error("You're new here — a guarantor's wallet address is needed to join.");
      return;
    }
    setJoiningPoolId(poolId);
    try {
      await joinPool(walletAddress, Number(poolId), needsGuarantor ? guarantorAddress : null);
      setActivePoolId(poolId);
      toast.success('Joined the pool! 🎉');
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to join pool');
    } finally {
      setJoiningPoolId(null);
    }
  }

  const filtered = pools.filter(({ metadata, pool }) => {
    const days = cycleDays(pool.cycleLengthSecs);
    const matchesFilter = filter === 'All' || cycleFilterFor(days) === filter;
    const q = search.toLowerCase();
    const matchesSearch = q === '' || metadata.display_name.toLowerCase().includes(q) || marketName.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Browse Pools
        </h1>
        <p className="text-[#7A6F65] text-sm">Find the right savings pool for you</p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6F65]" />
        <input
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-orange-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-[#2D2A26] placeholder-[#7A6F65]"
          placeholder="Search pools or markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['All', 'Daily', 'Weekly', 'Monthly'] as CycleFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-none px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-[#7A6F65] border border-orange-100 hover:border-orange-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {needsGuarantor && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
          <label className="text-xs font-semibold text-[#7A6F65]">
            You're new here — enter a guarantor's wallet address to join
          </label>
          <input
            placeholder="G..."
            value={guarantorAddress}
            onChange={(e) => setGuarantorAddress(e.target.value)}
            className="w-full mt-1.5 h-11 px-3.5 rounded-xl border border-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-[#7A6F65] text-sm">Loading pools...</p>}
        {!isLoading &&
          filtered.map(({ metadata, pool }) => {
            const pct = pool.maxMembers > 0 ? Math.round((pool.memberCount / pool.maxMembers) * 100) : 0;
            const full = pool.memberCount >= pool.maxMembers;
            return (
              <div key={metadata.pool_id} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-[#2D2A26] text-sm truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {metadata.display_name}
                    </p>
                    <p className="text-xs text-[#7A6F65] mt-0.5">{marketName}</p>
                  </div>
                  <button
                    onClick={() => handleJoin(metadata.pool_id)}
                    disabled={full || joiningPoolId === metadata.pool_id}
                    className="flex-none text-xs bg-orange-500 text-white px-3 py-1.5 rounded-full font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {joiningPoolId === metadata.pool_id ? 'Joining...' : full ? 'Full' : 'Join'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div>
                    <p className="text-sm font-semibold text-[#2D2A26]">{stroopsToXlm(pool.contributionAmount)} XLM</p>
                    <p className="text-xs text-[#7A6F65]">/{cycleFilterFor(cycleDays(pool.cycleLengthSecs)).toLowerCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2D2A26]">
                      {pool.memberCount}/{pool.maxMembers}
                    </p>
                    <p className="text-xs text-[#7A6F65]">members</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2D2A26]">{cycleFilterFor(cycleDays(pool.cycleLengthSecs))}</p>
                    <p className="text-xs text-[#7A6F65]">cycle</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-[#7A6F65] mb-1.5">
                    <span>Cycle {pool.currentCycle + 1}</span>
                    <span>{pct}% full</span>
                  </div>
                  <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-orange-400" />
            </div>
            <p className="text-[#2D2A26] font-medium">No pools found</p>
            <p className="text-[#7A6F65] text-sm mt-1">Try a different search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
