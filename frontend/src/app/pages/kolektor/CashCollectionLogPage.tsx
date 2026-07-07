import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, CheckCircle } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { listMarkets, type Market } from '../../data/marketsRepo';
import { listPoolsForMarket, type PoolMetadata } from '../../data/poolMetadataRepo';
import { logCashCollection, listLogsForPool } from '../../data/kolektorLogsRepo';
import { getPool, getAllMembers, getContribution, type Pool, type Member } from '../../contracts/poolContractService';
import { stroopsToXlm, shortAddress } from '../../lib/format';

interface PendingRow {
  member: Member;
  alreadyPaidOnChain: boolean;
}

export default function CashCollectionLogPage() {
  const { walletAddress } = useWallet();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [pools, setPools] = useState<PoolMetadata[]>([]);
  const [marketId, setMarketId] = useState('');
  const [poolId, setPoolId] = useState('');
  const [pool, setPool] = useState<Pool | null>(null);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loggedWallets, setLoggedWallets] = useState<Set<string>>(new Set());
  const [busyWallet, setBusyWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    listMarkets().then(setMarkets).catch(console.error);
  }, []);

  useEffect(() => {
    if (!marketId) {
      setPools([]);
      return;
    }
    listPoolsForMarket(marketId).then(setPools).catch(console.error);
  }, [marketId]);

  useEffect(() => {
    if (!poolId || !walletAddress) {
      setPool(null);
      setPending([]);
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        const chainPool = await getPool(walletAddress, Number(poolId));
        const members = await getAllMembers(walletAddress, Number(poolId));
        setPool(chainPool);

        const rows = await Promise.all(
          members.map(async (member) => {
            const contribution = await getContribution(walletAddress, Number(poolId), chainPool.currentCycle, member.address);
            return { member, alreadyPaidOnChain: contribution?.status === 'Paid' };
          })
        );
        setPending(rows.filter((r) => !r.alreadyPaidOnChain));

        const logs = await listLogsForPool(poolId);
        setLoggedWallets(new Set(logs.filter((l) => l.cycle_number === chainPool.currentCycle).map((l) => l.vendor_wallet)));
      } catch (err) {
        console.error('Failed to load pending collections:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [poolId, walletAddress]);

  async function handleLog(vendorWallet: string) {
    if (!pool || !marketId) return;
    setBusyWallet(vendorWallet);
    try {
      await logCashCollection({
        pool_id: poolId,
        market_id: marketId,
        kolektor_wallet: walletAddress,
        vendor_wallet: vendorWallet,
        cycle_number: pool.currentCycle,
        amount_php: null,
      });
      setLoggedWallets((prev) => new Set(prev).add(vendorWallet));
      toast.success('Collection logged ✓');
    } catch (err) {
      console.error(err);
      toast.error('Failed to log collection');
    } finally {
      setBusyWallet(null);
    }
  }

  const completedCount = pending.filter((p) => loggedWallets.has(p.member.address)).length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Cash Collection Log
        </h1>
        <p className="text-[#7A6F65] text-sm mt-1">Log cash payments you've collected — an admin will confirm them on-chain.</p>
      </div>

      <div className="flex gap-2">
        <select
          className="flex-1 h-11 px-3.5 rounded-xl border border-orange-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          value={marketId}
          onChange={(e) => {
            setMarketId(e.target.value);
            setPoolId('');
          }}
        >
          <option value="">Select market</option>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          className="flex-1 h-11 px-3.5 rounded-xl border border-orange-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          disabled={!marketId}
        >
          <option value="">Select pool</option>
          {pools.map((p) => (
            <option key={p.pool_id} value={p.pool_id}>
              {p.display_name}
            </option>
          ))}
        </select>
      </div>

      {pool && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
            <p className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
              {pending.length}
            </p>
            <p className="text-xs text-[#7A6F65]">Pending vendors</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
            <p className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
              {completedCount}
            </p>
            <p className="text-xs text-[#7A6F65]">Logged this cycle</p>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[#7A6F65] text-sm">Loading...</p>}

      {pool && (
        <div className="space-y-3">
          {pending.length === 0 && !isLoading && <p className="text-[#7A6F65] text-sm">Everyone has paid for this cycle.</p>}
          {pending.map(({ member }) => {
            const logged = loggedWallets.has(member.address);
            return (
              <div key={member.address} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-none">
                  <Banknote size={18} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#2D2A26] text-sm font-mono">{shortAddress(member.address)}</p>
                  <p className="text-xs text-[#7A6F65]">
                    {stroopsToXlm(pool.contributionAmount)} XLM · Cycle {pool.currentCycle + 1}
                  </p>
                </div>
                {logged ? (
                  <span className="flex-none flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    <CheckCircle size={12} />
                    Logged
                  </span>
                ) : (
                  <button
                    onClick={() => handleLog(member.address)}
                    disabled={busyWallet === member.address}
                    className="flex-none text-xs bg-orange-500 text-white px-3 py-1.5 rounded-full font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    Log Collection
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
