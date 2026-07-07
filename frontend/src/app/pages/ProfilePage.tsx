import { useEffect, useState } from 'react';
import { Wallet, Star, LayoutGrid, Shield, Award, BarChart2, LogOut, Repeat } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useSession } from '../context/SessionContext';
import { getScore, getBadges, type BadgeType } from '../contracts/reputationContractService';
import { getXlmBalance } from '../contracts/networkConfig';
import { shortAddress } from '../lib/format';

export default function ProfilePage() {
  const { walletAddress, disconnectWallet } = useWallet();
  const { activeRole, setActiveRole, vendorProfile, adminMarket } = useSession();

  const [balance, setBalance] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [badges, setBadges] = useState<BadgeType[]>([]);

  useEffect(() => {
    if (!walletAddress) return;
    getXlmBalance(walletAddress).then(setBalance);
    if (activeRole === 'vendor') {
      getScore(walletAddress, walletAddress).then((s) => setScore(s.score !== undefined ? Number(s.score) : null));
      getBadges(walletAddress, walletAddress).then(setBadges);
    }
  }, [walletAddress, activeRole]);

  const displayName = vendorProfile?.display_name ?? adminMarket?.name ?? shortAddress(walletAddress);
  const initials = displayName.slice(0, 2).toUpperCase();
  const currentTier = (['Gold', 'Silver', 'Bronze'] as BadgeType[]).find((t) => badges.includes(t)) ?? 'Unranked';

  const menuItems = [
    { icon: Wallet, label: 'Wallet', sub: `${balance.toFixed(2)} XLM · ${shortAddress(walletAddress)}` },
    ...(activeRole === 'vendor'
      ? [
          { icon: Star, label: 'Reputation Details', sub: score !== null ? `Score: ${score} · ${currentTier} Tier` : 'Loading...' },
          { icon: LayoutGrid, label: 'Pools', sub: 'Browse and manage your pools' },
          { icon: Shield, label: 'Vouched Vendors', sub: 'Vendors you have vouched for' },
          { icon: Award, label: 'Achievements', sub: `${badges.length} of 3 badges earned` },
          { icon: BarChart2, label: 'Contribution History', sub: 'View your payment history' },
        ]
      : []),
    ...(activeRole === 'admin' ? [{ icon: BarChart2, label: 'Market Dashboard', sub: adminMarket?.name ?? 'Your market' }] : []),
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Profile
        </h1>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-3xl p-5 text-white shadow-lg shadow-orange-200/60">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl bg-white/25 flex items-center justify-center text-white text-2xl font-bold flex-none"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-xl" style={{ fontFamily: 'var(--font-heading)' }}>
              {displayName}
            </h2>
            <p className="text-orange-100 text-sm capitalize">{activeRole}</p>
            {vendorProfile?.stall_number && <p className="text-orange-100 text-xs">Stall {vendorProfile.stall_number}</p>}
          </div>
        </div>
        <div className="bg-white/15 rounded-xl p-2.5 flex items-center gap-2 mb-4">
          <Wallet size={14} className="text-orange-100 flex-none" />
          <p className="text-orange-100 text-xs font-mono truncate">{walletAddress}</p>
        </div>
        {activeRole === 'vendor' && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: badges.length ? String(badges.length) : '0', label: 'Badges' },
              { val: score !== null ? String(score) : '—', label: 'Score' },
              { val: currentTier, label: 'Tier' },
            ].map((s) => (
              <div key={s.label} className="bg-white/20 rounded-xl p-2.5 text-center">
                <p className="font-bold text-sm truncate">{s.val}</p>
                <p className="text-orange-100 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {menuItems.map((item) => (
        <button
          key={item.label}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-orange-50 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-none">
            <item.icon size={18} className="text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#2D2A26] text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
              {item.label}
            </p>
            <p className="text-xs text-[#7A6F65] truncate">{item.sub}</p>
          </div>
        </button>
      ))}

      <button
        onClick={() => setActiveRole(null)}
        className="w-full flex items-center justify-center gap-2 text-orange-600 border-2 border-orange-100 rounded-2xl py-3.5 font-medium hover:bg-orange-50 transition-colors"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        <Repeat size={18} />
        Switch Role
      </button>

      <button
        onClick={() => disconnectWallet()}
        className="w-full flex items-center justify-center gap-2 text-red-500 border-2 border-red-100 rounded-2xl py-3.5 font-medium hover:bg-red-50 transition-colors"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        <LogOut size={18} />
        Disconnect Wallet
      </button>
    </div>
  );
}
