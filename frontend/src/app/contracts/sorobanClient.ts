import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  rpc as SorobanRpc,
  xdr,
  StrKey,
  scValToNative,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { NETWORK_PASSPHRASE, RPC_URL } from './networkConfig';

const server = new SorobanRpc.Server(RPC_URL);

export function addressToScVal(address: string): xdr.ScVal {
  if (StrKey.isValidEd25519PublicKey(address)) {
    const bytes = StrKey.decodeEd25519PublicKey(address);
    return xdr.ScVal.scvAddress(
      xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(bytes))
    );
  }
  if (StrKey.isValidContract(address)) {
    const bytes = StrKey.decodeContract(address);
    return xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeContract(bytes as unknown as xdr.Hash));
  }
  throw new Error(`Invalid Stellar address: "${address}". Must start with G (account) or C (contract).`);
}

export function optionAddressToScVal(address: string | null | undefined): xdr.ScVal {
  return address ? addressToScVal(address) : xdr.ScVal.scvVoid();
}

/// Unit-variant `#[contracttype]` enums (PoolStatus, ContributionStatus,
/// DrawType, ReputationEventType, BadgeType) decode via scValToNative as
/// either a bare string tag or `{ tag: string }` depending on SDK version --
/// normalize defensively rather than assume one shape.
export function normalizeEnumTag(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'tag' in (value as Record<string, unknown>)) {
    return String((value as { tag: unknown }).tag);
  }
  return String(value);
}

export function assertAddress(addr: string, label: string) {
  if (!addr || addr.trim().length === 0) {
    throw new Error(`${label} address is empty. Make sure your wallet is connected.`);
  }
  const trimmed = addr.trim();
  if (trimmed.startsWith('M')) {
    throw new Error(
      `${label} address is a muxed account (starts with M). Please switch to a standard G... account in Freighter settings.`
    );
  }
  if (!/^[GC][A-Z2-7]{55}$/.test(trimmed)) {
    throw new Error(`${label} address is invalid: "${trimmed}".`);
  }
}

export async function buildAndSubmit(
  contractId: string,
  walletAddress: string,
  method: string,
  args: xdr.ScVal[]
): Promise<xdr.ScVal | null> {
  const contract = new Contract(contractId);
  const account = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);

  const signResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if ('error' in signResult && signResult.error) {
    throw new Error((signResult.error as Error).message ?? 'Signing rejected');
  }

  const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error('Transaction submission failed');
  }

  let getResult = await server.getTransaction(sendResult.hash);
  let attempts = 0;
  while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    const success = getResult as SorobanRpc.Api.GetSuccessfulTransactionResponse;
    return success.returnValue ?? null;
  }

  throw new Error(`Transaction failed: ${getResult.status}`);
}

export async function simulateOnly(
  contractId: string,
  walletAddress: string,
  method: string,
  args: xdr.ScVal[]
): Promise<xdr.ScVal | null> {
  const contract = new Contract(contractId);
  const account = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  const success = simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  return success.result?.retval ?? null;
}

export { scValToNative };
