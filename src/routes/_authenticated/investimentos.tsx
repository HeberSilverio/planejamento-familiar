import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/investimentos")({
  head: () => ({ meta: [{ title: "Investimentos — Lar.Contas" }, { name: "description", content: "Investimentos do planejamento financeiro familiar." }, { property: "og:title", content: "Investimentos — Lar.Contas" }, { property: "og:description", content: "Investimentos do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Investimentos" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
