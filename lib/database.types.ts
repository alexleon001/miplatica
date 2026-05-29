// ===========================================================================
// Mi Platica — tipos autogenerados desde el schema vivo de Supabase.
// ===========================================================================
// NO editar a mano. Para regenerar:
//   bun run db:types
// Eso invoca scripts/generate-db-types.ts, que usa el MCP de Supabase
// (o el CLI `supabase gen types typescript --project-id ...` como fallback).
// ===========================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance_amount: number
          balance_updated_at: string | null
          color: string | null
          created_at: string
          currency: string
          icon: string | null
          id: string
          integration_status: string
          integration_type: string
          is_active: boolean
          name: string
          owner_id: string
          type: string
          updated_at: string
        }
        Insert: {
          balance_amount?: number
          balance_updated_at?: string | null
          color?: string | null
          created_at?: string
          currency: string
          icon?: string | null
          id?: string
          integration_status?: string
          integration_type?: string
          is_active?: boolean
          name: string
          owner_id: string
          type: string
          updated_at?: string
        }
        Update: {
          balance_amount?: number
          balance_updated_at?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          integration_status?: string
          integration_type?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_prices: {
        Row: {
          fetched_at: string
          name: string | null
          price_ars: number | null
          price_usd: number | null
          ticker: string
          variation_pct: number | null
        }
        Insert: {
          fetched_at?: string
          name?: string | null
          price_ars?: number | null
          price_usd?: number | null
          ticker: string
          variation_pct?: number | null
        }
        Update: {
          fetched_at?: string
          name?: string | null
          price_ars?: number | null
          price_usd?: number | null
          ticker?: string
          variation_pct?: number | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          limit_ars: number
          month: number
          owner_id: string
          spent_ars: number
          year: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          limit_ars: number
          month: number
          owner_id: string
          spent_ars?: number
          year: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          limit_ars?: number
          month?: number
          owner_id?: string
          spent_ars?: number
          year?: number
        }
        Relationships: []
      }
      debts: {
        Row: {
          created_at: string
          currency: string
          end_date: string | null
          id: string
          interest_rate: number | null
          is_active: boolean
          monthly_payment: number | null
          name: string
          next_payment_date: string | null
          notes: string | null
          owner_id: string
          remaining_amount: number
          total_amount: number
          type: string
        }
        Insert: {
          created_at?: string
          currency: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          monthly_payment?: number | null
          name: string
          next_payment_date?: string | null
          notes?: string | null
          owner_id: string
          remaining_amount: number
          total_amount: number
          type: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          monthly_payment?: number | null
          name?: string
          next_payment_date?: string | null
          notes?: string | null
          owner_id?: string
          remaining_amount?: number
          total_amount?: number
          type?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          blue: number | null
          ccl: number | null
          date: string
          fetched_at: string
          mep: number | null
          oficial: number | null
          tarjeta: number | null
        }
        Insert: {
          blue?: number | null
          ccl?: number | null
          date: string
          fetched_at?: string
          mep?: number | null
          oficial?: number | null
          tarjeta?: number | null
        }
        Update: {
          blue?: number | null
          ccl?: number | null
          date?: string
          fetched_at?: string
          mep?: number | null
          oficial?: number | null
          tarjeta?: number | null
        }
        Relationships: []
      }
      inflation: {
        Row: {
          fetched_at: string
          ipc: number
          month: string
        }
        Insert: {
          fetched_at?: string
          ipc: number
          month: string
        }
        Update: {
          fetched_at?: string
          ipc?: number
          month?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          account_id: string | null
          avg_cost_ars: number | null
          avg_cost_usd: number | null
          created_at: string
          currency: string
          current_price_ars: number | null
          current_price_usd: number | null
          current_value_ars: number | null
          current_value_usd: number | null
          id: string
          interest_rate: number | null
          last_updated: string | null
          maturity_date: string | null
          name: string
          owner_id: string
          profit_loss_ars: number | null
          profit_loss_pct: number | null
          profit_loss_usd: number | null
          purchase_date: string | null
          quantity: number
          ticker: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          avg_cost_ars?: number | null
          avg_cost_usd?: number | null
          created_at?: string
          currency: string
          current_price_ars?: number | null
          current_price_usd?: number | null
          current_value_ars?: number | null
          current_value_usd?: number | null
          id?: string
          interest_rate?: number | null
          last_updated?: string | null
          maturity_date?: string | null
          name: string
          owner_id: string
          profit_loss_ars?: number | null
          profit_loss_pct?: number | null
          profit_loss_usd?: number | null
          purchase_date?: string | null
          quantity?: number
          ticker?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          avg_cost_ars?: number | null
          avg_cost_usd?: number | null
          created_at?: string
          currency?: string
          current_price_ars?: number | null
          current_price_usd?: number | null
          current_value_ars?: number | null
          current_value_usd?: number | null
          id?: string
          interest_rate?: number | null
          last_updated?: string | null
          maturity_date?: string | null
          name?: string
          owner_id?: string
          profit_loss_ars?: number | null
          profit_loss_pct?: number | null
          profit_loss_usd?: number | null
          purchase_date?: string | null
          quantity?: number
          ticker?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_connections: {
        Row: {
          access_token_enc: string
          connected_at: string
          expires_at: string | null
          last_synced_at: string | null
          mp_user_id: string | null
          owner_id: string
          refresh_token_enc: string | null
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token_enc: string
          connected_at?: string
          expires_at?: string | null
          last_synced_at?: string | null
          mp_user_id?: string | null
          owner_id: string
          refresh_token_enc?: string | null
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token_enc?: string
          connected_at?: string
          expires_at?: string | null
          last_synced_at?: string | null
          mp_user_id?: string | null
          owner_id?: string
          refresh_token_enc?: string | null
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mp_oauth_states: {
        Row: {
          created_at: string
          owner_id: string
          state: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          state: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          state?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency_display: string
          id: string
          inflation_adjustment: boolean
          monthly_income_ars: number | null
          monthly_income_usd: number | null
          name: string | null
          preferred_usd_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_display?: string
          id: string
          inflation_adjustment?: boolean
          monthly_income_ars?: number | null
          monthly_income_usd?: number | null
          name?: string | null
          preferred_usd_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_display?: string
          id?: string
          inflation_adjustment?: boolean
          monthly_income_ars?: number | null
          monthly_income_usd?: number | null
          name?: string | null
          preferred_usd_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      projection_items: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          currency: string
          id: string
          installments_total: number | null
          is_active: boolean
          name: string
          notes: string | null
          owner_id: string
          payment_method: string
          recurrence: string
          start_month: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          installments_total?: number | null
          is_active?: boolean
          name: string
          notes?: string | null
          owner_id: string
          payment_method?: string
          recurrence?: string
          start_month: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          installments_total?: number | null
          is_active?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string
          recurrence?: string
          start_month?: string
          updated_at?: string
        }
        Relationships: []
      }
      projection_income: {
        Row: {
          amount_ars: number
          created_at: string
          month: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          amount_ars: number
          created_at?: string
          month: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          amount_ars?: number
          created_at?: string
          month?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          current_amount: number
          id: string
          monthly_contribution: number | null
          name: string
          notes: string | null
          owner_id: string
          target_amount: number
          target_currency: string
          target_date: string | null
        }
        Insert: {
          created_at?: string
          current_amount?: number
          id?: string
          monthly_contribution?: number | null
          name: string
          notes?: string | null
          owner_id: string
          target_amount: number
          target_currency: string
          target_date?: string | null
        }
        Update: {
          created_at?: string
          current_amount?: number
          id?: string
          monthly_contribution?: number | null
          name?: string
          notes?: string | null
          owner_id?: string
          target_amount?: number
          target_currency?: string
          target_date?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount_ars: number
          amount_usd: number | null
          category: string | null
          created_at: string
          date: string
          description: string | null
          external_id: string | null
          id: string
          merchant: string | null
          notes: string | null
          owner_id: string
          source: string
          subcategory: string | null
          tags: string[] | null
          type: string
          usd_rate_used: number | null
        }
        Insert: {
          account_id: string
          amount_ars: number
          amount_usd?: number | null
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          external_id?: string | null
          id?: string
          merchant?: string | null
          notes?: string | null
          owner_id: string
          source?: string
          subcategory?: string | null
          tags?: string[] | null
          type: string
          usd_rate_used?: number | null
        }
        Update: {
          account_id?: string
          amount_ars?: number
          amount_usd?: number | null
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          external_id?: string | null
          id?: string
          merchant?: string | null
          notes?: string | null
          owner_id?: string
          source?: string
          subcategory?: string | null
          tags?: string[] | null
          type?: string
          usd_rate_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_monthly_balance: {
        Row: {
          balance_ars: number | null
          expense_ars: number | null
          income_ars: number | null
          month: number | null
          owner_id: string | null
          year: number | null
        }
        Relationships: []
      }
      v_net_worth: {
        Row: {
          accounts_ars: number | null
          accounts_usd: number | null
          debts_ars: number | null
          debts_usd: number | null
          investments_ars: number | null
          investments_usd: number | null
          net_ars: number | null
          net_usd: number | null
          owner_id: string | null
        }
        Relationships: []
      }
      v_portfolio_by_type: {
        Row: {
          owner_id: string | null
          pct: number | null
          position_count: number | null
          type: string | null
          value_ars: number | null
          value_usd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_positions: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
