import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, Stat, StatusBadge, ProgressBar, Empty, statusText } from "@/components/app/ui";
import { useFinance } from "@/lib/data/useFinance";
import { useOptions } from "@/lib/data/options";
import { projectMonths, currentMonthIndex, monthIndexOf, calculateFutureCommitments } from "@/lib/finance/engine";
import { money, compactMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/planejamento")({
  head: () => ({
    meta: [
      { title: "Planejamento — Lar.Contas" },
      { name: "description", content: "Orçado vs. realizado e projeção de fluxo de caixa da família para 12 meses." },
      { property: "og:title", content: "Planejamento — Lar.Contas" },
      { property: "og:description", content: "Orçado vs. realizado e projeção de fluxo de caixa da família para 12 meses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data, isLoading } = useFinance();
  const { categories } = useOptions();
  const months = useMemo(() => projectMonths(data, 12), [data]);
  const now = currentMonthIndex();
  const cur = months[0];

  const budget = useMemo(() => {
    const map = new Map<string, { name: string; planned: number; actual: number }>();
    const get = (id: string | null | undefined) => {
      const key = id ?? "none";
      if (!map.has(key)) map.set(key, { name: categories.find((c) => c.id === id)?.name ?? "Sem categoria", planned: 0, actual: 0 });
      return map.get(key)!;
    };
    for (const r of data.recurring) {
      if (r.kind !== "expense") continue;
      if (monthIndexOf(r.start_date) > now || (r.end_date && monthIndexOf(r.end_date) < now)) continue;
      get(r.category_id).planned += Number(r.amount);
    }
    const active = new Set(calculateFutureCommitments(data, now).filter((i) => i.source === "commitment").map((i) => i.refId));
    for (const c of data.commitments) if (active.has(c.id)) get(c.category_id).planned += Number(c.installment_amount);
    for (const t of data.transactions) {
      if (t.kind !== "expense" || monthIndexOf(t.date) !== now) continue;
      get(t.category_id).actual += Number(t.amount);
    }
    return [...map.values()].sort((a, b) => b.planned + b.actual - (a.planned + a.actual));
  }, [data, categories, now]);

  const endings = useMemo(
    () => months.flatMap((m) => m.items.filter((i) => i.isLast).map((i) => ({ month: m.fullLabel, label: i.label, amount: i.amount }))),
    [months],
  );

  if (isLoading || !cur) return <Empty>Carregando…</Empty>;

  const chart = months.map((m) => ({ mes: m.label, Receitas: m.income, Despesas: m.expense, Investimentos: m.investment, Saldo: m.balance }));
  const totalPlanned = budget.reduce((s, b) => s + b.planned, 0);
  const totalActual = budget.reduce((s, b) => s + b.actual, 0);

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Planejamento">
        <StatusBadge status={cur.status} />
      </PageHeader>

      <Panel className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Receitas do mês" value={money(cur.income)} tone="primary" />
          <Stat label="Despesas previstas" value={money(cur.expense)} />
          <Stat label={`Meta ${cur.targetPct}%`} value={money(cur.target)} tone="warn" />
          <Stat label="Saldo após meta" value={money(cur.balanceAfterTarget)} tone={cur.balanceAfterTarget < 0 ? "destructive" : "primary"} />
        </div>
      </Panel>

      <Panel title="Fluxo de caixa — próximos 12 meses" className="mb-6">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={compactMoney} width={60} />
              <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="Receitas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Investimentos" fill="var(--warn)" radius={[4, 4, 0, 0]} />
              <Line dataKey="Saldo" stroke="var(--foreground)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr><th className="py-2">Mês</th><th className="text-right">Receitas</th><th className="text-right">Despesas</th><th className="text-right">Invest.</th><th className="text-right">Saldo</th><th className="text-right">Após meta</th></tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key} className="border-t border-border">
                  <td className="py-2 font-semibold">{m.fullLabel}</td>
                  <td className="text-right">{money(m.income)}</td>
                  <td className="text-right">{money(m.expense)}</td>
                  <td className="text-right">{money(m.investment)}</td>
                  <td className={`text-right font-bold ${statusText(m.status)}`}>{money(m.balance)}</td>
                  <td className={`text-right ${m.balanceAfterTarget < 0 ? "text-destructive" : ""}`}>{money(m.balanceAfterTarget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Orçado vs. realizado — ${cur.fullLabel}`}>
          {budget.length === 0 ? (
            <Empty>Cadastre despesas fixas e lançamentos no Financeiro.</Empty>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-bold">{money(totalActual)} de {money(totalPlanned)}</span></div>
              {budget.map((b) => {
                const pct = b.planned > 0 ? (b.actual / b.planned) * 100 : b.actual > 0 ? 100 : 0;
                const over = b.actual > b.planned;
                return (
                  <div key={b.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{b.name}</span>
                      <span className={over ? "text-destructive font-bold" : "text-muted-foreground"}>{money(b.actual)} / {money(b.planned)}</span>
                    </div>
                    <ProgressBar value={pct} tone={over ? "destructive" : pct > 80 ? "warn" : "primary"} />
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">Orçado = despesas fixas + parcelas do mês. Realizado = lançamentos avulsos do mês.</p>
            </div>
          )}
        </Panel>

        <Panel title="Parcelas que terminam nos próximos 12 meses">
          {endings.length === 0 ? (
            <Empty>Nenhum parcelamento termina neste período.</Empty>
          ) : (
            <ul className="space-y-3">
              {endings.map((e, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <div><p className="font-semibold">{e.label}</p><p className="text-xs text-muted-foreground">última parcela em {e.month}</p></div>
                  <p className="font-display font-extrabold text-primary">+{money(e.amount)}/mês</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

// keep BarChart import tree-shaken safely
void BarChart;
