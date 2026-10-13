import type { Database } from "@/integrations/supabase/types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type TableName = keyof Database["public"]["Tables"];
export type Member = Row<"family_members">;
export type Income = Row<"income_sources">;
export type Category = Row<"categories">;
export type CreditCard = Row<"credit_cards">;
export type Transaction = Row<"transactions">;
export type Recurring = Row<"recurring_transactions">;
export type Commitment = Row<"commitments">;
export type Debt = Row<"debts">;
export type Purchase = Row<"planned_purchases">;
export type Investment = Row<"investments">;
export type Goal = Row<"financial_goals">;
export type Simulation = Row<"simulations">;
export type SimulationItem = Row<"simulation_items">;
export type Settings = Row<"user_settings">;
export type Mission = Row<"missions">;
export type ObligationPayment = Row<"obligation_payments">;
export type MemberMission = Row<"member_missions">;
export type GamificationProfile = Row<"gamification_profiles">;

export interface SimItem {
  name: string;
  kind: "expense" | "income" | "debt";
  amount: number;
  months: number; // 0 = permanente
  start_offset: number;
}

export interface FinanceData {
  incomes: Income[];
  recurring: Recurring[];
  commitments: Commitment[];
  debts: Debt[];
  investments: Investment[];
  transactions: Transaction[];
  settings: Settings | null;
  payments?: ObligationPayment[] | undefined;
}

export type HealthStatus = "positivo" | "atencao" | "negativo";

export interface MonthItem {
  label: string;
  amount: number;
  group: "income" | "expense" | "investment";
  source: "income" | "recurring" | "commitment" | "debt" | "transaction" | "investment" | "simulation";
  note?: string | undefined;
  isLast?: boolean | undefined;
  refId?: string | undefined;
  cardId?: string | null | undefined;
  day?: number | undefined;
  dueDate?: string | undefined;
  paid?: boolean | undefined;
  /** Como liquidar: transação avulsa ou ocorrência mensal de recorrente/compromisso/dívida. */
  payType?: "transaction" | "recurring" | "commitment" | "debt" | undefined;
  monthKey?: string | undefined;
  recurring?: boolean | undefined;
  countsTowardGoal?: boolean | undefined;
  memberId?: string | null | undefined;
  categoryId?: string | null | undefined;
}

export interface MonthResult {
  mi: number;
  key: string;
  label: string;
  fullLabel: string;
  items: MonthItem[];
  income: number;
  expense: number;
  paidExpense: number;
  openExpense: number;
  pendingCount: number;
  investment: number;
  countedInvestment: number;
  target: number;
  targetPct: number;
  remaining: number;
  balance: number;
  balanceAfterTarget: number;
  status: HealthStatus;
}
