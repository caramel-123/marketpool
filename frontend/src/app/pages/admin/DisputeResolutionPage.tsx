import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import { listDisputesForMarket, resolveDispute, type DisputeReport } from '../../data/disputeReportsRepo';
import { markAdjustedContribution } from '../../contracts/poolContractService';

export default function DisputeResolutionPage() {
  const { walletAddress } = useWallet();
  const { adminMarket } = useSession();
  const [disputes, setDisputes] = useState<DisputeReport[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!adminMarket) return;
    listDisputesForMarket(adminMarket.id).then(setDisputes).catch(console.error);
  }, [adminMarket]);

  async function handleResolve(dispute: DisputeReport) {
    setBusyId(dispute.id);
    try {
      if (dispute.against_wallet && dispute.cycle_number !== null) {
        await markAdjustedContribution(walletAddress, Number(dispute.pool_id), dispute.against_wallet, dispute.cycle_number, 0n);
      }
      const updated = await resolveDispute(dispute.id, 'resolved', 'Resolved by admin.');
      setDisputes((prev) => prev.map((d) => (d.id === dispute.id ? updated : d)));
      toast.success('Dispute resolved ✓');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to resolve dispute');
    } finally {
      setBusyId(null);
    }
  }

  if (!adminMarket) {
    return <p className="p-6 text-[#7A6F65] text-sm">No market is registered to this wallet.</p>;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Dispute Resolution
        </h1>
        <p className="text-[#7A6F65] text-sm mt-1">Reported disagreements across your market's pools.</p>
      </div>

      <div className="space-y-3">
        {disputes.length === 0 && <p className="text-[#7A6F65] text-sm">No disputes filed.</p>}
        {disputes.map((d) => {
          const isOpen = d.status === 'open' || d.status === 'under_review';
          return (
            <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#2D2A26] font-mono text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                    {d.against_wallet ? `${d.against_wallet.slice(0, 6)}...${d.against_wallet.slice(-4)}` : d.reported_by.slice(0, 10)}
                  </p>
                  <p className="text-xs text-[#7A6F65] mt-0.5">Pool #{d.pool_id}</p>
                  <p className="text-sm text-[#2D2A26] mt-2 leading-relaxed">{d.description}</p>
                </div>
                <span className={`flex-none text-xs px-2.5 py-1 rounded-full font-medium ${isOpen ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {isOpen ? 'Open' : 'Resolved'}
                </span>
              </div>
              {isOpen && (
                <button
                  onClick={() => handleResolve(d)}
                  disabled={busyId === d.id}
                  className="mt-3 flex items-center gap-1.5 text-xs bg-orange-500 text-white px-3.5 py-2 rounded-full font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Check size={14} />
                  Resolve
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
