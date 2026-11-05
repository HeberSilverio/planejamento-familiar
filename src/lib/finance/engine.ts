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
  Income,
} from "./types";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_PT_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Índice absoluto de mês (ano*12 + mês0). */
export function monthIndexOf(date: string | Date): number {
  if (typeof date === "string") {
    const [y = 0, m = 1] = date.split("-").map(Number);
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

/** Data de hoje (YYYY-MM-DD) no fuso America/Sao_Paulo. */
export function todaySaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}

/** Data de vencimento no mês, ajustando o dia ao último dia do mês. */
export function dueDateIn(mi: number, day: number | null | undefined): string {
  const y = Math.floor(mi / 12);
  const m = mi % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return monthIndexToDate(mi, Math.min(Math.max(1, day ?? 1), last));
}

function paymentOf(data: FinanceData, type: string, id: string, mi: number) {
  const key = monthKey(mi);
  return (data.payments ?? []).find((p) => p.source_type === type && p.source_id === id && p.month_key === key);
}

/** Campos de liquidação de uma ocorrência mensal (paga + data efetiva do pagamento). */
function settle(data: FinanceData, type: string, id: string, mi: number) {
  const p = paymentOf(data, type, id, mi);
  return { paid: !!p, paidAt: p?.paid_at ? todaySaoPaulo(new Date(p.paid_at)) : undefined };
}

/**
 * Quanto uma fonte de renda gera num mês, respeitando vigência, frequência e status.
 * Rendas inativas ou fora do orçamento geram zero para a família.
 */
export function incomeAmountInMonth(inc: Income, mi: number): number {
  if (inc.active === false) return 0;
  const amount = n(inc.amount);
  const freq = inc.frequency ?? "monthly";
  if (freq === "monthly") return activeBetween(inc.start_date, inc.end_date, mi) ? amount : 0;
  if (freq === "annual") {
    if (!activeBetween(inc.start_date, inc.end_date, mi)) return 0;
    return monthIndexOf(inc.start_date) % 12 === mi % 12 ? amount : 0;
  }
  const step = freq === "weekly" ? 7 : 14;
  const monthStart = monthIndexToDate(mi, 1);
  const monthEnd = dueDateIn(mi, 31);
  let d = inc.start_date;
  if (d < monthStart) d = addDays(d, Math.ceil(daysBetween(d, monthStart) / step) * step);
  let count = 0;
  while (d <= monthEnd) {
    if (inc.end_date && d > inc.end_date) break;
    count++;
    d = addDays(d, step);
  }
  return round2(count * amount);
}

/** Receita familiar elegível do mês (fonte oficial: Família > Fontes de renda). */
export function eligibleIncome(incomes: Income[], mi: number): number {
  return round2(incomes.filter((i) => i.in_budget).reduce((s, i) => s + incomeAmountInMonth(i, mi), 0));
}

/** Compromissos futuros (parcelas e recorrentes) num mês. */
export function calculateFutureCommitments(data: FinanceData, mi: number): MonthItem[] {
  const items: MonthItem[] = [];
  for (const c of data.commitments) {
    const first = monthIndexOf(c.first_due_date);
    const num = mi - first + 1;
    if (num < 1) continue;
    const isInstallment = c.kind === "installment" && c.installments_total != null;
    const total = c.installments_total ?? 1;
    if (isInstallment && num > total) continue;
    const goal = !!c.counts_toward_goal;
    items.push({
      label: c.name,
      amount: n(c.installment_amount),
      group: goal ? "investment" : "expense",
      source: "commitment",
      note: isInstallment ? `${num}/${total}` : "recorrente",
      isLast: isInstallment && num === total,
      recurring: !isInstallment,
      refId: c.id,
      cardId: c.credit_card_id,
      memberId: c.member_id,
      categoryId: c.category_id,
      day: c.due_day ?? undefined,
      dueDate: dueDateIn(mi, c.due_day ?? Number(c.first_due_date.slice(8, 10))),
      ...settle(data, "commitment", c.id, mi),
      payType: "commitment",
      monthKey: monthKey(mi),
      countsTowardGoal: goal,
    });
  }
  for (const d of data.debts) {
    const first = monthIndexOf(d.first_due_date);
    const num = mi - first + 1;
    if (num < 1 || num > d.installments_total) continue;
    items.push({
      label: d.name,
      amount: n(d.installment_amount),
      group: "expense",
      source: "debt",
      note: `${num}/${d.installments_total}`,
      isLast: num === d.installments_total,
      refId: d.id,
      dueDate: dueDateIn(mi, Number(d.first_due_date.slice(8, 10))),
      ...(num <= d.installments_paid ? { paid: true } : settle(data, "debt", d.id, mi)),
      payType: "debt",
      monthKey: monthKey(mi),
    });
  }
  return items;
}

/** Balanço completo de um mês. Não depende de saldo bancário. */
export function calculateMonthlyBalance(
  data: FinanceData,
  mi: number,
  sim: SimItem[] = [],
  baseMi = currentMonthIndex(),
): MonthResult {
  const items: MonthItem[] = [];

  for (const inc of data.incomes) {
    if (!inc.in_budget) continue; // rendas fora do orçamento não entram
    const amt = incomeAmountInMonth(inc, mi);
    if (amt <= 0) continue;
    items.push({ label: inc.name, amount: amt, group: "income", source: "income", memberId: inc.member_id, day: inc.pay_day ?? undefined });
  }

  for (const r of data.recurring) {
    if (!activeBetween(r.start_date, r.end_date, mi)) continue;
    const isIncome = r.kind === "income";
    items.push({
      label: r.name,
      amount: n(r.amount),
      group: isIncome ? "income" : "expense",
      source: "recurring",
      note: "recorrente",
      recurring: true,
      refId: r.id,
      categoryId: r.category_id,
      day: r.day_of_month ?? undefined,
      ...(isIncome ? {} : {
        dueDate: dueDateIn(mi, r.day_of_month ?? Number(r.start_date.slice(8, 10))),
        ...settle(data, "recurring", r.id, mi),
        payType: "recurring" as const,
        monthKey: monthKey(mi),
      }),
    });
  }

  items.push(...calculateFutureCommitments(data, mi));

  for (const t of data.transactions) {
    if (monthIndexOf(t.date) !== mi) continue;
    const isIncome = t.kind === "income";
    items.push({
      label: t.description,
      amount: n(t.amount),
      group: isIncome ? "income" : "expense",
      source: "transaction",
      refId: t.id,
      memberId: t.member_id,
      categoryId: t.category_id,
      cardId: t.credit_card_id,
      day: Number(t.date.slice(8, 10)),
      ...(isIncome ? {} : {
        dueDate: t.date, paid: !!t.paid, payType: "transaction" as const,
        paidAt: t.paid && t.paid_at ? todaySaoPaulo(new Date(t.paid_at)) : undefined,
      }),
    });
  }

  let counted = 0;
  for (const it of items) if (it.countsTowardGoal) counted += it.amount;
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

  const sum = (f: (i: MonthItem) => boolean) => round2(items.filter(f).reduce((s, i) => s + i.amount, 0));
  const income = sum((i) => i.group === "income");
  const expense = sum((i) => i.group === "expense");
  const investment = sum((i) => i.group === "investment");
  const paidExpense = sum((i) => i.group === "expense" && i.paid === true);
  const openExpense = round2(expense - paidExpense);
  const pendingCount = items.filter((i) => i.payType && !i.paid).length;
  const pct = n(data.settings?.investment_target_pct ?? 30);
  const target = calculateInvestmentTarget(income, pct);
  const remaining = calculateInvestmentRemaining(target, counted);
  const balance = round2(income - expense - investment);
  // Os investimentos contabilizados já foram descontados; reserva só o que falta da meta.
  const balanceAfterTarget = round2(balance - remaining);

  return {
    mi,
    key: monthKey(mi),
    label: monthLabel(mi),
    fullLabel: monthLabel(mi, true),
    items,
    income,
    expense,
    paidExpense,
    openExpense,
    pendingCount,
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

export interface DueItem extends MonthItem {
  dueDate: string;
  daysLate: number;
}

/** Pendências: vencidas (antes de hoje) e que vencem de hoje até hoje+3, sempre não pagas. */
export function listDueItems(data: FinanceData, today = todaySaoPaulo()) {
  const curMi = monthIndexOf(today);
  const limit = addDays(today, 3);
  const all: DueItem[] = [];
  for (let mi = curMi - 24; mi <= curMi + 1; mi++) {
    for (const it of calculateMonthlyBalance(data, mi, [], curMi).items) {
      if (!it.payType || it.paid || !it.dueDate || it.dueDate > limit) continue;
      all.push({ ...it, dueDate: it.dueDate, daysLate: Math.max(0, daysBetween(it.dueDate, today)) });
    }
  }
  all.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    overdue: all.filter((i) => i.dueDate < today),
    soon: all.filter((i) => i.dueDate >= today),
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
  const monthly = round2(scen[0]!.balance - base[0]!.balance);
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
      if (proj[s + k]!.balanceAfterTarget - per < 0) {
        ok = false;
        break;
      }
    }
    if (ok) return { offset: s, mi: proj[s]!.mi, label: proj[s]!.fullLabel, perMonth: round2(per) };
  }
  return null;
}

/** Nível de gamificação a partir do XP. */
export function levelFromXp(xp: number) {
  const level = Math.floor(xp / 100) + 1;
  return { level, progress: xp % 100, next: level * 100 };
}

/**
 * Simula a quitação mês a mês. Parcelas normais seguem; o valor extra (mais as parcelas
 * liberadas de dívidas quitadas) amortiza a dívida-alvo: menor saldo (snowball) ou maior juros (avalanche).
 */
export function simulateDebtPayoff(debts: Debt[], extra: number, strategy: "snowball" | "avalanche") {
  const list = debts
    .map((d) => {
      const rem = Math.max(0, d.installments_total - d.installments_paid);
      return { name: d.name, bal: rem * n(d.installment_amount), pay: n(d.installment_amount), rate: n(d.interest_rate) / 100, done: 0 };
    })
    .filter((d) => d.bal > 0);
  let month = 0;
  let interest = 0;
  const order: { name: string; month: number }[] = [];
  while (list.some((d) => d.bal > 0.005) && month < 600) {
    month++;
    let pool = extra;
    for (const d of list) {
      if (d.bal <= 0.005) { pool += d.pay; continue; }
      const j = d.bal * d.rate;
      interest += j;
      d.bal += j;
      const p = Math.min(d.pay, d.bal);
      d.bal -= p;
      pool += d.pay - p;
    }
    const open = list.filter((d) => d.bal > 0.005)
      .sort((a, b) => (strategy === "snowball" ? a.bal - b.bal : b.rate - a.rate || a.bal - b.bal));
    for (const d of open) {
      if (pool <= 0) break;
      const p = Math.min(pool, d.bal);
      d.bal -= p;
      pool -= p;
    }
    for (const d of list) if (d.bal <= 0.005 && !d.done) { d.done = month; order.push({ name: d.name, month }); }
  }
  return { months: month, interest: round2(interest), order };
}

/* ===================== Fluxo de caixa (competência x caixa) ===================== */

export interface CashMonth {
  mi: number;
  key: string;
  label: string;
  /** Visão de competência do mês (orçamento). */
  budget: MonthResult;
  inflow: number;
  /** Saídas efetivas/previstas no caixa deste mês. */
  outflow: number;
  /** Parte das saídas que liquida contas de meses anteriores. */
  settledFromPrevious: number;
  net: number;
  /** Saldo operacional acumulado desde o marco zero (sem saldo bancário). */
  cumulative: number;
  /** Obrigações vencidas e não pagas ao fim do mês (ou hoje, no mês atual). */
  overdueOpen: number;
  /** Disponibilidade líquida = acumulado − vencidas em aberto. */
  liquid: number;
}

/** Marco zero: primeiro mês com dado cadastrado (limitado a 24 meses atrás). */
export function planningStartMonth(data: FinanceData, curMi: number): number {
  const dates = [
    ...data.incomes.filter((i) => i.in_budget).map((i) => i.start_date),
    ...data.recurring.map((r) => r.start_date),
    ...data.commitments.map((c) => c.first_due_date),
    ...data.debts.map((d) => d.first_due_date),
    ...data.investments.map((i) => i.start_date),
    ...data.transactions.map((t) => t.date),
  ].filter(Boolean) as string[];
  if (dates.length === 0) return curMi;
  return Math.min(curMi, Math.max(curMi - 24, Math.min(...dates.map(monthIndexOf))));
}

/**
 * Projeta caixa mês a mês desde o marco zero até curMi+count-1.
 * Regras: conta não paga não sai do caixa; ao ser paga, sai no mês do pagamento efetivo (uma vez só);
 * enquanto vencida, reduz a disponibilidade líquida. Meses futuros assumem pagamento em dia.
 */
export function projectCashFlow(
  data: FinanceData,
  count: number,
  today = todaySaoPaulo(),
  sim: SimItem[] = [],
): CashMonth[] {
  const curMi = monthIndexOf(today);
  const m0 = planningStartMonth(data, curMi);
  const last = curMi + count - 1;
  const budgets = new Map<number, MonthResult>();
  for (let mi = m0; mi <= last; mi++) budgets.set(mi, calculateMonthlyBalance(data, mi, sim, curMi));

  type P = MonthItem & { origin: number; eff: number | null };
  const payables: P[] = [];
  for (const [mi, b] of budgets) {
    for (const it of b.items) {
      if (!it.payType || it.group === "income") continue;
      const eff = it.paid ? (it.paidAt ? monthIndexOf(it.paidAt) : mi) : null;
      payables.push({ ...it, origin: mi, eff });
    }
  }

  const out: CashMonth[] = [];
  let cumulative = 0;
  for (let mi = m0; mi <= last; mi++) {
    const b = budgets.get(mi)!;
    const inflow = b.income;
    let outflow = b.items.filter((i) => i.group !== "income" && !i.payType).reduce((s, i) => s + i.amount, 0);
    let settledFromPrevious = 0;
    for (const p of payables) {
      if (p.eff === mi) {
        outflow += p.amount;
        if (p.origin < mi) settledFromPrevious += p.amount;
      } else if (p.eff === null && p.origin === mi) {
        // Não paga: futuro assume pagamento em dia; no mês atual só o que ainda não venceu.
        if (mi > curMi || (mi === curMi && (p.dueDate ?? "") >= today)) outflow += p.amount;
      }
    }
    // Passado: aberto ao fim daquele mês. Atual/futuro: vencido antes de hoje e ainda não pago.
    const isOpen = (p: P) => mi < curMi
      ? (p.dueDate ?? "") <= dueDateIn(mi, 31) && (p.eff === null || p.eff > mi)
      : (p.dueDate ?? "") < today && p.eff === null;
    const overdueOpen = round2(payables.filter(isOpen).reduce((s, p) => s + p.amount, 0));
    const net = round2(inflow - outflow);
    cumulative = round2(cumulative + net);
    out.push({
      mi, key: monthKey(mi), label: monthLabel(mi), budget: b,
      inflow, outflow: round2(outflow), settledFromPrevious: round2(settledFromPrevious),
      net, cumulative, overdueOpen, liquid: round2(cumulative - overdueOpen),
    });
  }
  return out;
}

/* ---------------- Orçamento por envelopes ---------------- */

export interface EnvelopeCategory { id: string; name: string; kind: string; envelope_pct: number | string | null }

export interface Envelope {
  categoryId: string | null;
  name: string;
  pct: number;
  ceiling: number;
  spent: number;
  available: number;
  usedPct: number;
  status: "ok" | "acabando" | "estourado" | "sem_teto";
}

/** Fração do teto a partir da qual o envelope é sinalizado como "acabando". */
export const ENVELOPE_WARN = 0.85;

/**
 * Divide a renda prevista do mês entre as categorias de despesa conforme o % de cada envelope
 * e desconta tudo que foi lançado/previsto na categoria (fixas, parcelas e avulsos).
 * Despesas sem categoria vão para o envelope "Sem categoria" (sem teto).
 */
export function calculateEnvelopes(month: MonthResult, categories: EnvelopeCategory[], extra?: { categoryId: string; amount: number }): Envelope[] {
  const spentBy = new Map<string, number>();
  for (const it of month.items) {
    if (it.group !== "expense") continue;
    const k = it.categoryId ?? "none";
    spentBy.set(k, (spentBy.get(k) ?? 0) + it.amount);
  }
  if (extra) spentBy.set(extra.categoryId, (spentBy.get(extra.categoryId) ?? 0) + extra.amount);
  const out: Envelope[] = [];
  for (const c of categories) {
    if (c.kind !== "expense") continue;
    const pct = n(c.envelope_pct);
    const spent = round2(spentBy.get(c.id) ?? 0);
    if (pct <= 0 && spent <= 0) continue;
    out.push(buildEnvelope(c.id, c.name, pct, round2((month.income * pct) / 100), spent));
  }
  const none = round2(spentBy.get("none") ?? 0);
  if (none > 0) out.push(buildEnvelope(null, "Sem categoria", 0, 0, none));
  return out.sort((a, b) => b.ceiling - a.ceiling || b.spent - a.spent);
}

function buildEnvelope(categoryId: string | null, name: string, pct: number, ceiling: number, spent: number): Envelope {
  const available = round2(ceiling - spent);
  const usedPct = ceiling > 0 ? (spent / ceiling) * 100 : spent > 0 ? 100 : 0;
  const status: Envelope["status"] =
    ceiling <= 0 ? "sem_teto" : spent > ceiling ? "estourado" : spent >= ceiling * ENVELOPE_WARN ? "acabando" : "ok";
  return { categoryId, name, pct, ceiling, spent, available, usedPct, status };
}

/** Soma dos percentuais definidos (deve ficar até 100%). */
export function totalEnvelopePct(categories: EnvelopeCategory[]): number {
  return round2(categories.filter((c) => c.kind === "expense").reduce((s, c) => s + n(c.envelope_pct), 0));
}

/** Em quais envelopes uma compra cabe no mês: ordena do que mais sobra para o que menos sobra. */
export function suggestEnvelopes(envelopes: Envelope[], amount: number) {
  return envelopes
    .filter((e) => e.categoryId && e.ceiling > 0)
    .map((e) => ({ ...e, fits: e.available >= amount, after: round2(e.available - amount) }))
    .sort((a, b) => b.available - a.available);
}
