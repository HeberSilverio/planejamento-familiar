import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MonthItem } from "@/lib/finance/types";

/** Marca/desmarca uma ocorrência como paga. Cada mês é independente. */
export function useTogglePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, paid, paidOn }: { item: MonthItem; paid: boolean; paidOn?: string }) => {
      if (!item.payType || !item.refId) throw new Error("Item sem vínculo de pagamento");
      // Data efetiva do pagamento: define em qual mês o dinheiro sai do caixa.
      const paidAt = paid && paidOn ? `${paidOn}T12:00:00-03:00` : undefined;
      if (item.payType === "transaction") {
        const { error } = await supabase.from("transactions").update({ paid, ...(paidAt ? { paid_at: paidAt } : {}) }).eq("id", item.refId);
        if (error) throw error;
        return;
      }
      if (!item.monthKey) throw new Error("Ocorrência sem mês");
      if (paid) {
        const { error } = await supabase.from("obligation_payments").upsert(
          { source_type: item.payType, source_id: item.refId, month_key: item.monthKey, ...(paidAt ? { paid_at: paidAt } : {}) },
          { onConflict: "user_id,source_type,source_id,month_key" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from("obligation_payments").delete()
          .eq("source_type", item.payType).eq("source_id", item.refId).eq("month_key", item.monthKey);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["obligation_payments"] });
      toast.success(v.paid ? "Marcada como paga" : "Reaberta como pendente");
    },
    onError: (e: Error) => toast.error("Não foi possível atualizar", { description: e.message }),
  });
}
