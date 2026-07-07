import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wallet, CheckCircle } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import { getPool, getContribution, contribute, type Pool, type Contribution } from '../../contracts/poolContractService';
import { getPoolMetadata } from '../../data/poolMetadataRepo';
import { getXlmBalance } from '../../contracts/networkConfig';
import { stroopsToXlm, shortAddress } from '../../lib/format';

const STATUS_STYLE: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700',
  Missed: 'bg-red-100 text-red-600',
  Adjusted: 'bg-amber-100 text-amber-700',
};

export default function ContributePage() {
  const { walletAddress } = useWallet();
  const { activePoolId } = useSession();
  const navigate = useNavigate();

  const [pool, setPool] = useState<Pool | null>(null);
  const [poolName, setPoolName] = useState('');
  const [history, setHistory] = useState<Contribution[]>([]);
  const [paid, setPaid] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justPaidTx, setJustPaidTx] = useState<string | null>(null);

  async function load() {
    if (!activePoolId || !walletAddress) return;
    const [chainPool, metadata, xlm] = await Promise.all([
      getPool(walletAddress, Number(activePoolId)),
      getPoolMetadata(activePoolId),
      getXlmBalance(walletAddress),
    ]);
    setPool(chainPool);
    setPoolName(metadata?.display_name ?? '');
    setBalance(xlm);

    const entries: Contribution[] = [];
    for (let cycle = 0; cycle <= chainPool.currentCycle; cycle++) {
      const c = await getContribution(walletAddress, Number(activePoolId), cycle, walletAddress);
      if (c) entries.push(c);
    }
    setHistory(entries.reverse());
    setPaid(entries.some((c) => c.cycle === chainPool.currentCycle));
  }

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoolId, walletAddress]);

  async function handleContribute() {
    if (!activePoolId || !pool) return;
    setIsSubmitting(true);
    try {
      await contribute(walletAddress, Number(activePoolId), pool.contributionAmount);
      setJustPaidTx(`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
      toast.success('Contribution sent!');
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Contribution failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!pool) {
    return <p className="p-6 text-[#7A6F65] text-sm">Loading...</p>;
  }

  if (justPaidTx) {
    return (
      <div className="p-4 md:p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-green-100">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#2D2A26] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Contribution Sent!
        </h2>
        <p className="text-[#7A6F65] mb-1">
          {stroopsToXlm(pool.contributionAmount)} XLM contributed to
        </p>
        <p className="font-semibold text-[#2D2A26] mb-7">{poolName}</p>
        <div className="bg-white border border-green-100 rounded-2xl p-5 w-full text-left mb-6 shadow-sm">
          {[
            ['From', justPaidTx],
            ['Amount', `${stroopsToXlm(pool.contributionAmount)} XLM`],
            ['Pool', poolName],
            ['Cycle', `${pool.currentCycle + 1}`],
            ['Status', 'Confirmed ✓'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-2 border-b border-orange-50 last:border-0 text-sm">
              <span className="text-[#7A6F65]">{k}</span>
              <span className={`font-medium ${k === 'Status' ? 'text-green-600' : 'text-[#2D2A26]'} font-mono text-xs`}>{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setJustPaidTx(null);
            navigate('/pool');
          }}
          className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-semibold hover:bg-orange-600 transition-colors"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Make Contribution
        </h1>
        <p className="text-[#7A6F65] text-sm">
          {poolName} · Cycle {pool.currentCycle + 1}
        </p>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-3xl p-8 text-white text-center shadow-lg shadow-orange-200/60">
        <p className="text-orange-100 text-sm mb-3">Amount Due This Cycle</p>
        <div className="flex items-end justify-center gap-2 mb-1">
          <span className="text-6xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            {stroopsToXlm(pool.contributionAmount)}
          </span>
          <span className="text-2xl mb-2 text-orange-100">XLM</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
        <p className="text-xs text-[#7A6F65] mb-1">Contributing to</p>
        <p className="font-semibold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          {poolName}
        </p>
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-orange-50 text-xs text-[#7A6F65]">
          <span>Cycle {pool.currentCycle + 1}</span>
          <span>•</span>
          <span>Exact amount only — no partial payments</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
        <p className="text-xs text-[#7A6F65] mb-3">Payment Method</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-none">
            <Wallet size={18} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[#2D2A26] text-sm">Freighter Wallet</p>
            <p className="text-xs text-[#7A6F65] font-mono">{shortAddress(walletAddress)}</p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{balance.toFixed(2)} XLM</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
        <p className="font-semibold text-[#2D2A26] text-sm mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Recent Contributions
        </p>
        {history.length === 0 && <p className="text-sm text-[#7A6F65] py-2">No contributions yet.</p>}
        {history.map((h) => (
          <div key={h.cycle} className="flex items-center justify-between py-2.5 border-b border-orange-50 last:border-0">
            <span className="text-sm text-[#7A6F65]">Cycle {h.cycle + 1}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#2D2A26]">{stroopsToXlm(h.amount)} XLM</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[h.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {h.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {paid ? (
        <div className="w-full flex items-center justify-center gap-2 bg-green-100 text-green-700 py-3.5 rounded-2xl font-semibold">
          <CheckCircle size={18} />
          Paid for this cycle ✓
        </div>
      ) : (
        <button
          onClick={handleContribute}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-orange-200/60 text-base disabled:opacity-70"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isSubmitting ? 'Sending...' : `Confirm Contribution — ${stroopsToXlm(pool.contributionAmount)} XLM`}
        </button>
      )}
    </div>
  );
}
