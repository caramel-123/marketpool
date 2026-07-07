import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type PoolMetadata = Database['public']['Tables']['pool_metadata']['Row'];

/** Public read across all markets -- used for platform-wide stats (e.g. the landing page). */
export async function listAllPoolMetadata(): Promise<PoolMetadata[]> {
  const { data, error } = await supabase.from('pool_metadata').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPoolsForMarket(marketId: string): Promise<PoolMetadata[]> {
  const { data, error } = await supabase
    .from('pool_metadata')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPoolMetadata(poolId: string): Promise<PoolMetadata | null> {
  const { data, error } = await supabase
    .from('pool_metadata')
    .select('*')
    .eq('pool_id', poolId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPoolMetadata(
  input: Database['public']['Tables']['pool_metadata']['Insert']
): Promise<PoolMetadata> {
  const { data, error } = await supabase.from('pool_metadata').insert(input).select().single();
  if (error) throw error;
  return data;
}
