import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { PageHeader, Panel, Stat, Empty } from "@/components/app/ui";
import { useFinance } from "@/lib/data/useFinance";
import { useOptions } from "@/lib/data/options";
import { currentMonthIndex, monthIndexOf, monthLabel } from "@/lib/finance/engine";
import { money, compactMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Lar.Contas" },
      { name: "description", content: "Gastos por categoria, por membro e evolução mensal da família." },
      { property: "og:title", content: "Relatórios — Lar.Contas" },
      { property: "og:description", content: "Gastos por categoria, por membro e evolução mensal da família." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const COLORS = ["var(--primary)", "var(--warn)", "var(--destructive)", "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 };

function Page() {
  const { data, isLoading } = useFinance();
  const { categories, members } = useOptions();
  const now = currentMonthIndex();
  const [mi, setMi] = useState(now);

  const monthTx = useMemo(() => data.transactions.filter((t) => monthIndexOf(t.date) === mi), [data.transactions, mi]);
  const group = (key: "category_id" | "member_id", list: { id: string; name: string }[], empty: string) => {
    const m = new Map<string, number>();
    for (const t of monthTx) {
      if (t.kind !== "expense") continue;
      const name = list.find((x) => x.id === t[key])?.name ?? empty;
      m.set(name, (m.get(name) ?? 0) + Number(t.amount));
    }
    return [...m.entries()].map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  };
  const byCat = group("category_id", categories, "Sem categoria");
  const byMember = group("member_id", members, "Família / sem membro");

  const history = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = now - 11 + i;
        const tx = data.transactions.filter((t) => monthIndexOf(t.date) === m);
        const sum = (k: string) => tx.filter((t) => t.kind === k).reduce((s, t) => s + Number(t.amount), 0);
        return { mes: monthLabel(m), Receitas: sum("income"), Despesas: sum("expense") };
      }),
    [data.transactions, now],
  );

  if (isLoading) return <Empty>Carregando…</Empty>;

  const spent = byCat.reduce((s, c) => s + c.value, 0);
  const earned = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const prev = history[10]?.Despesas ?? 0;

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Relatórios">
        <select value={mi} onChange={(e) => setMi(Number(e.target.value))} className="glass px-3 py-2 text-sm bg-transparent">
          {Array.from({ length: 12 }, (_, i) => now - i).map((m) => (
            <option key={m} value={m} className="bg-background">{monthLabel(m, true)}</option>
          ))}
        </select>
      </PageHeader>

      <Panel className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Gasto no mês" value={money(spent)} tone="destructive" />
          <Stat label="Recebido avulso" value={money(earned)} tone="primary" />
          <Stat label="Lançamentos" value={monthTx.length} />
          <Stat label="Mês anterior (atual)" value={mi === now ? money(prev) : "—"} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Panel title="Despesas por categoria">
          {byCat.length === 0 ? <Empty>Sem despesas lançadas neste mês.</Empty> : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => money(v)} contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 mt-2">
                {byCat.map((c, i) => (
                  <li key={c.name} className="flex justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.name}</span>
                    <span className="font-semibold">{money(c.value)} <span className="text-muted-foreground">({spent ? Math.round((c.value / spent) * 100) : 0}%)</span></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Despesas por membro">
          {byMember.length === 0 ? <Empty>Sem despesas lançadas neste mês.</Empty> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMember} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={compactMoney} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={110} />
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={tip} />
                  <Bar dataKey="value" name="Gasto" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Evolução dos lançamentos — últimos 12 meses">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={compactMoney} width={60} />
              <Tooltip formatter={(v: number) => money(v)} contentStyle={tip} />
              <Legend />
              <Bar dataKey="Receitas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </>
  );
}
