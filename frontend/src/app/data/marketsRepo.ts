import { supabase } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type Market = Database['public']['Tables']['markets']['Row'];

export async function listMarkets(): Promise<Market[]> {
  const { data, error } = await supabase.from('markets').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getMarket(marketId: string): Promise<Market | null> {
  const { data, error } = await supabase.from('markets').select('*').eq('id', marketId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMarketForAdmin(adminWallet: string): Promise<Market | null> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('admin_wallet', adminWallet)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createMarket(input: Database['public']['Tables']['markets']['Insert']): Promise<Market> {
  const { data, error } = await supabase.from('markets').insert(input).select().single();
  if (error) throw error;
  return data;
}
