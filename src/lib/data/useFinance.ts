import { useMemo } from "react";
import { useTable } from "./tables";
import type {
  Commitment, Debt, FinanceData, Income, Investment, ObligationPayment, Recurring, Settings, Transaction,
} from "@/lib/finance/types";

/** Carrega tudo que o motor precisa. Recalcula automaticamente quando qualquer tabela muda. */
export function useFinance() {
  const incomes = useTable<Income>("income_sources");
  const recurring = useTable<Recurring>("recurring_transactions");
  const commitments = useTable<Commitment>("commitments");
  const debts = useTable<Debt>("debts");
  const investments = useTable<Investment>("investments");
  const transactions = useTable<Transaction>("transactions", "date");
  const settings = useTable<Settings>("user_settings");
  const payments = useTable<ObligationPayment>("obligation_payments");

  const all = [incomes, recurring, commitments, debts, investments, transactions, settings, payments];
  const isLoading = all.some((q) => q.isLoading);

  const data: FinanceData = useMemo(
    () => ({
      incomes: incomes.data ?? [],
      recurring: recurring.data ?? [],
      commitments: commitments.data ?? [],
      debts: debts.data ?? [],
      investments: investments.data ?? [],
      transactions: transactions.data ?? [],
      settings: settings.data?.[0] ?? null,
      payments: payments.data ?? [],
    }),
    [incomes.data, recurring.data, commitments.data, debts.data, investments.data, transactions.data, settings.data, payments.data],
  );

  return { data, isLoading };
}
