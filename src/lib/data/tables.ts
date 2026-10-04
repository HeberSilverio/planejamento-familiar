/**
 * Camada de acesso a dados. Componentes nunca chamam o banco diretamente:
 * usam estes hooks. Para migrar de infraestrutura, basta trocar esta camada.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TableName } from "@/lib/finance/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (t: TableName) => supabase.from(t as any) as any;

export function useTable<T = Record<string, unknown>>(table: TableName, orderBy = "created_at") {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await from(table).select("*").order(orderBy, { ascending: true });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useTableMutations(table: TableName, invalidate: TableName[] = []) {
  const qc = useQueryClient();
  const refresh = () => [table, ...invalidate].forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
  const onError = (e: Error) => toast.error("Não foi possível salvar", { description: e.message });

  const insert = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data, error } = await from(table).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
    onError,
  });
  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await from(table).update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError,
  });
  return { insert, update, remove };
}

export async function insertRows(table: TableName, rows: Record<string, unknown>[]) {
  const { data, error } = await from(table).insert(rows).select();
  if (error) throw error;
  return data as Record<string, unknown>[];
}
