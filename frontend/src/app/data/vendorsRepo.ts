import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type Vendor = Database['public']['Tables']['vendors']['Row'];

export async function getVendorByWallet(walletAddress: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertVendorProfile(
  input: Database['public']['Tables']['vendors']['Insert']
): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .upsert(input, { onConflict: 'wallet_address' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listVendorsForMarket(marketId: string): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('market_id', marketId)
    .order('display_name');
  if (error) throw error;
  return data ?? [];
}

export async function searchVendorsByName(marketId: string, query: string): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('market_id', marketId)
    .ilike('display_name', `%${query}%`)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
