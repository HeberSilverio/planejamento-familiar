import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/dividas")({
  head: () => ({ meta: [{ title: "Dívidas — Lar.Contas" }, { name: "description", content: "Dívidas do planejamento financeiro familiar." }, { property: "og:title", content: "Dívidas — Lar.Contas" }, { property: "og:description", content: "Dívidas do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Dívidas" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
