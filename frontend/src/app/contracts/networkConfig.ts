import { Asset, Networks } from '@stellar/stellar-sdk';

export const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE ?? Networks.TESTNET;
export const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';
export const HORIZON_URL = import.meta.env.VITE_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

// A funded, public G-address used only as the source account for read-only
// contract simulations (e.g. the landing page's platform stats) when no
// wallet is connected yet. It never signs anything -- simulateOnly() only
// calls server.simulateTransaction(), so no private key is needed or used.
export const PUBLIC_READ_ACCOUNT = import.meta.env.VITE_PUBLIC_READ_ACCOUNT ?? 'GAQ2SOW2URO3Y5JJPQS5GRI7MXREUEYZZXOVH5CHDC7KRIAOAQWFCUQ3';

// Contributions are paid in native XLM (unlike BalikBayan's custom USDC
// token), so the token contract ID must be resolved dynamically from the
// network passphrase rather than hardcoded -- the native asset's SAC
// contract ID differs between testnet/futurenet/mainnet.
export function getNativeAssetContractId(): string {
  return Asset.native().contractId(NETWORK_PASSPHRASE);
}

/** Classic-account native XLM balance, for the Dashboard/Profile hero cards. */
export async function getXlmBalance(walletAddress: string): Promise<number> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${walletAddress}`);
    if (!res.ok) return 0;
    const data = await res.json();
    const native = (data.balances ?? []).find((b: { asset_type: string }) => b.asset_type === 'native');
    return native ? Number(native.balance) : 0;
  } catch {
    return 0;
  }
}
