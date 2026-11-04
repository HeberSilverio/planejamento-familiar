import { describe, it, expect } from "vitest";
import { projectCashFlow, calculateMonthlyBalance, monthIndexOf } from "@/lib/finance/engine";
import type { FinanceData } from "@/lib/finance/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const base = (o: Partial<FinanceData> = {}): FinanceData => ({ incomes: [], recurring: [], commitments: [], debts: [], investments: [], transactions: [], settings: null, payments: [], ...o });
const inc = (amount: number, start = "2026-10-01") => ({ id: "i" + amount, name: "Renda", amount, in_budget: true, active: true, frequency: "monthly", start_date: start, end_date: null, member_id: null, pay_day: null }) as any;
const agua = { id: "r", name: "Água", amount: 90, kind: "expense", day_of_month: 10, start_date: "2026-10-10", end_date: null, category_id: null } as any;
const pay = (type: string, id: string, month: string, paidAt: string) => ({ source_type: type, source_id: id, month_key: month, paid_at: `${paidAt}T15:00:00Z` }) as any;
const byKey = (rows: ReturnType<typeof projectCashFlow>) => Object.fromEntries(rows.map((r) => [r.key, r]));

describe("competência x caixa", () => {
  it("1. água de outubro paga em novembro sai do caixa só em novembro", () => {
    const d = base({ incomes: [inc(1000)], recurring: [agua], payments: [pay("recurring", "r", "2026-10", "2026-11-04")] });
    const m = byKey(projectCashFlow(d, 2, "2026-11-20"));
    expect(m["2026-10"]!.budget.expense).toBe(90);
    expect(m["2026-10"]!.outflow).toBe(0);
    expect(m["2026-11"]!.settledFromPrevious).toBe(90);
    // nov: 90 de outubro + 90 de novembro (vence 10/11, não paga → já vencida, não sai do caixa)
    expect(m["2026-11"]!.outflow).toBe(90);
    expect(m["2026-11"]!.overdueOpen).toBe(90);
    expect(m["2026-11"]!.cumulative).toBe(1910);
  });

  it("2. água de outubro ainda não paga em dezembro fica como vencida sem nova despesa", () => {
    const d = base({ incomes: [inc(1000)], recurring: [{ ...agua, end_date: "2026-10-31" }] });
    const m = byKey(projectCashFlow(d, 2, "2026-12-05"));
    expect(m["2026-12"]!.budget.expense).toBe(0);
    expect(m["2026-12"]!.overdueOpen).toBe(90);
    expect(m["2026-12"]!.cumulative).toBe(3000);
    expect(m["2026-12"]!.liquid).toBe(2910);
    expect(m["2027-01"]!.overdueOpen).toBe(90);
  });

  it("3. parcela 2/10 de compromisso atrasada continua pendente de outubro", () => {
    const d = base({ commitments: [{ id: "c", name: "Sofá", kind: "installment", installment_amount: 200, installments_total: 10, first_due_date: "2026-09-05", due_day: 5, counts_toward_goal: false } as any],
      payments: [pay("commitment", "c", "2026-09", "2026-09-05")] });
    const m = byKey(projectCashFlow(d, 1, "2026-11-01"));
    // out (2/10) e nov (3/10, vence 05/11) — só outubro está vencida
    expect(m["2026-11"]!.overdueOpen).toBe(200);
    expect(calculateMonthlyBalance(d, monthIndexOf("2026-10-01")).items[0]!.note).toBe("2/10");
  });

  it("4. parcela de dívida atrasada fica em aberto até ser paga", () => {
    const d = base({ debts: [{ id: "x", name: "Empréstimo", installment_amount: 300, installments_total: 5, installments_paid: 0, first_due_date: "2026-10-15", total_amount: 1500 } as any] });
    const m = byKey(projectCashFlow(d, 1, "2026-11-01"));
    expect(m["2026-10"]!.outflow).toBe(0);
    expect(m["2026-11"]!.overdueOpen).toBe(300);
  });

  it("5. despesa avulsa pendente não mexe no caixa, mas reduz a disponibilidade", () => {
    const d = base({ incomes: [inc(1000)], transactions: [{ id: "t", description: "Farmácia", amount: 120, kind: "expense", date: "2026-10-15", paid: false, paid_at: null } as any] });
    const m = byKey(projectCashFlow(d, 1, "2026-11-02"));
    expect(m["2026-11"]!.cumulative).toBe(2000);
    expect(m["2026-11"]!.liquid).toBe(1880);
  });

  it("6. pagar conta antiga não duplica desembolso", () => {
    const d = base({ incomes: [inc(1000)], transactions: [{ id: "t", description: "Farmácia", amount: 120, kind: "expense", date: "2026-10-15", paid: true, paid_at: "2026-11-02T15:00:00Z" } as any] });
    const rows = projectCashFlow(d, 3, "2026-11-10");
    expect(rows.reduce((s, r) => s + r.outflow, 0)).toBe(120);
    expect(byKey(rows)["2026-11"]!.outflow).toBe(120);
    expect(byKey(rows)["2026-11"]!.overdueOpen).toBe(0);
  });

  it("7. déficits consecutivos se acumulam: -500 e depois -700", () => {
    const d = base({ incomes: [inc(4000, "2026-11-01")], transactions: [
      { id: "a", description: "Gastos", amount: 4500, kind: "expense", date: "2026-11-20", paid: false, paid_at: null } as any,
      { id: "b", description: "Gastos", amount: 4200, kind: "expense", date: "2026-12-20", paid: false, paid_at: null } as any,
    ] });
    const m = byKey(projectCashFlow(d, 2, "2026-11-10"));
    expect([m["2026-11"]!.cumulative, m["2026-12"]!.cumulative]).toEqual([-500, -700]);
  });

  it("8. consórcio + aporte compõem a meta de 30%: falta 500", () => {
    const d = base({ incomes: [inc(5000)],
      commitments: [{ id: "k", name: "Consórcio", kind: "recurring", installment_amount: 674.6, installments_total: null, first_due_date: "2026-10-14", due_day: 14, counts_toward_goal: true } as any],
      investments: [{ id: "v", name: "Reserva", monthly_contribution: 325.4, counts_toward_goal: true, start_date: "2026-10-01", end_date: null } as any] });
    const r = calculateMonthlyBalance(d, monthIndexOf("2026-11-01"));
    expect([r.target, r.countedInvestment, r.remaining, r.expense]).toEqual([1500, 1000, 500, 0]);
  });
});
