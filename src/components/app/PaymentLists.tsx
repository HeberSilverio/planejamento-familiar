import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/app/ui";
import { useTogglePaid } from "@/lib/data/payments";
import { useOptions } from "@/lib/data/options";
import { money, dateBR } from "@/lib/format";
import { todaySaoPaulo, addDays, type DueItem } from "@/lib/finance/engine";
import type { MonthItem, MonthResult } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

function PayButton({ item, paidOn }: { item: MonthItem; paidOn?: string }) {
  const toggle = useTogglePaid();
  if (!item.payType) return null;
  return item.paid ? (
    <Button size="sm" variant="ghost" disabled={toggle.isPending} onClick={() => toggle.mutate({ item, paid: false })}>
      <RotateCcw className="size-3.5" /> Reabrir
    </Button>
  ) : (
    <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate({ item, paid: true, paidOn: paidOn ?? todaySaoPaulo() })}>
      <Check className="size-3.5" /> Paga
    </Button>
  );
}

/** Conta vencida: escolhe a data em que foi paga (sai do caixa nesse mês). */
function LatePay({ item }: { item: MonthItem }) {
  const [date, setDate] = useState(todaySaoPaulo());
  return (
    <span className="flex items-center gap-1">
      <label className="text-xs text-muted-foreground">
        <span className="sr-only">Data do pagamento</span>
        <input type="date" value={date} max={todaySaoPaulo()} onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs" title="Data em que foi paga" />
      </label>
      <PayButton item={item} paidOn={date} />
    </span>
  );
}

function DetailsLink({ item }: { item: MonthItem }) {
  const to = item.source === "debt" ? "/dividas" : "/financeiro";
  return <Link to={to} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">detalhes</Link>;
}

/** Duas listas: vencidas e que vencem nos próximos 3 dias. */
export function DueLists({ overdue, soon }: { overdue: DueItem[]; soon: DueItem[] }) {
  const { members, categories, name } = useOptions();
  const today = todaySaoPaulo();
  const row = (i: DueItem, late: boolean) => (
    <li key={`${i.payType}-${i.refId}-${i.dueDate}`} className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm", late ? "border-destructive/40 bg-destructive/10" : "border-border")}>
      <div className="flex-1 min-w-[10rem]">
        <p className="font-semibold">{i.label} {i.note && <span className="text-xs text-muted-foreground">({i.note})</span>}</p>
        <p className="text-xs text-muted-foreground">
          {[late ? name(categories, i.categoryId) ?? "Sem categoria" : null, name(members, i.memberId) ?? "Sem responsável", `vence ${dateBR(i.dueDate)}`]
            .filter(Boolean).join(" · ")}
          {late && <span className="ml-1 font-bold text-destructive">· {i.daysLate} {i.daysLate === 1 ? "dia" : "dias"} em atraso</span>}
          {!late && i.dueDate === today && <span className="ml-1 font-bold text-warn">· vence hoje</span>}
        </p>
      </div>
      <span className="font-display font-extrabold">{money(i.amount)}</span>
      {late ? <LatePay item={i} /> : <PayButton item={i} />}
      <DetailsLink item={i} />
    </li>
  );
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="eyebrow text-destructive mb-3">Despesas vencidas ({overdue.length})</p>
        {overdue.length === 0 ? <Empty>Nenhuma despesa vencida.</Empty> : <ul className="space-y-2">{overdue.map((i) => row(i, true))}</ul>}
      </div>
      <div>
        <p className="eyebrow text-warn mb-3">Vencem até {dateBR(addDays(today, 3))} ({soon.length})</p>
        {soon.length === 0 ? <Empty>Nenhuma despesa vence nos próximos 3 dias.</Empty> : <ul className="space-y-2">{soon.map((i) => row(i, false))}</ul>}
      </div>
    </div>
  );
}

/** Composição de um mês, como a fatura de um app de banco. */
export function MonthDetail({ month }: { month: MonthResult }) {
  const today = todaySaoPaulo();
  const soonLimit = addDays(today, 3);
  const groups: [string, MonthItem[]][] = [
    ["Receitas", month.items.filter((i) => i.group === "income")],
    ["Despesas", month.items.filter((i) => i.group === "expense")],
    ["Investimentos", month.items.filter((i) => i.group === "investment")],
  ];
  const tag = (i: MonthItem) => {
    const t: { text: string; cls: string }[] = [];
    if (i.payType) {
      if (i.paid) t.push({ text: "paga", cls: "bg-primary/15 text-primary" });
      else if (i.dueDate && i.dueDate < today) t.push({ text: "vencida", cls: "bg-destructive/15 text-destructive" });
      else if (i.dueDate && i.dueDate <= soonLimit) t.push({ text: "vence em breve", cls: "bg-warn/15 text-warn" });
      else t.push({ text: "em aberto", cls: "bg-muted text-muted-foreground" });
    }
    if (i.recurring) t.push({ text: "recorrente", cls: "bg-muted text-muted-foreground" });
    if (i.isLast) t.push({ text: "última parcela", cls: "bg-primary/15 text-primary" });
    if (i.countsTowardGoal) t.push({ text: "conta na meta", cls: "bg-warn/15 text-warn" });
    return t;
  };
  return (
    <div className="space-y-6">
      {groups.map(([title, list]) => (
        <div key={title}>
          <p className="eyebrow mb-2">{title} · {money(list.reduce((s, i) => s + i.amount, 0))}</p>
          {list.length === 0 ? <p className="text-sm text-muted-foreground">Nada neste mês.</p> : (
            <ul className="divide-y divide-border text-sm">
              {list.map((i, idx) => (
                <li key={idx} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-mono text-xs text-muted-foreground w-14">{i.dueDate ? dateBR(i.dueDate).slice(0, 5) : i.day ? `dia ${i.day}` : "—"}</span>
                  <span className="flex-1 min-w-[8rem]">{i.label} {i.note && i.note !== "recorrente" && <span className="text-xs text-muted-foreground">({i.note})</span>}</span>
                  {tag(i).map((t) => <span key={t.text} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", t.cls)}>{t.text}</span>)}
                  <span className="font-display font-extrabold w-28 text-right">{money(i.amount)}</span>
                  {i.payType && <PayButton item={i} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
