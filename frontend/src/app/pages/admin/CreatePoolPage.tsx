import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import { createPool } from '../../contracts/poolContractService';
import { getNativeAssetContractId } from '../../contracts/networkConfig';
import { createPoolMetadata } from '../../data/poolMetadataRepo';

const XLM_STROOPS = 10_000_000n;

type CycleType = 'Daily' | 'Weekly';

const TYPE_DEFAULTS: Record<CycleType, { amount: number; cycleDays: number; maxMembers: number }> = {
  Daily: { amount: 5, cycleDays: 1, maxMembers: 10 },
  Weekly: { amount: 20, cycleDays: 7, maxMembers: 8 },
};

export default function CreatePoolPage() {
  const { walletAddress } = useWallet();
  const { adminMarket } = useSession();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<CycleType>('Daily');
  const [contributionXlm, setContributionXlm] = useState(String(TYPE_DEFAULTS.Daily.amount));
  const [maxMembers, setMaxMembers] = useState(String(TYPE_DEFAULTS.Daily.maxMembers));
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTypeChange(t: CycleType) {
    setType(t);
    setContributionXlm(String(TYPE_DEFAULTS[t].amount));
    setMaxMembers(String(TYPE_DEFAULTS[t].maxMembers));
  }

  async function handleCreate() {
    if (!adminMarket || !displayName) return;
    setIsSubmitting(true);
    try {
      const cycleDays = TYPE_DEFAULTS[type].cycleDays;
      const contributionAmount = BigInt(Math.round(Number(contributionXlm) * Number(XLM_STROOPS)));
      const cycleLengthSecs = BigInt(cycleDays * 86_400);
      const poolId = await createPool(walletAddress, adminMarket.id, contributionAmount, cycleLengthSecs, Number(maxMembers), getNativeAssetContractId());
      await createPoolMetadata({
        pool_id: String(poolId),
        market_id: adminMarket.id,
        display_name: displayName,
        description: null,
        created_by: walletAddress,
      });
      toast.success(`Pool "${displayName}" created ✓`);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to create pool');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-1">
      <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
        Create New Pool
      </h1>
      <p className="text-[#7A6F65] text-sm mb-5">Sensible defaults below — adjust before submitting.</p>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#7A6F65]">Pool Name</label>
          <input
            className="w-full mt-1.5 h-11 px-3.5 rounded-xl border border-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Morning Suki Circle"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[#7A6F65] block mb-1.5">Cycle Type</label>
          <div className="flex bg-orange-50 rounded-xl p-1 gap-1">
            {(['Daily', 'Weekly'] as CycleType[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  type === t ? 'bg-white text-orange-600 shadow-sm' : 'text-[#7A6F65]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-[#7A6F65]">Contribution (XLM)</label>
            <input
              type="number"
              min={1}
              className="w-full mt-1.5 h-11 px-3.5 rounded-xl border border-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              value={contributionXlm}
              onChange={(e) => setContributionXlm(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-[#7A6F65]">Max Members</label>
            <input
              type="number"
              min={2}
              className="w-full mt-1.5 h-11 px-3.5 rounded-xl border border-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={isSubmitting || !displayName || !adminMarket}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <Plus size={18} />
          {isSubmitting ? 'Creating...' : 'Create Pool'}
        </button>
        {!adminMarket && <p className="text-xs text-red-500">No market is registered to this wallet.</p>}
      </div>
    </div>
  );
}
