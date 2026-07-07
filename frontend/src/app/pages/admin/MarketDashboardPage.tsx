import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Coins, Users, Scale, Plus } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import { listPoolsForMarket, type PoolMetadata } from '../../data/poolMetadataRepo';
import { listDisputesForMarket, type DisputeReport } from '../../data/disputeReportsRepo';
import { getPool, type Pool } from '../../contracts/poolContractService';
import { stroopsToXlm, cycleLabel, cycleDays } from '../../lib/format';

export default function MarketDashboardPage() {
  const { walletAddress } = useWallet();
  const { adminMarket } = useSession();
  const navigate = useNavigate();
  const [pools, setPools] = useState<Array<{ metadata: PoolMetadata; pool: Pool }>>([]);
  const [disputes, setDisputes] = useState<DisputeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!adminMarket) return;
    (async () => {
      setIsLoading(true);
      try {
        const [metadataRows, disputeRows] = await Promise.all([
          listPoolsForMarket(adminMarket.id),
          listDisputesForMarket(adminMarket.id),
        ]);
        setDisputes(disputeRows.filter((d) => d.status === 'open' || d.status === 'under_review'));
        const withOnChain = await Promise.all(
          metadataRows.map(async (metadata) => ({ metadata, pool: await getPool(walletAddress, Number(metadata.pool_id)) }))
        );
        setPools(withOnChain);
      } catch (err) {
        console.error('Failed to load market dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [adminMarket, walletAddress]);

  if (!adminMarket) {
    return <p className="p-6 text-[#7A6F65] text-sm">No market is registered to this wallet.</p>;
  }

  const totalPooled = pools.reduce((sum, { pool }) => sum + Number(pool.contributionAmount) * pool.memberCount, 0);
  const vendorCountEstimate = pools.reduce((sum, { pool }) => sum + pool.memberCount, 0);

  const stats = [
    { icon: Wallet, label: 'Active Pools', value: String(pools.length), bg: 'bg-orange-100', color: 'text-orange-500' },
    { icon: Coins, label: 'Total Pooled', value: `${(totalPooled / 10_000_000).toFixed(0)} XLM`, bg: 'bg-green-100', color: 'text-green-600' },
    { icon: Users, label: 'Active Vendors', value: String(vendorCountEstimate), bg: 'bg-amber-100', color: 'text-amber-600' },
    { icon: Scale, label: 'Open Disputes', value: String(disputes.length), bg: 'bg-red-100', color: 'text-red-500' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Market Dashboard
        </h1>
        <p className="text-[#7A6F65] text-sm mt-1">{adminMarket.name} · overview of active pools</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
              {s.value}
            </p>
            <p className="text-xs text-[#7A6F65] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Pools
        </h2>
        <button
          onClick={() => navigate('/admin/pools/new')}
          className="flex items-center gap-1.5 text-sm bg-orange-50 text-orange-600 px-3.5 py-2 rounded-xl font-medium hover:bg-orange-100 transition-colors"
        >
          <Plus size={15} />
          Create Pool
        </button>
      </div>

      {isLoading && <p className="text-[#7A6F65] text-sm">Loading...</p>}

      <div className="space-y-3">
        {pools.map(({ metadata, pool }) => {
          const pct = pool.maxMembers > 0 ? Math.round((pool.memberCount / pool.maxMembers) * 100) : 0;
          return (
            <div key={metadata.pool_id} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <p className="font-semibold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {metadata.display_name}
                  </p>
                  <p className="text-xs text-[#7A6F65] mt-0.5">
                    {stroopsToXlm(pool.contributionAmount)} XLM · every {cycleDays(pool.cycleLengthSecs)} day(s)
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cycleLabel(pool.cycleLengthSecs) === 'Daily' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {cycleLabel(pool.cycleLengthSecs)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#7A6F65] mb-1.5">
                <span>Members</span>
                <span>
                  {pool.memberCount}/{pool.maxMembers}
                </span>
              </div>
              <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {!isLoading && pools.length === 0 && <p className="text-[#7A6F65] text-sm">No pools yet — create one to get started.</p>}
      </div>
    </div>
  );
}
