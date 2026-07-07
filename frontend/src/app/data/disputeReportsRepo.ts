import { supabase } from '../lib/supabaseClient';
import type { Database, DisputeStatus } from '../lib/database.types';

export type DisputeReport = Database['public']['Tables']['dispute_reports']['Row'];

export async function fileDispute(
  input: Database['public']['Tables']['dispute_reports']['Insert']
): Promise<DisputeReport> {
  const { data, error } = await supabase.from('dispute_reports').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function listDisputesForMarket(marketId: string): Promise<DisputeReport[]> {
  const { data, error } = await supabase
    .from('dispute_reports')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listDisputesFiledBy(wallet: string): Promise<DisputeReport[]> {
  const { data, error } = await supabase
    .from('dispute_reports')
    .select('*')
    .eq('reported_by', wallet)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function resolveDispute(
  id: string,
  status: DisputeStatus,
  resolutionNote: string
): Promise<DisputeReport> {
  const { data, error } = await supabase
    .from('dispute_reports')
    .update({ status, resolution_note: resolutionNote, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
