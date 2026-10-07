import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat } from "@/components/app/ui";
import { CrudSection } from "@/components/app/CrudSection";
import { useTable } from "@/lib/data/tables";
import { useOptions } from "@/lib/data/options";
import { money, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/familia")({
  head: () => ({
    meta: [
      { title: "Família — Lar.Contas" },
      { name: "description", content: "Cadastre os membros da família e suas fontes de renda." },
      { property: "og:title", content: "Família — Lar.Contas" },
      { property: "og:description", content: "Cadastre os membros da família e suas fontes de renda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Member = { id: string; name: string; birth_year: number | null; role: string | null; in_budget: boolean };
type Income = { id: string; name: string; amount: number; member_id: string | null; in_budget: boolean; start_date: string; end_date: string | null };

function Page() {
  const { members, memberOpts, name } = useOptions();
  const incomes = useTable<Income>("income_sources").data ?? [];
  const active = incomes.filter((i) => i.in_budget);
  const total = active.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Família" />
      <Panel className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Membros" value={members.length} />
          <Stat label="Renda mensal no orçamento" value={money(total)} tone="primary" />
          {members.slice(0, 2).map((m) => (
            <Stat key={m.id} label={`Renda de ${m.name}`} value={money(active.filter((i) => i.member_id === m.id).reduce((s, i) => s + Number(i.amount), 0))} />
          ))}
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <CrudSection<Member>
          table="family_members"
          title="Membros"
          addLabel="Novo membro"
          invalidate={["income_sources"]}
          fields={[
            { name: "name", label: "Nome", type: "text", required: true },
            { name: "role", label: "Papel (ex.: pai, mãe, filho)", type: "text" },
            { name: "birth_year", label: "Ano de nascimento", type: "int", min: 1900 },
            { name: "in_budget", label: "Entra no orçamento", type: "bool", default: true },
          ]}
          render={(m) => (
            <div>
              <p className="font-semibold">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                {[m.role, m.birth_year].filter(Boolean).join(" · ") || "—"}
                {!m.in_budget && " · fora do orçamento"}
              </p>
            </div>
          )}
        />
        <CrudSection<Income>
          table="income_sources"
          title="Fontes de renda"
          addLabel="Nova renda"
          fields={[
            { name: "name", label: "Descrição (ex.: salário)", type: "text", required: true },
            { name: "amount", label: "Valor mensal (R$)", type: "number", required: true, min: 0 },
            { name: "member_id", label: "Membro", type: "select", options: memberOpts },
            { name: "start_date", label: "Início", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
            { name: "end_date", label: "Término (opcional)", type: "date" },
            { name: "in_budget", label: "Entra no orçamento", type: "bool", default: true },
          ]}
          render={(i) => (
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  {name(members, i.member_id) ?? "Sem membro"} · desde {dateBR(i.start_date)}
                  {i.end_date && ` até ${dateBR(i.end_date)}`}
                </p>
              </div>
              <p className="font-display font-extrabold text-primary">{money(i.amount)}</p>
            </div>
          )}
        />
      </div>
    </>
  );
}
