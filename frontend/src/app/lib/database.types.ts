// TODO: regenerate via `mcp__supabase__generate_typescript_types` (or
// `supabase gen types typescript`) once the schema stabilizes. Hand-written
// to match supabase/migrations/0001_init.sql + 0003_wallet_auth_support.sql
// in the meantime so the repo modules have real column types to work with.
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export interface Database {
  public: {
    Tables: {
      markets: {
        Row: {
          id: string;
          name: string;
          location_text: string | null;
          admin_wallet: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location_text?: string | null;
          admin_wallet: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['markets']['Insert']>;
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          wallet_address: string;
          market_id: string | null;
          display_name: string;
          stall_number: string | null;
          phone_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          market_id?: string | null;
          display_name: string;
          stall_number?: string | null;
          phone_number?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>;
        Relationships: [];
      };
      kolektor_logs: {
        Row: {
          id: string;
          pool_id: string;
          market_id: string;
          kolektor_wallet: string;
          vendor_wallet: string;
          cycle_number: number;
          amount_php: number | null;
          note: string | null;
          logged_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          market_id: string;
          kolektor_wallet: string;
          vendor_wallet: string;
          cycle_number: number;
          amount_php?: number | null;
          note?: string | null;
          logged_at?: string;
        };
        Update: Partial<Database['public']['Tables']['kolektor_logs']['Insert']>;
        Relationships: [];
      };
      pool_metadata: {
        Row: {
          pool_id: string;
          market_id: string;
          display_name: string;
          description: string | null;
          is_seed_demo: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          pool_id: string;
          market_id: string;
          display_name: string;
          description?: string | null;
          is_seed_demo?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pool_metadata']['Insert']>;
        Relationships: [];
      };
      dispute_reports: {
        Row: {
          id: string;
          pool_id: string;
          market_id: string;
          reported_by: string;
          against_wallet: string | null;
          cycle_number: number | null;
          status: DisputeStatus;
          description: string;
          resolution_note: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          pool_id: string;
          market_id: string;
          reported_by: string;
          against_wallet?: string | null;
          cycle_number?: number | null;
          status?: DisputeStatus;
          description: string;
          resolution_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['dispute_reports']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
