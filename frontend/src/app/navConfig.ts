import { Home, LayoutGrid, ArrowUpCircle, Star, User, BarChart2, Plus, Gavel, Banknote } from 'lucide-react';
import type { ActiveRole } from './context/SessionContext';

export interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  /** Rendered as the floating action button in the mobile bottom nav. */
  primary?: boolean;
}

export const NAV_BY_ROLE: Record<Exclude<ActiveRole, null>, NavItem[]> = {
  vendor: [
    { path: '/pool', label: 'Dashboard', icon: Home, end: true },
    { path: '/pools', label: 'Pools', icon: LayoutGrid },
    { path: '/pool/contribute', label: 'Contribute', icon: ArrowUpCircle, primary: true },
    { path: '/reputation', label: 'Reputation', icon: Star },
    { path: '/profile', label: 'Profile', icon: User },
  ],
  kolektor: [
    { path: '/kolektor/log', label: 'Cash Log', icon: Banknote, end: true },
    { path: '/profile', label: 'Profile', icon: User },
  ],
  admin: [
    { path: '/admin', label: 'Dashboard', icon: BarChart2, end: true },
    { path: '/admin/pools/new', label: 'Create Pool', icon: Plus },
    { path: '/admin/disputes', label: 'Disputes', icon: Gavel },
    { path: '/profile', label: 'Profile', icon: User },
  ],
};
