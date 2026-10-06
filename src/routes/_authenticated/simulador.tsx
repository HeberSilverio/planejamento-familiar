import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({ meta: [{ title: "Simulador — Lar.Contas" }, { name: "description", content: "Simulador do planejamento financeiro familiar." }, { property: "og:title", content: "Simulador — Lar.Contas" }, { property: "og:description", content: "Simulador do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Simulador" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
