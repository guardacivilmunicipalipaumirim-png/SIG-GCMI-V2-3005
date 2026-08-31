import { Gauge } from "lucide-react";
import { DataModule } from "@/components/data-module";
import { Aviso, Esqueleto } from "@/components/ui/campos";
import { moduloPorChave } from "@/lib/modules";
import { numero } from "@/lib/formatos";
import { podeVer, type UsuarioSessao } from "@/lib/session";
import { useIndicadoresAutomaticos } from "@/queries/relatorios";

export default function IndicadoresPage({ usuario }: { usuario: UsuarioSessao }) {
  const modulo = moduloPorChave("indicadores");
  const automaticos = useIndicadoresAutomaticos();

  if (!modulo) return <Aviso texto="Módulo não encontrado." />;
  if (!podeVer(usuario, "indicadores")) return <Aviso texto="Você não tem permissão para acessar este módulo." />;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <header className="flex items-center gap-2">
          <Gauge className="size-4 text-gold" />
          <h2 className="display text-sm font-semibold text-foreground">Indicadores automáticos</h2>
          <span className="text-[11px] text-muted-foreground">calculados a partir dos registros do mês corrente</span>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {automaticos.isPending &&
            Array.from({ length: 6 }).map((_, i) => <Esqueleto key={i} className="h-[76px]" />)}

          {automaticos.data?.map((item) => (
            <div key={item.nome} className="rounded-lg border border-border bg-surface-2/50 px-4 py-3">
              <p className="rotulo truncate" title={item.nome}>
                {item.nome}
              </p>
              <p className="display mt-1 text-2xl font-bold tabular-nums text-foreground">
                {numero(item.valor)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{item.unidade}</span>
              </p>
            </div>
          ))}
        </div>

        {automaticos.isError && (
          <div className="mt-3">
            <Aviso texto="Não foi possível calcular os indicadores automáticos." />
          </div>
        )}
      </section>

      <DataModule modulo={modulo} usuario={usuario} />
    </div>
  );
}
