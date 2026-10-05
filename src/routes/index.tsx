import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lar.Contas — Planejamento financeiro familiar" },
      { name: "description", content: "Veja o balanço do mês, a meta de investimento e o futuro financeiro da família." },
      { property: "og:title", content: "Lar.Contas — Planejamento financeiro familiar" },
      { property: "og:description", content: "Veja o balanço do mês, a meta de investimento e o futuro financeiro da família." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
