import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Wallet, CheckCircle, TrendingUp, Coins, ArrowUpCircle, AlertCircle, Star, Shield, Check, Users, Clock } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getPoolMetadata, type PoolMetadata } from '../../data/poolMetadataRepo';
import { listMarkets, type Market } from '../../data/marketsRepo';
import { upsertVendorProfile } from '../../data/vendorsRepo';
import { getPool, getAllMembers, getContribution, requestDraw, type Pool, type Member } from '../../contracts/poolContractService';
import { getScore, getRecentEvents, type ReputationScore, type ReputationEvent } from '../../contracts/reputationContractService';
import { getXlmBalance } from '../../contracts/networkConfig';
import { stroopsToXlm, shortAddress } from '../../lib/format';
import { toast } from 'sonner';

const EVENT_TEXT: Record<string, string> = {
  CycleCompleted: 'Contributed on time — cycle completed cleanly',
  Defaulted: 'Missed a contribution',
  Adjusted: 'A contribution was adjusted by the admin',
  GuarantorVouch: 'Vouched for another vendor',
  BadgeEarned: 'Earned a reputation badge',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function PoolDashboardPage() {
  const { walletAddress } = useWallet();
  const { vendorProfile, activePoolId, refreshProfile } = useSession();
  const navigate = useNavigate();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [stallNumber, setStallNumber] = useState('');
  const [marketId, setMarketId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [metadata, setMetadata] = useState<PoolMetadata | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [score, setScore] = useState<ReputationScore | null>(null);
  const [events, setEvents] = useState<ReputationEvent[]>([]);
  const [balance, setBalance] = useState(0);
  const [paidThisCycle, setPaidThisCycle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (vendorProfile === null) {
      listMarkets().then(setMarkets).catch(console.error);
    }
  }, [vendorProfile]);

  const load = useCallback(async () => {
    if (!walletAddress || !activePoolId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [meta, chainPool, chainMembers, rep, recentEvents, xlm] = await Promise.all([
        getPoolMetadata(activePoolId),
        getPool(walletAddress, Number(activePoolId)),
        getAllMembers(walletAddress, Number(activePoolId)),
        getScore(walletAddress, walletAddress),
        getRecentEvents(walletAddress, walletAddress, 5),
        getXlmBalance(walletAddress),
      ]);
      setMetadata(meta);
      setPool(chainPool);
      setMembers(chainMembers);
      setScore(rep);
      setEvents(recentEvents);
      setBalance(xlm);
      const contribution = await getContribution(walletAddress, Number(activePoolId), chainPool.currentCycle, walletAddress);
      setPaidThisCycle(contribution?.status === 'Paid' || contribution?.status === 'Adjusted');
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, activePoolId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveVendorProfile() {
    if (!displayName || !marketId) return;
    setIsSaving(true);
    try {
      await upsertVendorProfile({
        wallet_address: walletAddress,
        display_name: displayName,
        stall_number: stallNumber || null,
        market_id: marketId,
      });
      await refreshProfile();
      toast.success('Profile saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRequestDraw() {
    if (!activePoolId) return;
    setIsDrawing(true);
    try {
      await requestDraw(walletAddress, Number(activePoolId));
      toast.success('Draw executed! Funds sent to your wallet.');
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to draw');
    } finally {
      setIsDrawing(false);
    }
  }

  // ---- Vendor profile not yet created ----
  if (vendorProfile === null) {
    return (
      <div className="p-4 md:p-6 max-w-md mx-auto space-y-4">
        <div className="pt-1">
          <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
            Complete your profile
          </h1>
          <p className="text-[#7A6F65] text-sm">Tell us a bit about your stall</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50 space-y-4">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="stallNumber">Stall number (optional)</Label>
            <Input id="stallNumber" value={stallNumber} onChange={(e) => setStallNumber(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="market">Market</Label>
            <select
              id="market"
              className="w-full mt-1.5 h-11 px-3.5 rounded-xl border border-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
            >
              <option value="">Select a market</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={saveVendorProfile}
            disabled={isSaving || !displayName || !marketId}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // ---- No active pool yet ----
  if (!activePoolId) {
    return (
      <div className="p-4 md:p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet size={26} className="text-orange-500" />
        </div>
        <h2 className="text-lg font-bold text-[#2D2A26] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          You haven't joined a pool yet
        </h2>
        <p className="text-[#7A6F65] text-sm mb-6">Browse pools in your market and join one to get started.</p>
        <Link
          to="/pools"
          className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-orange-600 transition-colors no-underline"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Browse Pools
        </Link>
      </div>
    );
  }

  if (isLoading || !pool || !score) {
    return <p className="p-6 text-[#7A6F65] text-sm">Loading your dashboard...</p>;
  }

  const roundPosition = pool.memberCount > 0 ? pool.currentCycle % pool.memberCount : 0;
  const isMyTurn = members.find((m) => m.address === walletAddress)?.drawPosition === roundPosition;
  const currentMember = members.find((m) => m.drawPosition === roundPosition);
  const totalTracked = score.cleanCycles + score.missedCount + score.adjustedCount;
  const poolBalance = Number(pool.contributionAmount) * pool.memberCount;
  const pct = pool.memberCount > 0 ? Math.round((roundPosition / pool.memberCount) * 100) : 0;

  const quickActions = [
    { label: 'Contribute', icon: ArrowUpCircle, bg: 'from-orange-500 to-orange-400', to: '/pool/contribute' },
    { label: 'Emergency Draw', icon: AlertCircle, bg: 'from-red-500 to-red-400', to: '/pool/emergency-draw' },
    { label: 'View Reputation', icon: Star, bg: 'from-amber-500 to-amber-400', to: '/reputation' },
    { label: 'Vouch Vendor', icon: Shield, bg: 'from-green-500 to-green-400', to: '/vouch' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-[#7A6F65] text-sm">{greeting()}</p>
          <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
            {vendorProfile.display_name} 👋
          </h1>
        </div>
        <button className="relative w-10 h-10 rounded-full bg-white border border-orange-100 flex items-center justify-center shadow-sm" aria-label="Notifications">
          <Bell size={17} className="text-[#7A6F65]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
        </button>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 p-5 text-white shadow-lg shadow-orange-200/60">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-orange-100 text-sm mb-1">Wallet Balance</p>
            <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              {balance.toFixed(2)} <span className="text-2xl">XLM</span>
            </p>
          </div>
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Current Pool', val: metadata?.display_name ?? '—' },
            { label: 'Next Draw', val: currentMember ? (currentMember.address === walletAddress ? 'You' : shortAddress(currentMember.address)) : '—' },
            { label: 'My Turn', val: `Round ${roundPosition + 1}` },
          ].map((item) => (
            <div key={item.label} className="bg-white/20 rounded-xl p-2.5 text-center">
              <p className="text-orange-100 text-xs">{item.label}</p>
              <p className="font-semibold text-sm mt-0.5 leading-tight truncate">{item.val}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Today's Status", val: paidThisCycle ? 'Paid ✓' : 'Pending', icon: CheckCircle, color: paidThisCycle ? 'text-green-500' : 'text-amber-500', bg: paidThisCycle ? 'bg-green-100' : 'bg-amber-100' },
          { label: 'Reputation Score', val: score.score.toString(), icon: Star, color: 'text-orange-500', bg: 'bg-orange-100' },
          { label: 'Contributions', val: `${score.cleanCycles + score.adjustedCount}/${totalTracked || 0}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Pool Balance', val: `${stroopsToXlm(BigInt(poolBalance))} XLM`, icon: Coins, color: 'text-orange-500', bg: 'bg-orange-100' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
            <p className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
              {s.val}
            </p>
            <p className="text-xs text-[#7A6F65] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
        <div className="flex justify-between items-center mb-2.5">
          <p className="font-semibold text-[#2D2A26] text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
            Contribution Progress
          </p>
          <span className="text-xs text-orange-500 font-medium">Round {roundPosition + 1} of {pool.memberCount}</span>
        </div>
        <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-[#7A6F65]">
          <span>Next draw: {currentMember ? (currentMember.address === walletAddress ? 'You' : shortAddress(currentMember.address)) : '—'}</span>
          <span>{pct}% through this round</span>
        </div>
      </div>

      {isMyTurn && (
        <button
          onClick={handleRequestDraw}
          disabled={isDrawing}
          className="w-full bg-gradient-to-r from-green-500 to-green-400 text-white py-3.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-70"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isDrawing ? 'Processing draw...' : "It's your turn — Draw now"}
        </button>
      )}

      <div>
        <p className="font-semibold text-[#2D2A26] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className={`bg-gradient-to-br ${a.bg} text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity shadow-sm`}
            >
              <a.icon size={20} />
              <span className="text-sm font-medium text-left" style={{ fontFamily: 'var(--font-heading)' }}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
        <p className="font-semibold text-[#2D2A26] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Recent Activity
        </p>
        <div className="divide-y divide-orange-50">
          {events.length === 0 && <p className="text-sm text-[#7A6F65] py-3">No activity yet.</p>}
          {events.map((e, i) => {
            const icon =
              e.eventType === 'CycleCompleted' ? (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-none">
                  <Check size={13} className="text-green-600" />
                </div>
              ) : e.eventType === 'Defaulted' ? (
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-none">
                  <Clock size={13} className="text-amber-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-none">
                  <Users size={13} className="text-blue-600" />
                </div>
              );
            return (
              <div key={i} className="flex gap-3 py-3">
                {icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2D2A26]">{EVENT_TEXT[e.eventType] ?? e.eventType}</p>
                  <p className="text-xs text-[#7A6F65] mt-0.5">Cycle {e.cycle + 1}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
