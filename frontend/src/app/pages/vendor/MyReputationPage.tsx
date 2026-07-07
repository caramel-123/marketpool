import { useEffect, useState } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import {
  getScore,
  getBadges,
  getRecentEvents,
  BADGE_THRESHOLDS,
  type ReputationScore,
  type BadgeType,
  type ReputationEvent,
} from '../../contracts/reputationContractService';

const TIER_COLOR: Record<BadgeType, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
};

const TIER_BG: Record<BadgeType, string> = {
  Bronze: 'bg-orange-50',
  Silver: 'bg-gray-50',
  Gold: 'bg-amber-50',
};

const EVENT_TEXT: Record<string, string> = {
  CycleCompleted: 'Contributed on time',
  Defaulted: 'Missed a contribution',
  Adjusted: 'Contribution adjusted',
  GuarantorVouch: 'Vouched for a vendor',
  BadgeEarned: 'Badge earned',
};

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, score);
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#FEF3C7" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          {score}
        </span>
      </div>
    </div>
  );
}

export default function MyReputationPage() {
  const { walletAddress } = useWallet();
  const [score, setScore] = useState<ReputationScore | null>(null);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [events, setEvents] = useState<ReputationEvent[]>([]);

  useEffect(() => {
    if (!walletAddress) return;
    Promise.all([
      getScore(walletAddress, walletAddress),
      getBadges(walletAddress, walletAddress),
      getRecentEvents(walletAddress, walletAddress, 5),
    ])
      .then(([s, b, e]) => {
        setScore(s);
        setBadges(b);
        setEvents(e);
      })
      .catch(console.error);
  }, [walletAddress]);

  if (!score) {
    return <p className="p-6 text-[#7A6F65] text-sm">Loading your reputation...</p>;
  }

  const currentTier = (['Gold', 'Silver', 'Bronze'] as BadgeType[]).find((t) => badges.includes(t));
  const allTiers: { tier: BadgeType; name: string }[] = [
    { tier: 'Bronze', name: 'First Contribution' },
    { tier: 'Bronze', name: `${BADGE_THRESHOLDS.Bronze} Clean Cycles` },
    { tier: 'Silver', name: `${BADGE_THRESHOLDS.Silver} Clean Cycles` },
    { tier: 'Gold', name: `${BADGE_THRESHOLDS.Gold} Clean Cycles` },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Reputation
        </h1>
        <p className="text-[#7A6F65] text-sm">Your trust score in the community</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-50 text-center">
        <ScoreRing score={Number(score.score)} />
        <div className="mt-4 mb-5">
          {currentTier ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: `${TIER_COLOR[currentTier]}22`, color: '#92400E' }}
            >
              <Award size={14} />
              {currentTier} Tier
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-semibold">
              Just starting out
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-orange-50">
          {[
            { val: String(score.cleanCycles), label: 'Clean Cycles' },
            { val: String(score.missedCount), label: 'Missed' },
            { val: String(score.adjustedCount), label: 'Adjusted' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
                {s.val}
              </p>
              <p className="text-xs text-[#7A6F65]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold text-[#2D2A26] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Achievements
        </p>
        <div className="grid grid-cols-2 gap-3">
          {allTiers.map((a, i) => {
            const earned = badges.includes(a.tier);
            return (
              <div
                key={i}
                className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition-opacity ${
                  earned ? 'border-orange-50' : 'border-gray-100 opacity-45'
                }`}
              >
                <div className={`w-10 h-10 ${TIER_BG[a.tier]} rounded-xl flex items-center justify-center flex-none`}>
                  <Award size={20} style={{ color: TIER_COLOR[a.tier] }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#7A6F65]">{a.tier}</p>
                  <p className="text-xs font-semibold text-[#2D2A26] leading-tight">{a.name}</p>
                  {earned && <p className="text-xs text-green-600 mt-0.5">Earned ✓</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
        <p className="font-semibold text-[#2D2A26] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Score History
        </p>
        {events.length === 0 && <p className="text-sm text-[#7A6F65] py-3">No activity yet.</p>}
        {events.map((item, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-orange-50 last:border-0">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-none mt-0.5">
              <TrendingUp size={13} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#2D2A26]">{EVENT_TEXT[item.eventType] ?? item.eventType}</p>
              <p className="text-xs text-[#7A6F65] mt-0.5">Cycle {item.cycle + 1}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
