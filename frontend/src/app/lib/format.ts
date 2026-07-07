export function stroopsToXlm(amount: bigint): string {
  return (Number(amount) / 10_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function cycleDays(secs: bigint): number {
  return Number(secs) / 86_400;
}

export function cycleLabel(secs: bigint): string {
  const days = cycleDays(secs);
  if (days === 1) return 'Daily';
  if (days === 7) return 'Weekly';
  return `Every ${days}d`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
