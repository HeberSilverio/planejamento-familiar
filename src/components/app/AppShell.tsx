import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/financeiro", label: "Financeiro" },
  { to: "/planejamento", label: "Planejamento" },
  { to: "/simulador", label: "Simulador" },
  { to: "/dividas", label: "Dívidas" },
  { to: "/compras", label: "Compras planejadas" },
  { to: "/objetivos", label: "Objetivos" },
  { to: "/investimentos", label: "Investimentos" },
  { to: "/familia", label: "Família" },
  { to: "/gamificacao", label: "Gamificação" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/configuracoes", label: "Configurações" },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-sidebar-accent border-l-2 border-transparent"
          activeProps={{ className: "bg-primary/15 !text-primary font-semibold !border-primary" }}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-56 shrink-0 bg-sidebar text-sidebar-foreground px-4 py-6 flex-col gap-1 slide-in sticky top-0 h-screen">
        <Brand />
        <NavLinks />
        <button onClick={logout} className="mt-auto flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-sidebar-accent">
          <LogOut /> Sair
        </button>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between bg-sidebar text-sidebar-foreground px-4 py-3 sticky top-0 z-30">
          <Brand />
          <button onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button>
        </div>
        {open && (
          <div className="lg:hidden fixed inset-0 z-40 bg-sidebar text-sidebar-foreground p-5 flex flex-col gap-1 overflow-y-auto">
            <div className="flex justify-between items-center">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <button onClick={logout} className="mt-4 flex items-center gap-2 px-3 py-2 text-sm"><LogOut /> Sair</button>
          </div>
        )}
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className={cn("font-display font-extrabold text-xl tracking-tight text-on-dark lg:mb-5")}>
      Lar<span className="text-primary">.</span>Contas
    </div>
  );
}
