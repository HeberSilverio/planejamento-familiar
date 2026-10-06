import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/objetivos")({
  head: () => ({ meta: [{ title: "Objetivos — Lar.Contas" }, { name: "description", content: "Objetivos do planejamento financeiro familiar." }, { property: "og:title", content: "Objetivos — Lar.Contas" }, { property: "og:description", content: "Objetivos do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Objetivos" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
