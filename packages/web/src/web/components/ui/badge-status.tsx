import { cn } from "@/lib/utils";
import { tomStatus } from "@/lib/formatos";

const TONS: Record<string, string> = {
  success: "border-success/40 bg-success/12 text-success",
  warning: "border-warning/40 bg-warning/12 text-warning",
  danger: "border-danger/40 bg-danger/12 text-danger",
  info: "border-primary-light/40 bg-primary-light/12 text-primary-light",
  neutro: "border-border bg-surface-2 text-muted-foreground",
};

export function BadgeStatus({ valor, className }: { valor: unknown; className?: string }) {
  const texto = String(valor ?? "").trim();
  if (!texto) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        TONS[tomStatus(texto)],
        className,
      )}
    >
      {texto}
    </span>
  );
}
