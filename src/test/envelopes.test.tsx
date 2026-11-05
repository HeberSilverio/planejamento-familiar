import { describe, it, expect } from "vitest";
import { calculateEnvelopes, suggestEnvelopes } from "@/lib/finance/engine";
import type { MonthResult } from "@/lib/finance/types";

const month = {
  income: 4500,
  items: [
    { label: "Aluguel", amount: 960, group: "expense", source: "recurring", categoryId: "mor" },
    { label: "Mercado", amount: 1000, group: "expense", source: "transaction", categoryId: "ali" },
    { label: "Remédio", amount: 600, group: "expense", source: "transaction", categoryId: "sau" },
  ],
} as unknown as MonthResult;
const cats = [
  { id: "mor", name: "Moradia", kind: "expense", envelope_pct: 30 },
  { id: "ali", name: "Alimentação", kind: "expense", envelope_pct: 25 },
  { id: "sau", name: "Saúde", kind: "expense", envelope_pct: 5 },
];

describe("envelopes", () => {
  const env = calculateEnvelopes(month, cats);
  const by = (id: string) => env.find((e) => e.categoryId === id)!;
  it("teto = renda do mês × %", () => expect(by("mor").ceiling).toBe(1350));
  it("disponível = teto − gastos", () => expect(by("mor").available).toBe(390));
  it("acima de 85% do teto fica 'acabando'", () => expect(by("ali").status).toBe("acabando"));
  it("acima do teto fica 'estourado'", () => expect(by("sau").status).toBe("estourado"));
  it("compra de R$ 200 só cabe em Moradia", () => {
    const s = suggestEnvelopes(env, 200).filter((e) => e.fits).map((e) => e.categoryId);
    expect(s).toEqual(["mor"]);
  });
});
