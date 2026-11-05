import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, ProgressBar } from "@/components/app/ui";
import { useTable, useTableMutations } from "@/lib/data/tables";
import { calculateEnvelopes, suggestEnvelopes, totalEnvelopePct, type Envelope, type EnvelopeCategory } from "@/lib/finance/engine";
import type { MonthResult } from "@/lib/finance/types";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export function useEnvelopeCategories() {
  return useTable<EnvelopeCategory>("categories", "name").data ?? [];
}

const tone = (e: Envelope) => (e.status === "estourado" ? "destructive" : e.status === "acabando" ? "warn" : "primary");
const label: Record<Envelope["status"], string> = { ok: "Disponível", acabando: "Acabando", estourado: "Estourou", sem_teto: "Sem % definido" };

export function EnvelopeList({ month, compact = false }: { month: MonthResult; compact?: boolean }) {
  const cats = useEnvelopeCategories();
  const list = useMemo(() => calculateEnvelopes(month, cats), [month, cats]);
  const total = totalEnvelopePct(cats);
  if (total <= 0) return <Empty>Defina o % de cada categoria em Planejamento → Envelopes para dividir a renda.</Empty>;
  const alerts = list.filter((e) => e.status === "acabando" || e.status === "estourado");
  const shown = compact ? [...alerts, ...list.filter((e) => !alerts.includes(e))].slice(0, 6) : list;
  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <p className="text-sm rounded-lg bg-warn/15 text-warn px-3 py-2">
          Atenção: {alerts.map((e) => `${e.name} (${e.status === "estourado" ? `estourou ${money(-e.available)}` : `resta ${money(e.available)}`})`).join(" · ")}
        </p>
      )}
      <div className={cn("grid gap-4", compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
        {shown.map((e) => (
          <div key={e.categoryId ?? "none"} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-semibold truncate">{e.name} <span className="font-mono text-xs text-muted-foreground">{e.pct}%</span></span>
              <span className={cn("text-xs font-semibold", e.status === "estourado" ? "text-destructive" : e.status === "acabando" ? "text-warn" : "text-muted-foreground")}>{label[e.status]}</span>
            </div>
            <ProgressBar value={e.usedPct} tone={tone(e)} className="mt-1" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
              <span>{money(e.spent)} de {money(e.ceiling)}</span>
              <span className={e.available < 0 ? "text-destructive" : ""}>resta {money(e.available)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnvelopeConfig({ month }: { month: MonthResult }) {
  const cats = useEnvelopeCategories().filter((c) => c.kind === "expense");
  const { update } = useTableMutations("categories");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const val = (c: EnvelopeCategory) => draft[c.id] ?? String(Number(c.envelope_pct ?? 0));
  const total = cats.reduce((s, c) => s + (Number(val(c)) || 0), 0);
  const save = async () => {
    if (total > 100) return toast.error("A soma dos percentuais passa de 100%.");
    const changed = cats.filter((c) => draft[c.id] !== undefined && Number(draft[c.id]) !== Number(c.envelope_pct));
    for (const c of changed) await update.mutateAsync({ id: c.id, values: { envelope_pct: Number(draft[c.id]) || 0 } });
    setDraft({});
    toast.success("Envelopes salvos");
  };
  if (cats.length === 0) return <Empty>Cadastre categorias de despesa no Financeiro.</Empty>;
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {cats.map((c) => (
          <label key={c.id} className="flex items-center gap-3 text-sm">
            <span className="flex-1 truncate">{c.name}</span>
            <Input type="number" min={0} max={100} step="0.5" className="w-20 h-8" value={val(c)} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} />
            <span className="w-24 text-right font-mono text-xs text-muted-foreground">{money((month.income * (Number(val(c)) || 0)) / 100)}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className={cn("text-sm", total > 100 ? "text-destructive" : "text-muted-foreground")}>
          Total distribuído: <b>{total.toFixed(1)}%</b> de {money(month.income)} · livre {(100 - total).toFixed(1)}%
        </p>
        <Button size="sm" onClick={save} disabled={update.isPending || Object.keys(draft).length === 0}>Salvar percentuais</Button>
      </div>
    </div>
  );
}

export function EnvelopePurchaseCheck({ month }: { month: MonthResult }) {
  const cats = useEnvelopeCategories();
  const [amount, setAmount] = useState("");
  const value = Number(amount) || 0;
  const list = useMemo(() => suggestEnvelopes(calculateEnvelopes(month, cats), value), [month, cats, value]);
  if (totalEnvelopePct(cats) <= 0) return <Empty>Defina os percentuais dos envelopes em Planejamento para simular.</Empty>;
  return (
    <div className="space-y-3">
      <label className="text-sm flex items-center gap-3">
        Valor pretendido (R$)
        <Input type="number" min={0} className="w-40" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      {value > 0 && (
        <ul className="space-y-1 text-sm">
          {list.map((e) => (
            <li key={e.categoryId} className="flex justify-between gap-3 border-b border-border py-1.5 last:border-0">
              <span className="truncate">{e.name}</span>
              <span className="font-mono text-xs text-muted-foreground">tem {money(e.available)}</span>
              <span className={cn("font-semibold text-xs w-40 text-right", e.fits ? "text-primary" : "text-destructive")}>
                {e.fits ? `Cabe · sobra ${money(e.after)}` : `Não cabe · falta ${money(-e.after)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {value > 0 && !list.some((e) => e.fits) && <p className="text-sm text-destructive">Nenhum envelope comporta esse valor neste mês.</p>}
    </div>
  );
}
