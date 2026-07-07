import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Only the anon/publishable key ever ships to the browser -- RLS (see
// supabase/migrations) is what actually scopes access per wallet, never a
// service-role key.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SUPABASE_READY = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
