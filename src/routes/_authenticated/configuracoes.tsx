import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Lar.Contas" }, { name: "description", content: "Configurações do planejamento financeiro familiar." }, { property: "og:title", content: "Configurações — Lar.Contas" }, { property: "og:description", content: "Configurações do planejamento financeiro familiar." }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="Lar.Contas" title="Configurações" />
      <Panel><Empty>Esta tela ainda será construída.</Empty></Panel>
    </>
  );
}
