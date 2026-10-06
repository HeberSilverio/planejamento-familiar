import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Lar.Contas" }, { name: "description", content: "Financeiro do planejamento financeiro familiar." }, { property: "og:title", content: "Financeiro — Lar.Contas" }, { property: "og:description", content: "Financeiro do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Financeiro" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
