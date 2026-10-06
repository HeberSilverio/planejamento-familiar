import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Lar.Contas" }, { name: "description", content: "Relatórios do planejamento financeiro familiar." }, { property: "og:title", content: "Relatórios — Lar.Contas" }, { property: "og:description", content: "Relatórios do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Relatórios" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
