import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Lar.Contas" },
      { name: "description", content: "Acesse o planejamento financeiro da sua família." },
      { property: "og:title", content: "Entrar — Lar.Contas" },
      { property: "og:description", content: "Acesse o planejamento financeiro da sua família." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "Senha com no mínimo 6 caracteres"),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      setBusy(false);
      if (error) { toast.error("Não foi possível entrar", { description: error.message }); return; }
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      setBusy(false);
      if (error) { toast.error("Não foi possível cadastrar", { description: error.message }); return; }
      toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Falha ao entrar com Google"); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="kinetic hidden lg:flex flex-col justify-between p-12">
        <div className="font-display text-2xl font-extrabold tracking-tight">
          Lar<span className="text-primary">.</span>Contas
        </div>
        <div>
          <p className="eyebrow text-primary">Planejamento familiar</p>
          <h1 className="font-display text-5xl font-extrabold italic tracking-tight mt-3 max-w-md">
            Veja hoje as consequências de amanhã.
          </h1>
          <p className="mt-4 text-on-dark/60 max-w-sm">Balanço do mês, meta de 30%, parcelas, dívidas e simulações — num só lugar.</p>
        </div>
        <p className="eyebrow text-on-dark/40">6 meses · 1 ano · 2 anos · 5 anos</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="glass w-full max-w-sm p-8 rise">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">
            {mode === "in" ? "Entrar" : "Criar conta"}
          </h2>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="kinetic" className="w-full h-11" disabled={busy}>
              {mode === "in" ? "Entrar" : "Cadastrar"}
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-full" onClick={google}>
              Continuar com Google
            </Button>
          </div>
          <button
            type="button"
            className="mt-6 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
