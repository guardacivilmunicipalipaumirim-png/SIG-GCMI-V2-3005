import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  aberto,
  titulo,
  descricao,
  largura = "grande",
  onFechar,
  children,
  rodape,
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  largura?: "pequena" | "media" | "grande";
  onFechar: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
      <div
        className={cn(
          "entrada my-auto w-full rounded-xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]",
          largura === "pequena" && "max-w-md",
          largura === "media" && "max-w-2xl",
          largura === "grande" && "max-w-4xl",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="display text-lg font-semibold text-foreground">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {rodape && <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">{rodape}</footer>}
      </div>
    </div>
  );
}
