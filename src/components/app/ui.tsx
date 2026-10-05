import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/lib/finance/types";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6 rise">
      <div>
        {eyebrow && <p className="eyebrow text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-display font-extrabold text-3xl tracking-tight mt-1">{title}</h1>
      </div>
      {children && <div className="flex gap-2 flex-wrap">{children}</div>}
    </header>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass p-5 sm:p-6 rise", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-display font-extrabold text-lg tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" | "primary" | "destructive" }) {
  return (
    <div>
      <p className={cn("eyebrow", tone === "warn" ? "text-warn" : tone === "destructive" ? "text-destructive" : "text-muted-foreground")}>{label}</p>
      <p
        className={cn(
          "font-display font-extrabold text-lg mt-0.5",
          tone === "warn" && "text-warn",
          tone === "primary" && "text-primary",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ProgressBar({ value, tone = "primary", className }: { value: number; tone?: "primary" | "warn" | "destructive"; className?: string }) {
  const color = tone === "warn" ? "bg-warn" : tone === "destructive" ? "bg-destructive" : "bg-primary";
  return (
    <div className={cn("h-2 bg-foreground/10 rounded-full overflow-hidden", className)}>
      <div className={cn("h-full rounded-full bar-fill", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const STATUS = {
  positivo: { label: "Positivo", cls: "bg-primary text-primary-foreground" },
  atencao: { label: "Atenção", cls: "bg-warn text-warn-foreground" },
  negativo: { label: "Negativo", cls: "bg-destructive text-destructive-foreground" },
};

export function StatusBadge({ status }: { status: HealthStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn("font-display font-extrabold text-xs tracking-widest px-3 py-1.5 rounded-full uppercase", s.cls)}>{s.label}</span>
  );
}

export function statusText(status: HealthStatus) {
  return status === "positivo" ? "text-primary" : status === "atencao" ? "text-warn" : "text-destructive";
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}
