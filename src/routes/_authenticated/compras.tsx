import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [{ title: "Compras planejadas — Lar.Contas" }, { name: "description", content: "Compras planejadas do planejamento financeiro familiar." }, { property: "og:title", content: "Compras planejadas — Lar.Contas" }, { property: "og:description", content: "Compras planejadas do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Compras planejadas" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
