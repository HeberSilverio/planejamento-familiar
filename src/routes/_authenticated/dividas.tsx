import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel, Stat, ProgressBar, Empty } from "@/components/app/ui";
import { CrudSection } from "@/components/app/CrudSection";
import { useFinance } from "@/lib/data/useFinance";
import { calculateDebtProjection, simulateDebtPayoff, currentMonthIndex, monthLabel } from "@/lib/finance/engine";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dividas")({
  head: () => ({
    meta: [
      { title: "Dívidas — Lar.Contas" },
      { name: "description", content: "Saldo devedor, quitação e estratégias Bola de Neve e Avalanche." },
      { property: "og:title", content: "Dívidas — Lar.Contas" },
      { property: "og:description", content: "Saldo devedor, quitação e estratégias Bola de Neve e Avalanche." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = { id: string; name: any; creditor: any; total_amount: any; installment_amount: any; installments_total: any; installments_paid: any; first_due_date: any; interest_rate: any; [k: string]: unknown };
const today = () => new Date().toISOString().slice(0, 10);

function Page() {
  const { data } = useFinance();
  const debts = data.debts;
  const [extra, setExtra] = useState(0);

  const totals = useMemo(() => {
    const p = debts.map((d) => ({ d, p: calculateDebtProjection(d) }));
    const open = p.filter((x) => x.p.remainingInstallments > 0);
    const remaining = open.reduce((s, x) => s + x.p.remainingAmount, 0);
    const monthly = open.reduce((s, x) => s + Number(x.d.installment_amount), 0);
    const last = open.reduce((m, x) => Math.max(m, x.p.payoffMi), 0);
    return { remaining, monthly, last, count: open.length };
  }, [debts]);

  const snowball = useMemo(() => simulateDebtPayoff(debts, extra, "snowball"), [debts, extra]);
  const avalanche = useMemo(() => simulateDebtPayoff(debts, extra, "avalanche"), [debts, extra]);
  const base = useMemo(() => simulateDebtPayoff(debts, 0, "snowball"), [debts]);
  const now = currentMonthIndex();

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Dívidas" />
      <Panel className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Saldo devedor" value={money(totals.remaining)} tone="destructive" />
          <Stat label="Parcelas/mês" value={money(totals.monthly)} tone="warn" />
          <Stat label="Dívidas ativas" value={totals.count} />
          <Stat label="Livre de dívidas em" value={totals.count ? monthLabel(totals.last, true) : "Quitado"} tone="primary" />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <CrudSection<Row>
          table="debts"
          title="Minhas dívidas"
          addLabel="Nova dívida"
          fields={[
            { name: "name", label: "Descrição (ex.: empréstimo)", type: "text", required: true },
            { name: "creditor", label: "Credor (banco/loja)", type: "text" },
            { name: "total_amount", label: "Valor total (R$)", type: "number", required: true, min: 0 },
            { name: "installment_amount", label: "Valor da parcela (R$)", type: "number", required: true, min: 0 },
            { name: "installments_total", label: "Nº total de parcelas", type: "int", required: true, min: 1 },
            { name: "installments_paid", label: "Parcelas já pagas", type: "int", required: true, min: 0, default: 0 },
            { name: "first_due_date", label: "1º vencimento", type: "date", required: true, default: today() },
            { name: "interest_rate", label: "Juros ao mês (%)", type: "number", min: 0 },
          ]}
          render={(d) => {
            const p = calculateDebtProjection(d as never);
            return (
              <div>
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.creditor ? `${d.creditor} · ` : ""}{d.installments_paid}/{d.installments_total} pagas{d.interest_rate ? ` · ${d.interest_rate}% a.m.` : ""} · quita em {p.payoffLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-extrabold text-destructive">{money(p.remainingAmount)}</p>
                    <p className="text-xs text-muted-foreground">{money(d.installment_amount)}/mês</p>
                  </div>
                </div>
                <ProgressBar value={p.progress} className="mt-2" />
              </div>
            );
          }}
        />

        <Panel title="Estratégia de quitação">
          {totals.count === 0 ? <Empty>Cadastre dívidas para comparar estratégias.</Empty> : (
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold">Valor extra por mês para amortizar</span>
                <input type="number" min={0} step={50} value={extra} onChange={(e) => setExtra(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full glass px-3 py-2 bg-transparent" />
                <span className="text-xs text-muted-foreground">Sem extra, quitação em {base.months} meses.</span>
              </label>
              {[{ t: "Bola de Neve", d: "Quita primeiro a menor dívida — motivação rápida.", r: snowball },
                { t: "Avalanche", d: "Quita primeiro a de maior juros — paga menos no total.", r: avalanche }].map((s) => (
                <div key={s.t} className="glass p-4">
                  <div className="flex justify-between items-baseline">
                    <p className="font-display font-extrabold">{s.t}</p>
                    <p className="text-primary font-bold">{monthLabel(now + s.r.months - 1, true)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{s.d}</p>
                  <p className="text-sm">{s.r.months} meses · juros estimados {money(s.r.interest)}
                    {base.months > s.r.months && <span className="text-primary"> · {base.months - s.r.months} meses antes</span>}</p>
                  <ol className="text-xs text-muted-foreground mt-2 list-decimal pl-4">
                    {s.r.order.map((o) => <li key={o.name}>{o.name} — quitada em {monthLabel(now + o.month - 1)}</li>)}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
