import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MonthItem } from "@/lib/finance/types";

/** Marca/desmarca uma ocorrência como paga. Cada mês é independente. */
export function useTogglePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, paid }: { item: MonthItem; paid: boolean }) => {
      if (!item.payType || !item.refId) throw new Error("Item sem vínculo de pagamento");
      if (item.payType === "transaction") {
        const { error } = await supabase.from("transactions").update({ paid }).eq("id", item.refId);
        if (error) throw error;
        return;
      }
      if (!item.monthKey) throw new Error("Ocorrência sem mês");
      if (paid) {
        const { error } = await supabase.from("obligation_payments").upsert(
          { source_type: item.payType, source_id: item.refId, month_key: item.monthKey },
          { onConflict: "user_id,source_type,source_id,month_key", ignoreDuplicates: true },
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
