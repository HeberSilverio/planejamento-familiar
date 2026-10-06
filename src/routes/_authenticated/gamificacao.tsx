import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/gamificacao")({
  head: () => ({ meta: [{ title: "Gamificação — Lar.Contas" }, { name: "description", content: "Gamificação do planejamento financeiro familiar." }, { property: "og:title", content: "Gamificação — Lar.Contas" }, { property: "og:description", content: "Gamificação do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Gamificação" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
