import { BrowserRouter } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { SessionProvider } from './context/SessionContext';
import { RootGate } from './components/RootGate';
import { OfflineBanner, InstallBanner } from './components/PwaBanners';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <WalletProvider>
      <SessionProvider>
        <BrowserRouter>
          <OfflineBanner />
          <RootGate />
          <InstallBanner />
          <Toaster />
        </BrowserRouter>
      </SessionProvider>
    </WalletProvider>
  );
}
