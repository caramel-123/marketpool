import { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import { listVendorsForMarket, type Vendor } from '../../data/vendorsRepo';
import { getScore } from '../../contracts/reputationContractService';

interface VouchCandidate {
  vendor: Vendor;
  note: string;
}

export default function VouchForVendorPage() {
  const { walletAddress } = useWallet();
  const { vendorProfile } = useSession();
  const [candidates, setCandidates] = useState<VouchCandidate[]>([]);
  const [vouched, setVouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!vendorProfile?.market_id || !walletAddress) return;
    (async () => {
      setIsLoading(true);
      try {
        const vendors = (await listVendorsForMarket(vendorProfile.market_id!)).filter((v) => v.wallet_address !== walletAddress);
        const withNotes = await Promise.all(
          vendors.map(async (vendor) => {
            const score = await getScore(walletAddress, vendor.wallet_address).catch(() => null);
            const note =
              score && score.totalEvents === 0
                ? `New vendor${vendor.stall_number ? ` · Stall ${vendor.stall_number}` : ''} · no score yet`
                : 'Needs a guarantor to join';
            return { vendor, note };
          })
        );
        setCandidates(withNotes);
      } catch (err) {
        console.error('Failed to load vouch candidates:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [vendorProfile?.market_id, walletAddress]);

  function toggleVouch(id: string) {
    setVouched((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Vouch for a Vendor
        </h1>
        <p className="text-[#7A6F65] text-sm mt-1">Help a new vendor join — this is informational only, it doesn't affect your score.</p>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-[#7A6F65] text-sm">Loading...</p>}
        {!isLoading && candidates.length === 0 && <p className="text-[#7A6F65] text-sm">No other vendors in your market yet.</p>}
        {candidates.map(({ vendor, note }) => (
          <div key={vendor.id} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-none">
              <UserCheck size={20} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2D2A26] text-sm truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                {vendor.display_name}
              </p>
              <p className="text-xs text-[#7A6F65] truncate">{note}</p>
            </div>
            <button
              onClick={() => toggleVouch(vendor.id)}
              className={`flex-none text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                vouched[vendor.id] ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {vouched[vendor.id] ? 'Vouched ✓' : 'Vouch'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
