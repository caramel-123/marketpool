import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { isConnected, requestAccess, getAddress, signMessage } from '@stellar/freighter-api';
import { StrKey, MuxedAccount } from '@stellar/stellar-sdk';
import { supabase, SUPABASE_READY } from '../lib/supabaseClient';

const STELLAR_LOGIN_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/stellar-login`;
const WALLET_STORAGE_KEY = 'marketpool_wallet';

/**
 * Normalize any Stellar address to a plain G... Ed25519 public key.
 * Freighter can return muxed (M...) addresses -- extract the base key.
 */
function normalizeToGAddress(addr: string): string {
  if (!addr) return addr;
  if (addr.startsWith('M') && StrKey.isValidMed25519PublicKey(addr)) {
    try {
      const muxed = MuxedAccount.fromAddress(addr, '0');
      return muxed.baseAccount().accountId();
    } catch {
      // fall through
    }
  }
  if (StrKey.isValidEd25519PublicKey(addr)) return addr;
  return addr;
}

function signatureToBase64(signedMessage: unknown): string {
  if (signedMessage === null || signedMessage === undefined) {
    throw new Error('Message signing was rejected or returned no signature.');
  }
  if (typeof signedMessage === 'string') return signedMessage;
  if (signedMessage instanceof Uint8Array) {
    return btoa(String.fromCharCode(...signedMessage));
  }
  throw new Error('Unrecognized signMessage() return shape from Freighter');
}

interface WalletContextValue {
  walletConnected: boolean;
  walletAddress: string;
  walletError: string | null;
  isAuthenticating: boolean;
  supabaseAuthed: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [supabaseAuthed, setSupabaseAuthed] = useState(false);

  /**
   * Freighter signMessage() -> stellar-login Edge Function challenge/verify
   * handshake -> supabase.auth.verifyOtp() session. Establishes real RLS
   * identity (auth.jwt() -> user_metadata.wallet_address) without ever
   * handling a password. See supabase/functions/stellar-login/index.ts.
   */
  const authenticateWithSupabase = useCallback(async (address: string) => {
    if (!SUPABASE_READY) return;
    setIsAuthenticating(true);
    try {
      const challengeRes = await fetch(STELLAR_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'challenge', wallet_address: address }),
      });
      const challengeBody = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challengeBody.error ?? 'Failed to start login challenge');

      const signResult = await signMessage(challengeBody.message, { address });
      if ('error' in signResult && signResult.error) {
        throw new Error((signResult.error as Error).message ?? 'Message signing rejected');
      }
      const signatureBase64 = signatureToBase64(
        (signResult as { signedMessage: unknown }).signedMessage
      );

      const verifyRes = await fetch(STELLAR_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', wallet_address: address, signature: signatureBase64 }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyBody.error ?? 'Signature verification failed');

      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: verifyBody.token_hash,
        type: 'magiclink',
      });
      if (otpError) throw otpError;

      setSupabaseAuthed(true);
    } catch (err) {
      // Non-fatal: the wallet is still connected and on-chain actions still
      // work without a Supabase session, only RLS-scoped reads/writes to
      // Supabase tables (vendor profile, disputes, etc.) will fail until
      // this succeeds. Surface it distinctly from a hard wallet-connect error.
      console.error('Supabase wallet authentication failed:', err);
      setSupabaseAuthed(false);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setWalletError(null);
    try {
      const connectedResult = await isConnected();
      if (!connectedResult.isConnected) {
        const msg = 'Freighter not found. Install the Freighter extension at freighter.app';
        setWalletError(msg);
        return;
      }

      const accessResult = await requestAccess();
      if (accessResult.error) {
        setWalletError(accessResult.error.message ?? 'Access denied by Freighter.');
        return;
      }

      const addressResult = await getAddress();
      const rawAddr = 'error' in addressResult && addressResult.error ? '' : addressResult.address;
      const addr = normalizeToGAddress(rawAddr);

      if (!addr || !StrKey.isValidEd25519PublicKey(addr)) {
        setWalletError(
          rawAddr
            ? `Unsupported address format from Freighter: "${rawAddr}". Switch to a standard G... account.`
            : 'Could not get address. Open Freighter, log in, and try again.'
        );
        return;
      }

      setWalletAddress(addr);
      setWalletConnected(true);
      localStorage.setItem(WALLET_STORAGE_KEY, addr);

      await authenticateWithSupabase(addr);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Failed to connect wallet.');
    }
  }, [authenticateWithSupabase]);

  const disconnectWallet = useCallback(async () => {
    setWalletConnected(false);
    setWalletAddress('');
    setWalletError(null);
    setSupabaseAuthed(false);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    if (SUPABASE_READY) {
      await supabase.auth.signOut();
    }
  }, []);

  // Silently restore the session on page reload if this wallet previously
  // connected and Freighter still authorizes this site -- failures here are
  // expected (extension locked, access revoked) and shouldn't surface an
  // error banner on a page the user hasn't even tried to connect from yet.
  useEffect(() => {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!stored) return;

    (async () => {
      try {
        const connectedResult = await isConnected();
        if (!connectedResult.isConnected) return;

        const addressResult = await getAddress();
        const rawAddr = 'error' in addressResult && addressResult.error ? '' : addressResult.address;
        const addr = normalizeToGAddress(rawAddr);
        if (addr !== stored || !StrKey.isValidEd25519PublicKey(addr)) return;

        setWalletAddress(addr);
        setWalletConnected(true);
        await authenticateWithSupabase(addr);
      } catch {
        // Silent -- user can still connect manually from the connect screen.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletConnected,
        walletAddress,
        walletError,
        isAuthenticating,
        supabaseAuthed,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
