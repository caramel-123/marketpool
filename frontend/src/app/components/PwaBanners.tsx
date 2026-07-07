import { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setPrompt(e as BeforeInstallPromptEvent);
    const appInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };

  return { canInstall: !!prompt && !installed, install };
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#2D2A26] text-white text-xs flex items-center justify-center gap-2 py-2 px-4">
      <WifiOff size={13} />
      <span>You're offline — showing cached data</span>
    </div>
  );
}

export function InstallBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall || dismissed) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[100] bg-white rounded-2xl shadow-xl border border-orange-100 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center flex-none">
        <Download size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Install Market Pool
        </p>
        <p className="text-xs text-[#7A6F65]">Add to your home screen for quick access</p>
      </div>
      <button
        onClick={() => {
          install();
          setDismissed(true);
        }}
        className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-full font-medium flex-none"
      >
        Install
      </button>
      <button onClick={() => setDismissed(true)} className="flex-none text-[#7A6F65]" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
