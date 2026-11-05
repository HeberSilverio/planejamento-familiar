import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trash2 } from "lucide-react";
import { PageHeader, Panel, Stat, Empty } from "@/components/app/ui";
import { CrudSection } from "@/components/app/CrudSection";
import { EnvelopePurchaseCheck } from "@/components/app/Envelopes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFinance } from "@/lib/data/useFinance";
import { useTable, useTableMutations } from "@/lib/data/tables";
import { calculateSimulationImpact, monthLabel, currentMonthIndex } from "@/lib/finance/engine";
import type { SimItem, Simulation, SimulationItem } from "@/lib/finance/types";
import { money, signedMoney, compactMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador E se...? — Lar.Contas" },
      { name: "description", content: "Teste cenários financeiros sem alterar os dados reais da família." },
      { property: "og:title", content: "Simulador E se...? — Lar.Contas" },
      { property: "og:description", content: "Teste cenários financeiros sem alterar os dados reais da família." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const KIND: Record<string, string> = { expense: "Nova despesa", income: "Receita extra", debt: "Nova dívida/parcela" };

function Page() {
  const { data } = useFinance();
  const sims = useTable<Simulation>("simulations").data ?? [];
  const items = useTable<SimulationItem>("simulation_items").data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const simId = selected ?? sims[0]?.id ?? null;
  const sim = sims.find((s) => s.id === simId);
  const simItems = items.filter((i) => i.simulation_id === simId);

  const scenario: SimItem[] = simItems.map((i) => ({
    name: i.name, kind: i.kind, amount: Number(i.amount), months: i.months, start_offset: i.start_offset,
  }));
  const impact = useMemo(() => calculateSimulationImpact(data, scenario), [data, JSON.stringify(scenario)]); // eslint-disable-line react-hooks/exhaustive-deps
  const chart = impact.base.slice(0, 12).map((b, i) => ({
    mes: b.label, real: b.balance, simulado: impact.scenario[i]!.balance,
  }));
  const negReal = impact.base.slice(0, 12).filter((m) => m.balance < 0).length;
  const negSim = impact.scenario.slice(0, 12).filter((m) => m.balance < 0).length;

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Simulador E se...?" />
      <p className="text-sm text-muted-foreground mb-6">Os cenários nunca alteram seus dados reais — servem só para comparar.</p>
      {impact.base[0] && (
        <Panel title="De qual envelope sai esta compra?" className="mb-6">
          <EnvelopePurchaseCheck month={impact.base[0]} />
        </Panel>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <CrudSection<Simulation & Record<string, unknown>>
          table="simulations"
          title="Cenários"
          addLabel="Novo cenário"
          invalidate={["simulation_items"]}
          fields={[
            { name: "name", label: "Nome (ex.: Trocar de carro)", type: "text", required: true },
            { name: "description", label: "Descrição", type: "text" },
          ]}
          render={(s) => (
            <button type="button" onClick={() => setSelected(s.id)} className="text-left w-full">
              <p className={`font-semibold ${s.id === simId ? "text-primary" : ""}`}>{s.name}{s.id === simId ? " · selecionado" : ""}</p>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
            </button>
          )}
        />

        <div className="space-y-6">
          {!sim ? (
            <Panel><Empty>Crie um cenário para começar a simular.</Empty></Panel>
          ) : (
            <>
              <ItemsPanel simId={sim.id} items={simItems} />
              <Panel title={`Impacto de "${sim.name}"`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <Stat label="Efeito no mês atual" value={signedMoney(impact.monthly)} tone={impact.monthly < 0 ? "destructive" : "primary"} />
                  {impact.horizons.slice(0, 3).map((h) => (
                    <Stat key={h.label} label={`Diferença em ${h.label}`} value={signedMoney(h.delta)} tone={h.delta < 0 ? "destructive" : "primary"} />
                  ))}
                </div>
                <p className="text-sm mb-4">Meses negativos nos próximos 12: <b>{negReal}</b> hoje → <b className={negSim > negReal ? "text-destructive" : "text-primary"}>{negSim}</b> com o cenário.</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={compactMoney} />
                      <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                      <Legend />
                      <Line dataKey="real" name="Saldo real" stroke="var(--muted-foreground)" strokeWidth={2} dot={false} />
                      <Line dataKey="simulado" name="Saldo com cenário" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-left"><tr><th className="py-1">Mês</th><th className="text-right">Real</th><th className="text-right">Com cenário</th><th className="text-right">Diferença</th></tr></thead>
                    <tbody>
                      {chart.map((r) => (
                        <tr key={r.mes} className="border-t border-border/50">
                          <td className="py-1">{r.mes}</td>
                          <td className={`text-right ${r.real < 0 ? "text-destructive" : ""}`}>{money(r.real)}</td>
                          <td className={`text-right ${r.simulado < 0 ? "text-destructive" : ""}`}>{money(r.simulado)}</td>
                          <td className="text-right">{signedMoney(r.simulado - r.real)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ItemsPanel({ simId, items }: { simId: string; items: SimulationItem[] }) {
  const { insert, remove } = useTableMutations("simulation_items");
  const now = currentMonthIndex();
  const [f, setF] = useState({ name: "", kind: "expense", amount: "", start_offset: "0", months: "0" });
  const valid = f.name.trim() && Number(f.amount) > 0;
  const add = () => {
    if (!valid) return;
    insert.mutate(
      { simulation_id: simId, name: f.name.trim(), kind: f.kind, amount: Number(f.amount), start_offset: Number(f.start_offset), months: Math.max(0, Number(f.months) || 0) },
      { onSuccess: () => setF({ ...f, name: "", amount: "" }) },
    );
  };
  return (
    <Panel title="Mudanças do cenário">
      <div className="grid gap-2 sm:grid-cols-6 mb-4">
        <Input className="sm:col-span-2" placeholder="Descrição" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className="glass px-2 py-2 bg-transparent text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <Input type="number" min={0} placeholder="R$/mês" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <select className="glass px-2 py-2 bg-transparent text-sm" value={f.start_offset} onChange={(e) => setF({ ...f, start_offset: e.target.value })}>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>a partir de {monthLabel(now + i)}</option>)}
        </select>
        <Input type="number" min={0} placeholder="Meses (0 = sempre)" title="Duração em meses (0 = permanente)" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} />
      </div>
      <Button variant="kinetic" size="sm" disabled={!valid || insert.isPending} onClick={add}>Adicionar ao cenário</Button>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? <Empty>Adicione receitas ou despesas hipotéticas.</Empty> : items.map((i) => (
          <div key={i.id} className="glass p-3 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{i.name}</p>
              <p className="text-xs text-muted-foreground">{KIND[i.kind]} · a partir de {monthLabel(now + i.start_offset)} · {i.months ? `${i.months} meses` : "permanente"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${i.kind === "income" ? "text-primary" : "text-destructive"}`}>{i.kind === "income" ? "+" : "−"}{money(Number(i.amount))}</span>
              <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => remove.mutate(i.id)}><Trash2 /></Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
