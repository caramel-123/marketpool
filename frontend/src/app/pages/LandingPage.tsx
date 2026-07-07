import { TrendingUp, Shield, Star, Zap, Wallet, ChevronRight, Star as StarIcon } from 'lucide-react';

function MarketIllustration() {
  return (
    <svg viewBox="0 0 340 260" className="w-full h-auto max-w-sm mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="170" cy="130" r="110" fill="#FBBF24" fillOpacity="0.15" />
      <circle cx="170" cy="130" r="80" fill="#F97316" fillOpacity="0.08" />
      <rect x="30" y="80" width="280" height="10" rx="5" fill="#F97316" />
      <polygon points="30,90 75,128 265,128 310,90" fill="#FB923C" />
      <line x1="75" y1="90" x2="75" y2="200" stroke="#CD7F32" strokeWidth="5" strokeLinecap="round" />
      <line x1="265" y1="90" x2="265" y2="200" stroke="#CD7F32" strokeWidth="5" strokeLinecap="round" />
      <rect x="55" y="128" width="230" height="14" rx="4" fill="#CD7F32" />
      <rect x="65" y="142" width="10" height="50" rx="3" fill="#B8693A" />
      <rect x="265" y="142" width="10" height="50" rx="3" fill="#B8693A" />
      <circle cx="95" cy="122" r="11" fill="#FB923C" />
      <circle cx="114" cy="122" r="11" fill="#F97316" />
      <circle cx="133" cy="122" r="11" fill="#FBBF24" />
      <ellipse cx="165" cy="121" rx="13" ry="9" fill="#22C55E" />
      <ellipse cx="188" cy="121" rx="11" ry="9" fill="#16A34A" />
      <circle cx="215" cy="122" r="9" fill="#EF4444" />
      <circle cx="232" cy="122" r="9" fill="#DC2626" />
      <circle cx="95" cy="62" r="16" fill="#FBBF24" />
      <rect x="79" y="78" width="32" height="42" rx="10" fill="#F97316" />
      <line x1="79" y1="88" x2="58" y2="112" stroke="#F97316" strokeWidth="9" strokeLinecap="round" />
      <line x1="111" y1="88" x2="132" y2="112" stroke="#F97316" strokeWidth="9" strokeLinecap="round" />
      <circle cx="240" cy="65" r="15" fill="#FBBF24" />
      <rect x="225" y="80" width="30" height="40" rx="9" fill="#F59E0B" />
      <line x1="225" y1="90" x2="206" y2="112" stroke="#F59E0B" strokeWidth="9" strokeLinecap="round" />
      <line x1="255" y1="90" x2="274" y2="112" stroke="#F59E0B" strokeWidth="9" strokeLinecap="round" />
      <circle cx="170" cy="190" r="26" fill="#FFD700" />
      <circle cx="170" cy="190" r="19" fill="#F59E0B" />
      <text x="170" y="196" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#7A3F00">₱</text>
      <circle cx="170" cy="190" r="33" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="5 4" fill="none" />
      <circle cx="170" cy="190" r="42" stroke="#FBBF24" strokeWidth="1" strokeDasharray="3 7" fill="none" strokeOpacity="0.5" />
      <path d="M90 66 Q95 70 100 66" stroke="#7A3F00" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M235 69 Q240 73 245 69" stroke="#7A3F00" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const FEATURES = [
  { icon: TrendingUp, title: 'Rotating Savings', desc: 'Join community pools and receive your payout when your turn comes' },
  { icon: Shield, title: 'Blockchain Transparent', desc: 'Every transaction recorded on Stellar — no hidden moves, ever' },
  { icon: Star, title: 'Reputation System', desc: 'Build trust through consistent contributions and earn higher tiers' },
  { icon: Zap, title: 'Emergency Draw', desc: 'Request early payout in emergencies with community vote approval' },
];

const STATS = [
  { value: '2,400+', label: 'Happy Vendors' },
  { value: '₱18M+', label: 'Total Savings' },
  { value: '340', label: 'Active Pools' },
  { value: '99.2%', label: 'On-time Rate' },
];

const TESTIMONIALS = [
  { name: 'Maria Santos', role: 'Vegetable Vendor, Divisoria', q: 'Naka-ipon na ako ng pang-capital para sa aking panggulayan dahil sa Market Pool! Life-changing talaga.', a: 'MS' },
  { name: 'Carlos Reyes', role: 'Fish Vendor, Quiapo', q: 'Safe ang pera namin at transparent. Mas magaling pa kaysa sa bangko sa aming komunidad.', a: 'CR' },
  { name: 'Ana Mendoza', role: 'Fruit Seller, Marikina', q: 'Nagtayo ako ng second stall after ko matanggap ang pool draw. Ang bilis ng growth!', a: 'AM' },
];

export default function LandingPage({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <nav className="sticky top-0 z-50 bg-[#FFF9F2]/95 backdrop-blur-md border-b border-orange-100 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs" style={{ fontFamily: 'var(--font-heading)' }}>
                MP
              </span>
            </div>
            <span className="text-lg font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
              Market Pool
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden md:block text-sm text-[#7A6F65] hover:text-orange-500 transition-colors">
              Features
            </a>
            <a href="#testimonials" className="hidden md:block text-sm text-[#7A6F65] hover:text-orange-500 transition-colors">
              Community
            </a>
            <button
              onClick={onConnect}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors text-sm shadow-sm shadow-orange-200"
            >
              <Wallet size={15} />
              Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      <section className="px-4 md:px-8 pt-10 pb-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              Powered by Stellar Blockchain
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-[#2D2A26] leading-tight mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              Building Trust Through{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">Community Savings</span>
            </h1>
            <p className="text-[#7A6F65] text-base md:text-lg mb-8 leading-relaxed">
              Save together, grow together. Market Pool brings the traditional Paluwagan into the digital age — transparent,
              secure, and built for Filipino wet market vendors.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onConnect}
                className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3.5 rounded-2xl font-semibold hover:bg-orange-600 transition-all hover:shadow-lg hover:shadow-orange-200 text-base"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Wallet size={18} />
                Connect Wallet
              </button>
              <a
                href="#features"
                className="flex items-center justify-center gap-2 border-2 border-orange-200 text-orange-600 px-6 py-3.5 rounded-2xl font-semibold hover:bg-orange-50 transition-colors text-base no-underline"
              >
                Explore Pools
                <ChevronRight size={16} />
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm text-[#7A6F65]">
              <div className="flex -space-x-2">
                {['MS', 'CR', 'AM', 'JL'].map((a, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center text-white text-xs font-bold">
                    {a}
                  </div>
                ))}
              </div>
              <span>
                Join <strong className="text-[#2D2A26]">2,400+</strong> vendors saving together
              </span>
            </div>
          </div>
          <div className="order-first md:order-last flex items-center justify-center">
            <MarketIllustration />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-orange-500 to-amber-400 py-10 px-4 md:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center text-white">
              <p className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                {s.value}
              </p>
              <p className="text-orange-100 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 md:px-8 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-[#2D2A26] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Everything a Market Vendor Needs
          </h2>
          <p className="text-[#7A6F65]">Built with your community in mind</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon size={22} className="text-orange-500" />
              </div>
              <h3 className="font-semibold text-[#2D2A26] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                {f.title}
              </h3>
              <p className="text-sm text-[#7A6F65] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" className="bg-amber-50 px-4 md:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#2D2A26] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Trusted by Market Vendors
            </h2>
            <p className="text-[#7A6F65]">Real stories from our community</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-orange-50">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StarIcon key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-[#7A6F65] text-sm italic leading-relaxed mb-5">"{t.q}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-sm flex-none">
                    {t.a}
                  </div>
                  <div>
                    <p className="font-semibold text-[#2D2A26] text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      {t.name}
                    </p>
                    <p className="text-xs text-[#7A6F65]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-8 py-16 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#2D2A26] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Ready to Start Saving?
        </h2>
        <p className="text-[#7A6F65] mb-6">Join your local market pool and grow your savings with your community.</p>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white px-8 py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-orange-200 text-lg"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <Wallet size={20} />
          Connect Wallet & Join
        </button>
      </section>

      <footer className="bg-[#2D2A26] text-white px-4 md:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs" style={{ fontFamily: 'var(--font-heading)' }}>
                MP
              </span>
            </div>
            <span className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              Market Pool
            </span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 Market Pool. Paluwagan on the Stellar Blockchain.</p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
