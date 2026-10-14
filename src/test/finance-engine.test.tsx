import { describe, it, expect } from "vitest";
import { calculateMonthlyBalance, incomeAmountInMonth, listDueItems, monthIndexOf } from "@/lib/finance/engine";
import type { FinanceData } from "@/lib/finance/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const inc = (o: any) => ({ id: o.id ?? "i", name: "Renda", amount: 1000, in_budget: true, active: true, frequency: "monthly", start_date: "2026-11-01", end_date: null, member_id: null, pay_day: null, ...o }) as any;
const base = (o: Partial<FinanceData> = {}): FinanceData => ({ incomes: [], recurring: [], commitments: [], debts: [], investments: [], transactions: [], settings: null, payments: [], ...o });
const mi = (s: string) => monthIndexOf(s);

describe("receitas", () => {
  it("renda de nov a jan não aparece em out nem fev", () => {
    const r = inc({ start_date: "2026-11-01", end_date: "2027-01-31" });
    expect([mi("2026-10-01"), mi("2026-11-01"), mi("2026-12-01"), mi("2027-01-01"), mi("2027-02-01")].map((m) => incomeAmountInMonth(r, m))).toEqual([0, 1000, 1000, 1000, 0]);
  });
  it("renda fora do orçamento não soma na família", () => {
    const d = base({ incomes: [inc({ amount: 5600 }), inc({ id: "x", amount: 700, in_budget: false })] });
    expect(calculateMonthlyBalance(d, mi("2026-11-01")).income).toBe(5600);
  });
  it("renda inativa não gera recebimento", () => {
    expect(incomeAmountInMonth(inc({ active: false }), mi("2026-11-01"))).toBe(0);
  });
});

describe("despesas e pagamento", () => {
  const tx = (o: any) => ({ id: "t", description: "Supermercado", amount: 180, kind: "expense", date: "2026-11-05", paid: true, category_id: null, member_id: null, credit_card_id: null, ...o }) as any;
  it("despesa paga continua no total do mês", () => {
    const r = calculateMonthlyBalance(base({ transactions: [tx({})] }), mi("2026-11-01"));
    expect([r.expense, r.paidExpense, r.openExpense]).toEqual([180, 180, 0]);
  });
  it("vencida e próximos 3 dias, pagas fora dos alertas", () => {
    const d = base({ transactions: [
      tx({ id: "a", date: "2026-11-01", paid: false }),
      tx({ id: "b", date: "2026-11-10", paid: false }),
      tx({ id: "c", date: "2026-11-13", paid: false }),
      tx({ id: "d", date: "2026-11-14", paid: false }),
      tx({ id: "e", date: "2026-11-02", paid: true }),
    ] });
    const r = listDueItems(d, "2026-11-10");
    expect(r.overdue.map((i) => i.refId)).toEqual(["a"]);
    expect(r.soon.map((i) => i.refId)).toEqual(["b", "c"]);
  });
  it("pagar outubro de uma recorrente não paga novembro", () => {
    const d = base({ recurring: [{ id: "r", name: "Internet", amount: 90, kind: "expense", day_of_month: 10, start_date: "2026-10-10", end_date: null, category_id: null } as any],
      payments: [{ source_type: "recurring", source_id: "r", month_key: "2026-10" } as any] });
    expect(calculateMonthlyBalance(d, mi("2026-10-01")).paidExpense).toBe(90);
    expect(calculateMonthlyBalance(d, mi("2026-11-01")).paidExpense).toBe(0);
  });
  it("parcelado em 3x não gera quarta parcela", () => {
    const d = base({ commitments: [{ id: "c", name: "TV", kind: "installment", installment_amount: 100, installments_total: 3, first_due_date: "2026-11-05", due_day: 5, counts_toward_goal: false } as any] });
    const tot = ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"].map((m) => calculateMonthlyBalance(d, mi(m)).expense);
    expect(tot).toEqual([100, 100, 100, 0]);
  });
});

describe("meta de investimento", () => {
  it("consórcio conta uma vez: meta 1680, falta 1005,40", () => {
    const d = base({ incomes: [inc({ amount: 5600 })],
      commitments: [{ id: "k", name: "Consórcio", kind: "recurring", installment_amount: 674.6, installments_total: null, first_due_date: "2026-10-14", due_day: 14, counts_toward_goal: true } as any] });
    const r = calculateMonthlyBalance(d, mi("2026-11-01"));
    expect([r.target, r.countedInvestment, r.remaining, r.expense, r.balance, r.balanceAfterTarget]).toEqual([1680, 674.6, 1005.4, 0, 4925.4, 3920]);
  });
});
