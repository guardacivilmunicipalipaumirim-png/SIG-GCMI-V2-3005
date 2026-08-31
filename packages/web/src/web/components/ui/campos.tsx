import * as React from "react";
import { cn } from "@/lib/utils";

const baseControle =
  "w-full rounded-md border border-border bg-surface-2/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary-light focus:ring-2 focus:ring-primary-light/30 disabled:opacity-60";

export function Campo({
  rotulo,
  dica,
  obrigatorio,
  className,
  children,
}: {
  rotulo: string;
  dica?: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="rotulo">
        {rotulo}
        {obrigatorio && <span className="ml-1 text-gold">*</span>}
      </span>
      {children}
      {dica && <span className="text-[11px] text-muted-foreground/80">{dica}</span>}
    </label>
  );
}

export function Entrada({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(baseControle, className)} {...props} />;
}

export function AreaTexto({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea rows={3} className={cn(baseControle, "resize-y", className)} {...props} />;
}

export function Selecao({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(baseControle, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-primary-light border-t-transparent" />
      {texto}
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

export function Aviso({ texto, tom = "danger" }: { texto: string; tom?: "danger" | "success" }) {
  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        tom === "danger"
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-success/40 bg-success/10 text-success",
      )}
    >
      {texto}
    </p>
  );
}
