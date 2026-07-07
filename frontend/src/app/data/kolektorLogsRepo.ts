import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type KolektorLog = Database['public']['Tables']['kolektor_logs']['Row'];

export async function logCashCollection(
  input: Database['public']['Tables']['kolektor_logs']['Insert']
): Promise<KolektorLog> {
  const { data, error } = await supabase.from('kolektor_logs').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function listLogsForPool(poolId: string): Promise<KolektorLog[]> {
  const { data, error } = await supabase
    .from('kolektor_logs')
    .select('*')
    .eq('pool_id', poolId)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listLogsByKolektor(kolektorWallet: string): Promise<KolektorLog[]> {
  const { data, error } = await supabase
    .from('kolektor_logs')
    .select('*')
    .eq('kolektor_wallet', kolektorWallet)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
