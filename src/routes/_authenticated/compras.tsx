import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Panel, Stat } from "@/components/app/ui";
import { CrudSection } from "@/components/app/CrudSection";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/lib/data/useFinance";
import { useTable, useTableMutations } from "@/lib/data/tables";
import { calculateSafeSpendingLimit, currentMonthIndex, findPurchaseFit, monthIndexOf, monthIndexToDate, projectMonths } from "@/lib/finance/engine";
import type { Purchase } from "@/lib/finance/types";
import { money, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras planejadas — Lar.Contas" },
      { name: "description", content: "Lista de desejos da família com análise de quando cada compra cabe no orçamento." },
      { property: "og:title", content: "Compras planejadas — Lar.Contas" },
      { property: "og:description", content: "Lista de desejos da família com análise de quando cada compra cabe no orçamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const PRIO = [{ value: "1", label: "Alta" }, { value: "2", label: "Média" }, { value: "3", label: "Baixa" }];
const prioLabel = (p: number) => PRIO.find((x) => x.value === String(p))?.label ?? "—";

function Page() {
  const { data } = useFinance();
  const purchases = useTable<Purchase>("planned_purchases").data ?? [];
  const { update } = useTableMutations("planned_purchases");
  const commit = useTableMutations("commitments");
  const now = currentMonthIndex();
  const proj = useMemo(() => projectMonths(data, 36), [data]);
  const safe = proj[0] ? calculateSafeSpendingLimit(proj[0]).limit : 0;
  const open = purchases.filter((p) => !p.purchased);
  const totalOpen = open.reduce((s, p) => s + Number(p.amount), 0);

  const analyze = (p: Purchase) => {
    const per = Number(p.amount) / Math.max(1, p.installments);
    const fit = findPurchaseFit(data, Number(p.amount), p.installments);
    let onTarget: boolean | null = null;
    if (p.target_date) {
      const off = Math.max(0, monthIndexOf(p.target_date) - now);
      onTarget = Array.from({ length: p.installments }, (_, k) => proj[off + k]).every((m) => !m || m.balanceAfterTarget - per >= 0);
    }
    return { per, fit, onTarget };
  };

  const realize = (p: Purchase) => {
    const first = p.target_date && monthIndexOf(p.target_date) > now ? p.target_date : monthIndexToDate(now, 10);
    commit.insert.mutate(
      { name: p.name, kind: "installment", installment_amount: Math.round((Number(p.amount) / p.installments) * 100) / 100, installments_total: p.installments, first_due_date: first },
      { onSuccess: () => update.mutate({ id: p.id, values: { purchased: true } }) },
    );
  };

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Compras planejadas" />
      <Panel className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Pode gastar este mês" value={money(safe)} tone="primary" />
          <Stat label="Compras na lista" value={open.length} />
          <Stat label="Total desejado" value={money(totalOpen)} tone="warn" />
          <Stat label="Já realizadas" value={purchases.length - open.length} />
        </div>
      </Panel>
      <CrudSection<Purchase & Record<string, unknown>>
        table="planned_purchases"
        title="Lista de desejos"
        addLabel="Nova compra"
        orderBy="priority"
        invalidate={["commitments"]}
        fields={[
          { name: "name", label: "O que comprar", type: "text", required: true },
          { name: "amount", label: "Valor total (R$)", type: "number", required: true, min: 0 },
          { name: "installments", label: "Nº de parcelas", type: "int", required: true, min: 1, default: 1 },
          { name: "priority", label: "Prioridade", type: "select", required: true, options: PRIO, default: "2" },
          { name: "target_date", label: "Quando gostaria de comprar", type: "date" },
          { name: "purchased", label: "Já comprei", type: "bool", default: false },
        ]}
        render={(p) => {
          const a = analyze(p);
          return (
            <div className={p.purchased ? "opacity-60" : ""}>
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Prioridade {prioLabel(p.priority)} · {p.installments}x de {money(a.per)}{p.target_date ? ` · desejada em ${dateBR(p.target_date)}` : ""}
                  </p>
                </div>
                <p className="font-display font-extrabold">{money(Number(p.amount))}</p>
              </div>
              {p.purchased ? <p className="text-xs mt-1">Comprada ✓</p> : (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {a.onTarget != null && (
                    <span className={a.onTarget ? "text-primary" : "text-destructive"}>
                      {a.onTarget ? "Cabe na data desejada" : "Não cabe na data desejada sem afetar a meta"}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {a.fit ? `· Primeiro mês viável: ${a.fit.label}` : "· Não cabe nos próximos 24 meses"}
                  </span>
                  <Button size="sm" variant="outline" className="ml-auto" disabled={commit.insert.isPending} onClick={() => realize(p)}>
                    Comprei — lançar parcelas
                  </Button>
                </div>
              )}
            </div>
          );
        }}
      />
    </>
  );
}
