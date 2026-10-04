/**
 * Motor financeiro central. TODAS as regras de cálculo vivem aqui.
 * Dashboard, Planejamento, Simulador, Relatórios e Objetivos usam estas funções.
 * Funções puras: recebem dados, devolvem resultados. Nada de acesso ao banco.
 */
import type {
  FinanceData,
  MonthItem,
  MonthResult,
  SimItem,
  HealthStatus,
  Goal,
  Debt,
} from "./types";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_PT_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Índice absoluto de mês (ano*12 + mês0). */
export function monthIndexOf(date: string | Date): number {
  if (typeof date === "string") {
    const [y, m] = date.split("-").map(Number);
    return y * 12 + (m - 1);
  }
  return date.getFullYear() * 12 + date.getMonth();
}

export function currentMonthIndex(): number {
  return monthIndexOf(new Date());
}

export function monthLabel(mi: number, full = false): string {
  const y = Math.floor(mi / 12);
  const m = mi % 12;
  return full ? `${MONTHS_PT_FULL[m]} ${y}` : `${MONTHS_PT[m]}/${String(y).slice(2)}`;
}

export function monthKey(mi: number): string {
  return `${Math.floor(mi / 12)}-${String((mi % 12) + 1).padStart(2, "0")}`;
}

export function monthIndexToDate(mi: number, day = 1): string {
  return `${monthKey(mi)}-${String(day).padStart(2, "0")}`;
}

function activeBetween(start: string | null | undefined, end: string | null | undefined, mi: number) {
  if (start && mi < monthIndexOf(start)) return false;
  if (end && mi > monthIndexOf(end)) return false;
  return true;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

/** Meta de investimento = % das receitas elegíveis. */
export function calculateInvestmentTarget(eligibleIncome: number, pct: number) {
  return round2((eligibleIncome * pct) / 100);
}

/** Quanto falta para a meta. O consórcio entra como parte da meta (não conta duas vezes). */
export function calculateInvestmentRemaining(target: number, countedInvestments: number) {
  return round2(Math.max(0, target - countedInvestments));
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

/** Itens simulados ativos no mês (offset relativo ao mês base). */
function simItemsForMonth(items: SimItem[], mi: number, baseMi: number): MonthItem[] {
  const offset = mi - baseMi;
  return items
    .filter((it) => offset >= it.start_offset && (it.months === 0 || offset < it.start_offset + it.months))
    .map((it) => ({
      label: it.name,
      amount: n(it.amount),
      group: it.kind === "income" ? "income" : "expense",
      source: "simulation",
      note: it.months > 0 ? `${offset - it.start_offset + 1}/${it.months}` : "simulado",
    }));
}

/** Compromissos futuros (parcelas e recorrentes) num mês. */
export function calculateFutureCommitments(data: FinanceData, mi: number): MonthItem[] {
  const items: MonthItem[] = [];
  for (const c of data.commitments) {
    const first = monthIndexOf(c.first_due_date);
    const num = mi - first + 1;
    if (num < 1) continue;
    if (c.kind === "installment") {
      const total = c.installments_total ?? 1;
      if (num > total) continue;
      items.push({
        label: c.name,
        amount: n(c.installment_amount),
        group: "expense",
        source: "commitment",
        note: `${num}/${total}`,
        isLast: num === total,
        refId: c.id,
        cardId: c.credit_card_id,
        day: c.due_day ?? undefined,
      });
    } else {
      items.push({
        label: c.name,
        amount: n(c.installment_amount),
        group: "expense",
        source: "commitment",
        note: "recorrente",
        refId: c.id,
        cardId: c.credit_card_id,
        day: c.due_day ?? undefined,
      });
    }
  }
  for (const d of data.debts) {
    const first = monthIndexOf(d.first_due_date);
    const num = mi - first + 1;
    if (num < 1 || num > d.installments_total || num <= d.installments_paid) continue;
    items.push({
      label: d.name,
      amount: n(d.installment_amount),
      group: "expense",
      source: "debt",
      note: `${num}/${d.installments_total}`,
      isLast: num === d.installments_total,
      refId: d.id,
    });
  }
  return items;
}

/** Balanço completo de um mês. */
export function calculateMonthlyBalance(
  data: FinanceData,
  mi: number,
  sim: SimItem[] = [],
  baseMi = currentMonthIndex(),
): MonthResult {
  const items: MonthItem[] = [];

  for (const inc of data.incomes) {
    if (!inc.in_budget) continue; // rendas fora do orçamento não entram
    if (!activeBetween(inc.start_date, inc.end_date, mi)) continue;
    items.push({ label: inc.name, amount: n(inc.amount), group: "income", source: "income" });
  }

  for (const r of data.recurring) {
    if (!activeBetween(r.start_date, r.end_date, mi)) continue;
    items.push({
      label: r.name,
      amount: n(r.amount),
      group: r.kind === "income" ? "income" : "expense",
      source: "recurring",
      day: r.day_of_month ?? undefined,
    });
  }

  items.push(...calculateFutureCommitments(data, mi));

  for (const t of data.transactions) {
    if (monthIndexOf(t.date) !== mi) continue;
    items.push({
      label: t.description,
      amount: n(t.amount),
      group: t.kind === "income" ? "income" : "expense",
      source: "transaction",
    });
  }

  let counted = 0;
  for (const inv of data.investments) {
    if (!activeBetween(inv.start_date, inv.end_date, mi)) continue;
    const amt = n(inv.monthly_contribution);
    if (amt <= 0) continue;
    if (inv.counts_toward_goal) counted += amt;
    items.push({
      label: inv.name,
      amount: amt,
      group: "investment",
      source: "investment",
      note: inv.counts_toward_goal ? "conta na meta" : undefined,
    });
  }

  items.push(...simItemsForMonth(sim, mi, baseMi));

  const income = round2(items.filter((i) => i.group === "income").reduce((s, i) => s + i.amount, 0));
  const expense = round2(items.filter((i) => i.group === "expense").reduce((s, i) => s + i.amount, 0));
  const investment = round2(items.filter((i) => i.group === "investment").reduce((s, i) => s + i.amount, 0));
  const pct = n(data.settings?.investment_target_pct ?? 30);
  const target = calculateInvestmentTarget(income, pct);
  const remaining = calculateInvestmentRemaining(target, counted);
  const balance = round2(income - expense - investment);
  const balanceAfterTarget = round2(balance - remaining);

  return {
    mi,
    key: monthKey(mi),
    label: monthLabel(mi),
    fullLabel: monthLabel(mi, true),
    items,
    income,
    expense,
    investment,
    countedInvestment: round2(counted),
    target,
    targetPct: pct,
    remaining,
    balance,
    balanceAfterTarget,
    status: calculateFinancialHealth(balance, balanceAfterTarget),
  };
}

/** POSITIVO: cobre despesas e a meta. ATENÇÃO: cobre despesas mas não a meta. NEGATIVO: falta dinheiro. */
export function calculateFinancialHealth(balance: number, balanceAfterTarget: number): HealthStatus {
  if (balance < 0) return "negativo";
  if (balanceAfterTarget < 0) return "atencao";
  return "positivo";
}

export function projectMonths(data: FinanceData, count: number, sim: SimItem[] = [], start = currentMonthIndex()) {
  return Array.from({ length: count }, (_, i) => calculateMonthlyBalance(data, start + i, sim, start));
}

export interface HorizonSummary {
  months: number;
  label: string;
  income: number;
  expense: number;
  investment: number;
  balance: number;
  balanceAfterTarget: number;
  negativeMonths: number;
}

export const HORIZONS = [
  { months: 6, label: "6 meses" },
  { months: 12, label: "1 ano" },
  { months: 24, label: "2 anos" },
  { months: 60, label: "5 anos" },
];

export function summarize(results: MonthResult[], months: number, label: string): HorizonSummary {
  const slice = results.slice(0, months);
  const sum = (k: keyof MonthResult) => round2(slice.reduce((s, r) => s + (r[k] as number), 0));
  return {
    months,
    label,
    income: sum("income"),
    expense: sum("expense"),
    investment: sum("investment"),
    balance: sum("balance"),
    balanceAfterTarget: sum("balanceAfterTarget"),
    negativeMonths: slice.filter((r) => r.status === "negativo").length,
  };
}

/** Impacto de uma simulação nos horizontes, comparando com o planejamento real. */
export function calculateSimulationImpact(data: FinanceData, sim: SimItem[]) {
  const base = projectMonths(data, 60);
  const scen = projectMonths(data, 60, sim);
  const monthly = round2(scen[0].balance - base[0].balance);
  return {
    monthly,
    base,
    scenario: scen,
    horizons: HORIZONS.map((h) => {
      const b = summarize(base, h.months, h.label);
      const s = summarize(scen, h.months, h.label);
      return { ...h, base: b, scenario: s, delta: round2(s.balance - b.balance) };
    }),
  };
}

/** Limite seguro de gastos: o que sobra após despesas, investimentos e o que falta da meta. */
export function calculateSafeSpendingLimit(month: MonthResult) {
  return {
    limit: round2(Math.max(0, month.balanceAfterTarget)),
    steps: [
      { label: "Receitas previstas", value: month.income },
      { label: "Despesas previstas", value: -month.expense },
      { label: "Investimentos já previstos", value: -month.investment },
      { label: "Falta para a meta de investimento", value: -month.remaining },
    ],
  };
}

export function calculateGoalProjection(goal: Goal) {
  const target = n(goal.target_amount);
  const current = n(goal.current_amount);
  const monthly = n(goal.monthly_contribution);
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const missing = Math.max(0, target - current);
  const monthsToReach = missing === 0 ? 0 : monthly > 0 ? Math.ceil(missing / monthly) : null;
  const eta = monthsToReach == null ? null : currentMonthIndex() + monthsToReach;
  let late = false;
  if (goal.target_date && eta != null) late = eta > monthIndexOf(goal.target_date);
  if (goal.target_date && monthsToReach == null && missing > 0) late = true;
  return { progress, missing: round2(missing), monthsToReach, eta, late };
}

export function calculateDebtProjection(debt: Debt) {
  const remainingInstallments = Math.max(0, debt.installments_total - debt.installments_paid);
  const payoffMi = monthIndexOf(debt.first_due_date) + debt.installments_total - 1;
  return {
    remainingInstallments,
    remainingAmount: round2(remainingInstallments * n(debt.installment_amount)),
    payoffMi,
    payoffLabel: monthLabel(payoffMi, true),
    progress: debt.installments_total ? (debt.installments_paid / debt.installments_total) * 100 : 0,
  };
}

/** Primeiro mês (até 24 à frente) em que a compra cabe sem deixar nenhum mês abaixo da meta. */
export function findPurchaseFit(data: FinanceData, amount: number, installments: number) {
  const per = amount / Math.max(1, installments);
  const proj = projectMonths(data, 24 + installments);
  for (let s = 0; s < 24; s++) {
    let ok = true;
    for (let k = 0; k < installments; k++) {
      if (proj[s + k].balanceAfterTarget - per < 0) {
        ok = false;
        break;
      }
    }
    if (ok) return { offset: s, mi: proj[s].mi, label: proj[s].fullLabel, perMonth: round2(per) };
  }
  return null;
}

/** Nível de gamificação a partir do XP. */
export function levelFromXp(xp: number) {
  const level = Math.floor(xp / 100) + 1;
  return { level, progress: xp % 100, next: level * 100 };
}
