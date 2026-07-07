import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useWallet } from './WalletContext';
import { getVendorByWallet, type Vendor } from '../data/vendorsRepo';
import { getMarketForAdmin, type Market } from '../data/marketsRepo';

export type ActiveRole = 'vendor' | 'kolektor' | 'admin' | null;

const SESSION_STORAGE_KEY = 'marketpool_session';

interface PersistedSession {
  activeRole: ActiveRole;
  activePoolId: string | null;
}

function loadPersistedSession(): PersistedSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { activeRole: null, activePoolId: null };
  } catch {
    return { activeRole: null, activePoolId: null };
  }
}

function persistSession(session: PersistedSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

interface SessionContextValue {
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  activePoolId: string | null;
  setActivePoolId: (poolId: string | null) => void;
  vendorProfile: Vendor | null;
  adminMarket: Market | null;
  isProfileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { walletAddress, walletConnected, supabaseAuthed } = useWallet();
  const initial = loadPersistedSession();

  const [activeRole, setActiveRoleState] = useState<ActiveRole>(initial.activeRole);
  const [activePoolId, setActivePoolIdState] = useState<string | null>(initial.activePoolId);
  const [vendorProfile, setVendorProfile] = useState<Vendor | null>(null);
  const [adminMarket, setAdminMarket] = useState<Market | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const setActiveRole = useCallback(
    (role: ActiveRole) => {
      setActiveRoleState(role);
      persistSession({ activeRole: role, activePoolId });
    },
    [activePoolId]
  );

  const setActivePoolId = useCallback(
    (poolId: string | null) => {
      setActivePoolIdState(poolId);
      persistSession({ activeRole, activePoolId: poolId });
    },
    [activeRole]
  );

  const refreshProfile = useCallback(async () => {
    if (!walletConnected || !walletAddress || !supabaseAuthed) {
      setVendorProfile(null);
      setAdminMarket(null);
      return;
    }
    setIsProfileLoading(true);
    try {
      const [vendor, market] = await Promise.all([
        getVendorByWallet(walletAddress),
        getMarketForAdmin(walletAddress),
      ]);
      setVendorProfile(vendor);
      setAdminMarket(market);
    } catch (err) {
      console.error('Failed to load vendor/admin profile:', err);
    } finally {
      setIsProfileLoading(false);
    }
  }, [walletConnected, walletAddress, supabaseAuthed]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Role is chosen explicitly in the connect-wallet modal's role step, so we
  // only need to clear it back out on disconnect (not default it).
  useEffect(() => {
    if (!walletConnected && activeRole) {
      setActiveRole(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected]);

  return (
    <SessionContext.Provider
      value={{
        activeRole,
        setActiveRole,
        activePoolId,
        setActivePoolId,
        vendorProfile,
        adminMarket,
        isProfileLoading,
        refreshProfile,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
