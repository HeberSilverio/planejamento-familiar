const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function money(v: number | null | undefined) {
  return brl.format(Number(v ?? 0));
}

export function signedMoney(v: number) {
  return (v >= 0 ? "+" : "−") + brl.format(Math.abs(v));
}

export function compactMoney(v: number) {
  const abs = Math.abs(v);
  const sign = v >= 0 ? "+" : "−";
  if (abs >= 1000) return `${sign}${(abs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `${sign}${abs.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function dateBR(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}
