import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/familia")({
  head: () => ({ meta: [{ title: "Família — Lar.Contas" }, { name: "description", content: "Família do planejamento financeiro familiar." }, { property: "og:title", content: "Família — Lar.Contas" }, { property: "og:description", content: "Família do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Família" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
