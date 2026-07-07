import { useEffect, useState } from 'react';
import { Wallet, X, Check, ArrowRight } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useSession, type ActiveRole } from '../context/SessionContext';
import { shortAddress } from '../lib/format';
import { getXlmBalance } from '../contracts/networkConfig';

function WalletIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="25" width="170" height="110" rx="18" fill="#FFF9F2" stroke="#F97316" strokeWidth="2.5" />
      <rect x="15" y="48" width="170" height="32" fill="#F97316" />
      <rect x="15" y="48" width="170" height="4" fill="#FB923C" />
      <circle cx="150" cy="100" r="22" fill="#FBBF24" />
      <circle cx="150" cy="100" r="15" fill="#FFD700" />
      <text x="150" y="106" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#7A3F00" fontFamily="Inter, sans-serif">
        XLM
      </text>
      <rect x="30" y="92" width="70" height="9" rx="4.5" fill="#E5E7EB" />
      <rect x="30" y="108" width="48" height="7" rx="3.5" fill="#E5E7EB" />
      <circle cx="42" cy="64" r="5" fill="white" fillOpacity="0.6" />
      <circle cx="58" cy="64" r="5" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

const ROLES: { id: Exclude<ActiveRole, null>; label: string; desc: string; emoji: string }[] = [
  { id: 'vendor', label: 'Vendor', desc: 'Join and contribute to savings pools', emoji: '🛒' },
  { id: 'kolektor', label: 'Kolektor', desc: 'Collect daily contributions for pools', emoji: '💼' },
  { id: 'admin', label: 'Market Admin', desc: 'Manage pools and resolve disputes', emoji: '🏛️' },
];

export function ConnectWalletModal({ onClose }: { onClose: () => void }) {
  const { walletConnected, walletAddress, walletError, isAuthenticating, connectWallet } = useWallet();
  const { activeRole, setActiveRole } = useSession();
  const [role, setRole] = useState<Exclude<ActiveRole, null>>('vendor');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (walletConnected && walletAddress) {
      getXlmBalance(walletAddress).then(setBalance);
    }
  }, [walletConnected, walletAddress]);

  useEffect(() => {
    if (activeRole) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole]);

  const step = walletConnected ? 'role' : 'connect';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#2D2A26] text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
            {step === 'connect' ? 'Connect Wallet' : 'Select Your Role'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        {step === 'connect' ? (
          <>
            <WalletIllustration />
            <p className="text-center text-[#7A6F65] text-sm my-4 leading-relaxed">
              Connect your Freighter wallet to access Market Pool securely on the Stellar network.
            </p>
            <button
              onClick={() => connectWallet()}
              disabled={isAuthenticating}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isAuthenticating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  <span>Connect Freighter</span>
                </>
              )}
            </button>
            {walletError && <p className="text-center text-xs text-red-500 mt-3">{walletError}</p>}
            <p className="text-center text-xs text-[#7A6F65] mt-3">
              Don't have Freighter?{' '}
              <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="text-orange-500 font-medium">
                Download here
              </a>
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-none">
                <Check size={14} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-700">Wallet Connected</p>
                <p className="text-xs text-green-600 font-mono">{shortAddress(walletAddress)}</p>
              </div>
              {balance !== null && (
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {balance.toFixed(2)} XLM
                </span>
              )}
            </div>

            <p className="text-sm text-[#7A6F65] mb-3">How will you use Market Pool?</p>
            <div className="space-y-2 mb-5">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                    role === r.id ? 'border-orange-400 bg-orange-50' : 'border-transparent bg-gray-50 hover:border-orange-200'
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-[#2D2A26] text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      {r.label}
                    </p>
                    <p className="text-xs text-[#7A6F65]">{r.desc}</p>
                  </div>
                  {role === r.id && <Check size={16} className="text-orange-500 flex-none" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveRole(role)}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Continue as {ROLES.find((r) => r.id === role)?.label}
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
