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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achieved_at: string
          created_at: string
          description: string | null
          id: string
          member_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commitment_installments: {
        Row: {
          amount: number
          commitment_id: string
          created_at: string
          due_date: string
          id: string
          number: number
          paid: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          commitment_id: string
          created_at?: string
          due_date: string
          id?: string
          number: number
          paid?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          commitment_id?: string
          created_at?: string
          due_date?: string
          id?: string
          number?: number
          paid?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_installments_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          category_id: string | null
          counts_toward_goal: boolean
          created_at: string
          credit_card_id: string | null
          due_day: number | null
          first_due_date: string
          id: string
          installment_amount: number
          installments_total: number | null
          kind: Database["public"]["Enums"]["commitment_kind"]
          member_id: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          counts_toward_goal?: boolean
          created_at?: string
          credit_card_id?: string | null
          due_day?: number | null
          first_due_date?: string
          id?: string
          installment_amount: number
          installments_total?: number | null
          kind?: Database["public"]["Enums"]["commitment_kind"]
          member_id?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string | null
          counts_toward_goal?: boolean
          created_at?: string
          credit_card_id?: string | null
          due_day?: number | null
          first_due_date?: string
          id?: string
          installment_amount?: number
          installments_total?: number | null
          kind?: Database["public"]["Enums"]["commitment_kind"]
          member_id?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          closing_day: number | null
          created_at: string
          credit_limit: number
          due_day: number | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closing_day?: number | null
          created_at?: string
          credit_limit?: number
          due_day?: number | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          closing_day?: number | null
          created_at?: string
          credit_limit?: number
          due_day?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debt_installments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          due_date: string
          id: string
          number: number
          paid: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id: string
          due_date: string
          id?: string
          number: number
          paid?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          due_date?: string
          id?: string
          number?: number
          paid?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_installments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          creditor: string | null
          first_due_date: string
          id: string
          installment_amount: number
          installments_paid: number
          installments_total: number
          interest_rate: number | null
          name: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creditor?: string | null
          first_due_date?: string
          id?: string
          installment_amount: number
          installments_paid?: number
          installments_total: number
          interest_rate?: number | null
          name: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          creditor?: string | null
          first_due_date?: string
          id?: string
          installment_amount?: number
          installments_paid?: number
          installments_total?: number
          interest_rate?: number | null
          name?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          birth_year: number | null
          created_at: string
          id: string
          in_budget: boolean
          name: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          id?: string
          in_budget?: boolean
          name: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          id?: string
          in_budget?: boolean
          name?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          created_at: string
          current_amount: number
          id: string
          monthly_contribution: number
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          id?: string
          monthly_contribution?: number
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          id?: string
          monthly_contribution?: number
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_profiles: {
        Row: {
          created_at: string
          id: string
          member_id: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          in_budget: boolean
          member_id: string | null
          name: string
          pay_day: number | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          in_budget?: boolean
          member_id?: string | null
          name: string
          pay_day?: number | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          in_budget?: boolean
          member_id?: string | null
          name?: string
          pay_day?: number | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          investment_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          investment_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          investment_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_contributions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          counts_toward_goal: boolean
          created_at: string
          current_balance: number
          end_date: string | null
          id: string
          monthly_contribution: number
          name: string
          start_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          counts_toward_goal?: boolean
          created_at?: string
          current_balance?: number
          end_date?: string | null
          id?: string
          monthly_contribution?: number
          name: string
          start_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          counts_toward_goal?: boolean
          created_at?: string
          current_balance?: number
          end_date?: string | null
          id?: string
          monthly_contribution?: number
          name?: string
          start_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_missions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          member_id: string
          mission_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          member_id: string
          mission_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          member_id?: string
          mission_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_missions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reward: string | null
          title: string
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reward?: string | null
          title: string
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reward?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      obligation_payments: {
        Row: {
          created_at: string
          id: string
          month_key: string
          paid_at: string
          source_id: string
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_key: string
          paid_at?: string
          source_id: string
          source_type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          month_key?: string
          paid_at?: string
          source_id?: string
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planned_purchases: {
        Row: {
          amount: number
          created_at: string
          id: string
          installments: number
          name: string
          priority: number
          purchased: boolean
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          installments?: number
          name: string
          priority?: number
          purchased?: boolean
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installments?: number
          name?: string
          priority?: number
          purchased?: boolean
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          day_of_month: number | null
          end_date: string | null
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          name: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          name: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          name?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["sim_item_kind"]
          months: number
          name: string
          simulation_id: string
          start_offset: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["sim_item_kind"]
          months?: number
          name: string
          simulation_id: string
          start_offset?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["sim_item_kind"]
          months?: number
          name?: string
          simulation_id?: string
          start_offset?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_items_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          date: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          member_id: string | null
          paid: boolean
          paid_at: string | null
          payment_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description: string
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          member_id?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          member_id?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          attention_threshold: number
          created_at: string
          family_name: string
          id: string
          investment_target_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attention_threshold?: number
          created_at?: string
          family_name?: string
          id?: string
          investment_target_pct?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          attention_threshold?: number
          created_at?: string
          family_name?: string
          id?: string
          investment_target_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      commitment_kind: "recurring" | "installment"
      sim_item_kind: "expense" | "income" | "debt"
      tx_kind: "income" | "expense"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      commitment_kind: ["recurring", "installment"],
      sim_item_kind: ["expense", "income", "debt"],
      tx_kind: ["income", "expense"],
    },
  },
} as const
