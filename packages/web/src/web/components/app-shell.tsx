import * as React from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, LogOut, Menu, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULOS, SECOES, type ModuloDef } from "@/lib/modules";
import { podeVer, type UsuarioSessao } from "@/lib/session";
import { useLogout } from "@/queries/auth";

function Relogio() {
  const [agora, setAgora] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="hidden text-right leading-tight sm:block">
      <p className="display text-sm font-semibold tabular-nums text-foreground">
        {agora.toLocaleTimeString("pt-BR")}
      </p>
      <p className="text-[11px] capitalize text-muted-foreground">
        {agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

function ItemMenu({ modulo, ativo, onNavegar }: { modulo: ModuloDef; ativo: boolean; onNavegar: () => void }) {
  const Icone = modulo.icone;
  return (
    <Link
      to={modulo.rota}
      onClick={onNavegar}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        ativo
          ? "bg-primary/25 text-foreground shadow-[inset_2px_0_0_0_var(--gold)]"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icone className={cn("size-4 shrink-0", ativo ? "text-gold" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate">{modulo.curto}</span>
    </Link>
  );
}

export function AppShell({ usuario, children }: { usuario: UsuarioSessao; children: React.ReactNode }) {
  const [rota] = useLocation();
  const [menuAberto, setMenuAberto] = React.useState(false);
  const logout = useLogout();

  const visiveis = React.useMemo(() => MODULOS.filter((m) => podeVer(usuario, m.chave)), [usuario]);
  const atual = visiveis.find((m) => rota.startsWith(m.rota));

  const sair = () => {
    logout.mutate(undefined as never, { onSettled: () => window.location.replace("/") });
  };

  const menu = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4">
      {SECOES.map((secao) => {
        const itens = visiveis.filter((m) => m.secao === secao);
        if (!itens.length) return null;
        return (
          <div key={secao} className="flex flex-col gap-1">
            <p className="rotulo px-3 pb-1">{secao}</p>
            {itens.map((modulo) => (
              <ItemMenu
                key={modulo.chave}
                modulo={modulo}
                ativo={rota.startsWith(modulo.rota)}
                onNavegar={() => setMenuAberto(false)}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Menu lateral — desktop */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <img src="/images/brasao.png" alt="Brasão da GCM de Ipaumirim" className="size-10 object-contain" />
          <div className="leading-tight">
            <p className="display text-base font-bold tracking-wide text-foreground">SIG-GCMI</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Ipaumirim · Ceará</p>
          </div>
        </div>
        {menu}
        <div className="border-t border-border px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
          Sistema de uso exclusivo da Guarda Civil Municipal de Ipaumirim.
        </div>
      </aside>

      {/* Menu lateral — mobile */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMenuAberto(false)}
          />
          <aside className="relative z-10 flex h-full w-[264px] flex-col border-r border-border bg-sidebar">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <img src="/images/brasao.png" alt="Brasão" className="size-9 object-contain" />
                <p className="display text-base font-bold text-foreground">SIG-GCMI</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
            {menu}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="rotulo">{atual?.secao ?? "Central"}</p>
            <h1 className="display truncate text-lg font-semibold text-foreground">
              {atual?.titulo ?? "Central de Operações"}
            </h1>
          </div>
          <Relogio />
          <div className="hidden items-center gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-1.5 md:flex">
            <ShieldCheck className="size-4 text-gold" />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-foreground">{usuario.nome}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{usuario.perfil}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={sair}
            disabled={logout.isPending}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger disabled:opacity-60"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{logout.isPending ? "Saindo…" : "Sair"}</span>
          </button>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
