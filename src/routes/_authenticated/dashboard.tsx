import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFinance } from "@/lib/data/useFinance";
import { projectMonths, calculateSafeSpendingLimit, listDueItems, projectCashFlow, monthLabel } from "@/lib/finance/engine";
import { DueLists } from "@/components/app/PaymentLists";
import { money, compactMoney } from "@/lib/format";
import { Panel, ProgressBar, Stat, StatusBadge, statusText, Empty } from "@/components/app/ui";
import { useTable } from "@/lib/data/tables";
import type { Goal, Settings } from "@/lib/finance/types";
import { calculateGoalProjection } from "@/lib/finance/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Lar.Contas" },
      { name: "description", content: "Saúde financeira do mês, meta de investimento e próximos meses da família." },
      { property: "og:title", content: "Dashboard — Lar.Contas" },
      { property: "og:description", content: "Saúde financeira do mês, meta de investimento e próximos meses da família." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useFinance();
  const goals = useTable<Goal>("financial_goals").data ?? [];
  const settings = useTable<Settings>("user_settings").data?.[0];
  const months = useMemo(() => projectMonths(data, 6), [data]);
  const cur = months[0];
  const due = useMemo(() => listDueItems(data), [data]);
  const cash = useMemo(() => projectCashFlow(data, 1), [data]);
  const cashNow = cash[cash.length - 1];

  if (isLoading || !cur) return <Empty>Carregando…</Empty>;

  const safe = calculateSafeSpendingLimit(cur);
  const goalPct = cur.target > 0 ? (cur.countedInvestment / cur.target) * 100 : 0;
  const maxAbs = Math.max(1, ...months.map((m) => Math.abs(m.balance)));
  const upcoming = cur.items
    .filter((i) => i.payType && !i.paid && i.source !== "transaction")
    .sort((a, b) => (a.day ?? 99) - (b.day ?? 99))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="kinetic diagonal rounded-[18px] px-6 sm:px-8 pt-8 pb-14 rise">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="eyebrow text-primary">
              {cur.fullLabel} · {settings?.family_name ?? "Minha família"}
            </p>
            <h1 className="font-display font-extrabold italic text-3xl sm:text-4xl tracking-tight mt-2">
              Saldo previsto <span className="text-primary">{money(cur.balance)}</span>
            </h1>
          </div>
          <StatusBadge status={cur.status} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10">
          {[
            ["Receita prevista", cur.income],
            ["Despesas previstas", cur.expense],
            ["Despesas pagas", cur.paidExpense],
            ["Despesas em aberto", cur.openExpense],
            ["Investimentos previstos", cur.investment],
            ["Meta de investimento", cur.target],
            ["Saldo previsto", cur.balance],
            ["Saldo após meta", cur.balanceAfterTarget],
          ].map(([l, v]) => (
            <div key={l as string}>
              <p className="eyebrow text-on-dark/50">{l}</p>
              <p className="font-display font-extrabold text-xl sm:text-2xl mt-1">{money(v as number)}</p>
            </div>
          ))}
        </div>
      </header>

      {cashNow && (
        <Panel title="Caixa acumulado do planejamento">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Saldo acumulado (caixa)" value={money(cashNow.cumulative)} tone={cashNow.cumulative < 0 ? "destructive" : "primary"} />
            <Stat label="Contas vencidas em aberto" value={money(cashNow.overdueOpen)} tone={cashNow.overdueOpen > 0 ? "destructive" : undefined} />
            <Stat label="Disponibilidade líquida" value={money(cashNow.liquid)} tone={cashNow.liquid < 0 ? "destructive" : "primary"} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Baseado nas entradas e saídas cadastradas desde {monthLabel(cash[0]!.mi, true)}, sem conciliação bancária. Contas vencidas só saem do caixa quando marcadas como pagas, no mês do pagamento.
          </p>
        </Panel>
      )}

      <Panel title="Pendências e próximos vencimentos">
        <DueLists overdue={due.overdue} soon={due.soon} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel
          className="lg:col-span-7"
          title={`Meta de investimento — ${cur.targetPct}%`}
          action={<span className="font-mono text-xs text-muted-foreground">{money(cur.countedInvestment)} de {money(cur.target)}</span>}
        >
          <ProgressBar value={goalPct} className="h-3" />
          <div className="grid grid-cols-3 gap-4 mt-5">
            <Stat label="Meta" value={money(cur.target)} />
            <Stat label="Já investido" value={money(cur.countedInvestment)} />
            <Stat label="Falta" value={money(cur.remaining)} tone={cur.remaining > 0 ? "warn" : "primary"} />
          </div>
        </Panel>

        <Panel className="lg:col-span-5" title="Limite seguro de gastos">
          <p className="font-display font-extrabold text-3xl text-primary">{money(safe.limit)}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {safe.steps.map((s) => (
              <li key={s.label} className="flex justify-between">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-mono">{money(s.value)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-7" title="Balanço dos próximos meses" action={<Link to="/planejamento" className="text-sm text-muted-foreground hover:text-foreground">Ver tudo →</Link>}>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {months.map((m) => (
              <div key={m.key} className="text-center">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">{m.label}</p>
                <p className={cn("font-display font-extrabold text-sm mt-1", statusText(m.status))}>{compactMoney(m.balance)}</p>
                <div className={cn("h-14 rounded-lg mt-2 flex items-end overflow-hidden", m.status === "positivo" ? "bg-primary/15" : m.status === "atencao" ? "bg-warn/15" : "bg-destructive/15")}>
                  <div
                    className={cn("w-full rounded-lg", m.status === "positivo" ? "bg-primary/50" : m.status === "atencao" ? "bg-warn/50" : "bg-destructive/50")}
                    style={{ height: `${Math.max(6, (Math.abs(m.balance) / maxAbs) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-5" title="Próximos compromissos">
          {upcoming.length === 0 ? (
            <Empty>Nenhum compromisso cadastrado.</Empty>
          ) : (
            <ul className="space-y-3 text-sm">
              {upcoming.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <span className="font-mono text-muted-foreground w-12">{i.day ? `dia ${i.day}` : "—"}</span>
                  <span className="flex-1 truncate">
                    {i.label} {i.note && <span className="text-xs text-muted-foreground">({i.note})</span>}
                    {i.isLast && <span className="ml-1 text-xs text-primary">última</span>}
                  </span>
                  <span className="font-display font-extrabold">{money(i.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="lg:col-span-12" title="Objetivos" action={<Link to="/objetivos" className="text-sm text-muted-foreground hover:text-foreground">Gerenciar →</Link>}>
          {goals.length === 0 ? (
            <Empty>Cadastre objetivos como reserva, casa própria ou Figtree.</Empty>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
              {goals.map((g) => {
                const p = calculateGoalProjection(g);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between"><span>{g.name}</span><span className="font-mono text-muted-foreground">{p.progress.toFixed(0)}%</span></div>
                    <ProgressBar value={p.progress} className="mt-1" tone={p.late ? "warn" : "primary"} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <section className="kinetic diagonal-up rounded-[16px] px-6 sm:px-8 pt-10 pb-7 flex flex-wrap gap-4 items-center justify-between rise">
        <div>
          <p className="eyebrow text-primary">Simulador</p>
          <h2 className="font-display font-extrabold italic text-2xl tracking-tight">
            E se...? <span className="text-on-dark/60 font-normal not-italic text-base">— simule uma nova despesa e veja o impacto em 5 anos.</span>
          </h2>
        </div>
        <Link to="/simulador" className="rounded-full bg-primary text-primary-foreground font-display font-extrabold text-sm px-5 py-3 uppercase tracking-wide hover:bg-primary/85">
          Simular agora
        </Link>
      </section>
    </div>
  );
}
