import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat } from "@/components/app/ui";
import { CrudSection } from "@/components/app/CrudSection";
import { useTable } from "@/lib/data/tables";
import { useOptions } from "@/lib/data/options";
import { money, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Lar.Contas" },
      { name: "description", content: "Contas, cartões, despesas fixas, parcelamentos e lançamentos da família." },
      { property: "og:title", content: "Financeiro — Lar.Contas" },
      { property: "og:description", content: "Contas, cartões, despesas fixas, parcelamentos e lançamentos da família." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = { id: string; name: any; kind: any; amount: any; installment_amount: any; balance: any; category_id: any; day_of_month: any;
  installments_total: any; first_due_date: any; credit_card_id: any; description: any; date: any; member_id: any;
  closing_day: any; due_day: any; credit_limit: any; [k: string]: unknown };
const today = () => new Date().toISOString().slice(0, 10);
const kindOpts = [{ value: "expense", label: "Despesa" }, { value: "income", label: "Receita" }];

function Line({ title, sub, value, tone }: { title: string; sub?: string | undefined; value?: string | undefined; tone?: "income" | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {value && <p className={tone === "income" ? "font-display font-extrabold text-primary" : "font-display font-extrabold"}>{value}</p>}
    </div>
  );
}

function Page() {
  const { members, categories, cards, memberOpts, expenseCatOpts, catOpts, cardOpts, name } = useOptions();
  const accounts = useTable<Row>("accounts").data ?? [];
  const recurring = useTable<Row>("recurring_transactions").data ?? [];
  const commitments = useTable<Row>("commitments").data ?? [];
  const accountOpts = accounts.map((a) => ({ value: a.id, label: a.name }));

  const fixed = recurring.filter((r) => r.kind === "expense").reduce((s, r) => s + Number(r.amount), 0);
  const parcels = commitments.reduce((s, c) => s + Number(c.installment_amount), 0);
  const balance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Financeiro" />
      <Panel className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Saldo em contas" value={money(balance)} tone="primary" />
          <Stat label="Despesas fixas/mês" value={money(fixed)} />
          <Stat label="Parcelas/mês" value={money(parcels)} tone="warn" />
          <Stat label="Cartões" value={cards.length} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <CrudSection<Row>
          table="recurring_transactions"
          title="Despesas e receitas fixas mensais"
          addLabel="Nova fixa"
          fields={[
            { name: "name", label: "Descrição (ex.: luz, internet)", type: "text", required: true },
            { name: "amount", label: "Valor (R$)", type: "number", required: true, min: 0 },
            { name: "kind", label: "Tipo", type: "select", options: kindOpts, default: "expense", required: true },
            { name: "category_id", label: "Categoria", type: "select", options: catOpts },
            { name: "day_of_month", label: "Dia do vencimento", type: "int", min: 1 },
            { name: "start_date", label: "Início", type: "date", required: true, default: today() },
            { name: "end_date", label: "Término (opcional)", type: "date" },
          ]}
          render={(r) => (
            <Line
              title={r.name}
              sub={`${name(categories, r.category_id) ?? "Sem categoria"}${r.day_of_month ? ` · dia ${r.day_of_month}` : ""}`}
              value={money(r.amount)}
              tone={r.kind === "income" ? "income" : undefined}
            />
          )}
        />
        <CrudSection<Row>
          table="commitments"
          title="Compromissos e parcelamentos"
          addLabel="Novo compromisso"
          fields={[
            { name: "name", label: "Descrição (ex.: consórcio)", type: "text", required: true },
            { name: "kind", label: "Tipo", type: "select", required: true, default: "installment", options: [{ value: "installment", label: "Parcelado" }, { value: "recurring", label: "Recorrente" }] },
            { name: "installment_amount", label: "Valor da parcela (R$)", type: "number", required: true, min: 0 },
            { name: "installments_total", label: "Nº de parcelas", type: "int", min: 1, hint: "Deixe vazio se for recorrente sem fim." },
            { name: "first_due_date", label: "1º vencimento", type: "date", required: true, default: today() },
            { name: "due_day", label: "Dia do vencimento", type: "int", min: 1 },
            { name: "category_id", label: "Categoria", type: "select", options: expenseCatOpts },
            { name: "credit_card_id", label: "Cartão", type: "select", options: cardOpts },
            { name: "member_id", label: "Responsável", type: "select", options: memberOpts },
            { name: "notes", label: "Observações", type: "text" },
          ]}
          render={(c) => (
            <Line
              title={c.name}
              sub={`${c.installments_total ? `${c.installments_total}x` : "Recorrente"} · desde ${dateBR(c.first_due_date)}${c.credit_card_id ? ` · ${name(cards, c.credit_card_id)}` : ""}`}
              value={money(c.installment_amount)}
            />
          )}
        />
        <CrudSection<Row>
          table="transactions"
          title="Lançamentos avulsos"
          addLabel="Novo lançamento"
          orderBy="date"
          fields={[
            { name: "description", label: "Descrição", type: "text", required: true },
            { name: "amount", label: "Valor (R$)", type: "number", required: true, min: 0 },
            { name: "kind", label: "Tipo", type: "select", options: kindOpts, default: "expense", required: true },
            { name: "date", label: "Data", type: "date", required: true, default: today() },
            { name: "category_id", label: "Categoria", type: "select", options: catOpts },
            { name: "member_id", label: "Membro", type: "select", options: memberOpts },
            { name: "account_id", label: "Conta", type: "select", options: accountOpts },
            { name: "credit_card_id", label: "Cartão", type: "select", options: cardOpts },
          ]}
          render={(t) => (
            <Line
              title={t.description}
              sub={`${dateBR(t.date)} · ${name(categories, t.category_id) ?? "Sem categoria"}${t.member_id ? ` · ${name(members, t.member_id)}` : ""}`}
              value={money(t.amount)}
              tone={t.kind === "income" ? "income" : undefined}
            />
          )}
        />
        <CrudSection<Row>
          table="categories"
          title="Categorias"
          addLabel="Nova categoria"
          orderBy="name"
          fields={[
            { name: "name", label: "Nome", type: "text", required: true },
            { name: "kind", label: "Tipo", type: "select", options: kindOpts, default: "expense", required: true },
          ]}
          render={(c) => <Line title={c.name} sub={c.kind === "income" ? "Receita" : "Despesa"} />}
        />
        <CrudSection<Row>
          table="accounts"
          title="Contas bancárias"
          addLabel="Nova conta"
          fields={[
            { name: "name", label: "Nome (ex.: Nubank)", type: "text", required: true },
            { name: "balance", label: "Saldo atual (R$)", type: "number", required: true, default: 0 },
          ]}
          render={(a) => <Line title={a.name} value={money(a.balance)} tone="income" />}
        />
        <CrudSection<Row>
          table="credit_cards"
          title="Cartões de crédito"
          addLabel="Novo cartão"
          fields={[
            { name: "name", label: "Nome", type: "text", required: true },
            { name: "credit_limit", label: "Limite (R$)", type: "number", required: true, min: 0, default: 0 },
            { name: "closing_day", label: "Dia de fechamento", type: "int", min: 1 },
            { name: "due_day", label: "Dia de vencimento", type: "int", min: 1 },
          ]}
          render={(c) => (
            <Line
              title={c.name}
              sub={`Fecha dia ${c.closing_day ?? "—"} · vence dia ${c.due_day ?? "—"}`}
              value={money(c.credit_limit)}
            />
          )}
        />
      </div>
    </>
  );
}
