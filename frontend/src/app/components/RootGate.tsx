import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useSession } from '../context/SessionContext';
import LandingPage from '../pages/LandingPage';
import { ConnectWalletModal } from './ConnectWalletModal';
import { AppShell } from './AppShell';
import { AppRoutes } from '../router';

export function RootGate() {
  const { walletConnected } = useWallet();
  const { activeRole } = useSession();
  const [showModal, setShowModal] = useState(false);

  if (!walletConnected) {
    return (
      <>
        <LandingPage onConnect={() => setShowModal(true)} />
        {showModal && <ConnectWalletModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  if (!activeRole) {
    return <ConnectWalletModal onClose={() => {}} />;
  }

  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
}
