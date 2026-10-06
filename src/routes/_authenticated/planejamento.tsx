import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/planejamento")({
  head: () => ({ meta: [{ title: "Planejamento — Lar.Contas" }, { name: "description", content: "Planejamento do planejamento financeiro familiar." }, { property: "og:title", content: "Planejamento — Lar.Contas" }, { property: "og:description", content: "Planejamento do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Planejamento" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
