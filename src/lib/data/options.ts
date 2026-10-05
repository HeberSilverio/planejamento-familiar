import { useTable } from "./tables";
import type { Category, CreditCard, Member } from "@/lib/finance/types";

/** Opções para selects de relacionamento. */
export function useOptions() {
  const members = useTable<Member>("family_members").data ?? [];
  const categories = useTable<Category>("categories").data ?? [];
  const cards = useTable<CreditCard>("credit_cards").data ?? [];
  return {
    members,
    categories,
    cards,
    memberOpts: members.map((m) => ({ value: m.id, label: m.name })),
    expenseCatOpts: categories.filter((c) => c.kind === "expense").map((c) => ({ value: c.id, label: c.name })),
    catOpts: categories.map((c) => ({ value: c.id, label: `${c.name} (${c.kind === "income" ? "receita" : "despesa"})` })),
    cardOpts: cards.map((c) => ({ value: c.id, label: c.name })),
    name: (list: { id: string; name: string }[], id: string | null | undefined) => list.find((x) => x.id === id)?.name,
  };
}
