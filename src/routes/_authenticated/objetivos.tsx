import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat, ProgressBar } from "@/components/app/ui";
import { CrudSection } from "@/components/app/CrudSection";
import { useTable } from "@/lib/data/tables";
import { calculateGoalProjection, monthIndexOf, currentMonthIndex, monthLabel } from "@/lib/finance/engine";
import type { Goal } from "@/lib/finance/types";
import { money, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/objetivos")({
  head: () => ({
    meta: [
      { title: "Objetivos — Lar.Contas" },
      { name: "description", content: "Metas da família com progresso, aporte mensal e previsão de conclusão." },
      { property: "og:title", content: "Objetivos — Lar.Contas" },
      { property: "og:description", content: "Metas da família com progresso, aporte mensal e previsão de conclusão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const goals = useTable<Goal>("financial_goals").data ?? [];
  const saved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const target = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const monthly = goals.reduce((s, g) => s + Number(g.monthly_contribution), 0);
  const late = goals.filter((g) => calculateGoalProjection(g).late).length;

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Objetivos" />
      <Panel className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Já guardado" value={money(saved)} tone="primary" />
          <Stat label="Falta juntar" value={money(Math.max(0, target - saved))} tone="warn" />
          <Stat label="Aportes por mês" value={money(monthly)} />
          <Stat label="Objetivos atrasados" value={late} tone={late ? "destructive" : undefined} />
        </div>
      </Panel>
      <CrudSection<Goal & Record<string, unknown>>
        table="financial_goals"
        title="Metas da família"
        addLabel="Novo objetivo"
        fields={[
          { name: "name", label: "Objetivo (ex.: reserva de emergência)", type: "text", required: true },
          { name: "target_amount", label: "Valor-alvo (R$)", type: "number", required: true, min: 0 },
          { name: "current_amount", label: "Já guardado (R$)", type: "number", required: true, min: 0, default: 0 },
          { name: "monthly_contribution", label: "Aporte mensal (R$)", type: "number", required: true, min: 0, default: 0 },
          { name: "target_date", label: "Prazo desejado", type: "date" },
        ]}
        render={(g) => {
          const p = calculateGoalProjection(g);
          let needed: number | null = null;
          if (g.target_date && p.missing > 0) {
            const months = Math.max(1, monthIndexOf(g.target_date) - currentMonthIndex());
            needed = p.missing / months;
          }
          return (
            <div>
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {money(Number(g.current_amount))} de {money(Number(g.target_amount))} · {money(Number(g.monthly_contribution))}/mês
                    {g.target_date ? ` · prazo ${dateBR(g.target_date)}` : ""}
                  </p>
                </div>
                <p className="font-display font-extrabold text-primary">{Math.round(p.progress)}%</p>
              </div>
              <ProgressBar value={p.progress} tone={p.late ? "destructive" : "primary"} className="mt-2" />
              <p className={`text-xs mt-1 ${p.late ? "text-destructive" : "text-muted-foreground"}`}>
                {p.missing === 0 ? "Objetivo alcançado!"
                  : p.monthsToReach == null ? "Defina um aporte mensal para prever a conclusão."
                  : `Falta ${money(p.missing)} · conclusão prevista em ${monthLabel(p.eta!, true)} (${p.monthsToReach} meses)`}
                {p.late && needed != null && ` · para cumprir o prazo, guarde ${money(needed)}/mês`}
              </p>
            </div>
          );
        }}
      />
    </>
  );
}
