import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTable, useTableMutations } from "@/lib/data/tables";
import type { TableName } from "@/lib/finance/types";
import { Panel, Empty } from "./ui";

export type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "bool" | "select" | "int";
  required?: boolean;
  options?: { value: string; label: string }[];
  default?: unknown;
  hint?: string;
  min?: number;
};

type AnyRow = Record<string, unknown> & { id: string };

/** Formulário + lista genéricos com validação, reutilizado por todas as telas de cadastro. */
export function CrudSection<T extends AnyRow>({
  table,
  title,
  fields,
  render,
  invalidate,
  addLabel = "Adicionar",
  orderBy,
  footer,
  filter,
}: {
  table: TableName;
  title: ReactNode;
  fields: Field[];
  render: (row: T) => ReactNode;
  invalidate?: TableName[];
  addLabel?: string;
  orderBy?: string;
  footer?: ReactNode;
  filter?: (row: T) => boolean;
}) {
  const { data = [], isLoading } = useTable<T>(table, orderBy);
  const { insert, update, remove } = useTableMutations(table, invalidate);
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const rows = filter ? data.filter(filter) : data;

  return (
    <Panel
      title={title}
      action={
        <Button size="sm" variant="kinetic" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus /> {addLabel}
        </Button>
      }
    >
      {isLoading ? (
        <Empty>Carregando…</Empty>
      ) : rows.length === 0 ? (
        <Empty>Nada cadastrado ainda.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">{render(row)}</div>
              <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => { setEditing(row); setOpen(true); }}>
                <Pencil />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Excluir"
                onClick={() => { if (confirm("Excluir este item?")) remove.mutate(row.id); }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {footer}
      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        fields={fields}
        initial={editing}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await insert.mutateAsync(values);
          toast.success("Salvo");
          setOpen(false);
        }}
      />
    </Panel>
  );
}

export function RecordDialog({
  open, onOpenChange, fields, initial, onSubmit, title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fields: Field[];
  initial: Record<string, unknown> | null;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold">{title ?? (initial ? "Editar" : "Adicionar")}</DialogTitle>
        </DialogHeader>
        {open && <RecordForm key={String(initial?.["id"] ?? "new")} fields={fields} initial={initial} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function RecordForm({ fields, initial, onSubmit }: { fields: Field[]; initial: Record<string, unknown> | null; onSubmit: (v: Record<string, unknown>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    for (const f of fields) {
      const cur = initial?.[f.name];
      v[f.name] = cur ?? f.default ?? (f.type === "bool" ? false : "");
    }
    return v;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: unknown) => setValues((s) => ({ ...s, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = values[f.name];
      const empty = raw === "" || raw == null;
      if (f.required && empty) { errs[f.name] = "Obrigatório"; continue; }
      if (f.type === "number" || f.type === "int") {
        if (empty) { out[f.name] = null; continue; }
        const num = Number(String(raw).replace(",", "."));
        if (Number.isNaN(num)) { errs[f.name] = "Número inválido"; continue; }
        if (f.min != null && num < f.min) { errs[f.name] = `Mínimo ${f.min}`; continue; }
        out[f.name] = f.type === "int" ? Math.round(num) : num;
      } else if (f.type === "bool") {
        out[f.name] = !!raw;
      } else {
        out[f.name] = empty ? null : typeof raw === "string" ? raw.trim() : raw;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await onSubmit(out); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          {f.type === "bool" ? (
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{f.label}</span>
              <Switch checked={!!values[f.name]} onCheckedChange={(c) => set(f.name, c)} />
            </label>
          ) : (
            <>
              <Label htmlFor={f.name}>{f.label}{f.required && " *"}</Label>
              {f.type === "select" ? (
                <select
                  id={f.name}
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => set(f.name, e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-popover px-3 text-sm"
                >
                  <option value="">—</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <Input
                  id={f.name}
                  type={f.type === "date" ? "date" : "text"}
                  inputMode={f.type === "number" || f.type === "int" ? "decimal" : undefined}
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
            </>
          )}
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          {errors[f.name] && <p className="text-xs text-destructive">{errors[f.name]}</p>}
        </div>
      ))}
      <DialogFooter>
        <Button type="submit" variant="kinetic" disabled={busy}>Salvar</Button>
      </DialogFooter>
    </form>
  );
}
