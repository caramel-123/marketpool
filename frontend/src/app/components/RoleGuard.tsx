import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useSession, type ActiveRole } from '../context/SessionContext';

export function RoleGuard({ allow, children }: { allow: ActiveRole[]; children: ReactNode }) {
  const { walletConnected } = useWallet();
  const { activeRole } = useSession();

  if (!walletConnected) {
    return <Navigate to="/" replace />;
  }
  if (!activeRole || !allow.includes(activeRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
