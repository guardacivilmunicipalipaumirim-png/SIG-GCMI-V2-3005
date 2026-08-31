import * as React from "react";
import { Layers, MapPin, RefreshCw, ShieldAlert } from "lucide-react";
import { DataModule } from "@/components/data-module";
import { Carregando, Selecao } from "@/components/ui/campos";
import { BadgeStatus } from "@/components/ui/badge-status";
import {
  CATEGORIAS,
  MapaOperacional,
  type CategoriaMapa,
  type PontoMapa,
  type ZonaMapa,
} from "@/components/mapa-operacional";
import { provedorAtual } from "@/lib/mapa-provedor";
import { dataHora, numero } from "@/lib/formatos";
import { moduloPorChave } from "@/lib/modules";
import type { UsuarioSessao } from "@/lib/session";
import { useDadosMapa } from "@/queries/painel";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Cor do marcador da ocorrência conforme a prioridade. */
function corPrioridade(prioridade: unknown) {
  const valor = String(prioridade ?? "");
  if (valor === "Crítica") return "#d8443c";
  if (valor === "Alta") return "#e8843c";
  if (valor === "Média") return "#e8b430";
  return "#8a97bf";
}

const TODAS: CategoriaMapa[] = ["viaturas", "ocorrencias", "eventos", "operacoes", "apoios"];

export default function MapaPage({ usuario }: { usuario: UsuarioSessao }) {
  const [dias, setDias] = React.useState(30);
  const [autoAtualizar, setAutoAtualizar] = React.useState(false);
  const dados = useDadosMapa(dias, autoAtualizar ? 15000 : undefined);
  const modulo = moduloPorChave("mapa");
  const provedor = provedorAtual();

  const [visiveis, setVisiveis] = React.useState<Record<CategoriaMapa, boolean>>({
    viaturas: true,
    ocorrencias: true,
    eventos: true,
    operacoes: true,
    apoios: true,
  });

  const ocorrencias = React.useMemo(() => dados.data?.ocorrencias ?? [], [dados.data]);
  const viaturas = React.useMemo(() => dados.data?.viaturas ?? [], [dados.data]);
  const eventos = React.useMemo(() => dados.data?.eventos ?? [], [dados.data]);
  const operacoes = React.useMemo(() => dados.data?.operacoes ?? [], [dados.data]);
  const apoios = React.useMemo(() => dados.data?.apoios ?? [], [dados.data]);

  const zonas = React.useMemo<ZonaMapa[]>(
    () =>
      (dados.data?.zonas ?? [])
        .filter((z: any) => z.latitude != null && z.longitude != null)
        .map((z: any) => ({
          id: z.id,
          nome: z.nome,
          cor: z.cor,
          tipo: z.tipo,
          latitude: Number(z.latitude),
          longitude: Number(z.longitude),
          raioMetros: z.raioMetros,
        })),
    [dados.data],
  );

  /** Todos os registros georreferenciados normalizados para o mapa. */
  const pontos = React.useMemo<PontoMapa[]>(() => {
    const lista: PontoMapa[] = [];

    for (const v of viaturas as any[]) {
      lista.push({
        id: v.id,
        categoria: "viaturas",
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        titulo: `Viatura ${v.prefixo ?? v.placa ?? v.id}`,
        linhas: [v.status ? `Status: ${v.status}` : "", `Posição de ${dataHora(v.atualizadoEm)}`],
      });
    }

    for (const o of ocorrencias as any[]) {
      lista.push({
        id: o.id,
        categoria: "ocorrencias",
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        titulo: `${o.numero ?? "Ocorrência"} · ${o.tipo ?? ""}`.trim(),
        cor: corPrioridade(o.prioridade),
        linhas: [
          o.prioridade ? `Prioridade: ${o.prioridade}` : "",
          o.status ? `Status: ${o.status}` : "",
          [o.endereco, o.bairro].filter(Boolean).join(" — "),
          dataHora(o.dataHora),
        ],
      });
    }

    for (const e of eventos as any[]) {
      lista.push({
        id: e.id,
        categoria: "eventos",
        latitude: Number(e.latitude),
        longitude: Number(e.longitude),
        titulo: e.titulo ?? "Evento",
        linhas: [e.categoria ?? "", e.status ? `Status: ${e.status}` : "", e.local ?? "", dataHora(e.inicio)],
      });
    }

    for (const op of operacoes as any[]) {
      lista.push({
        id: op.id,
        categoria: "operacoes",
        latitude: Number(op.latitude),
        longitude: Number(op.longitude),
        titulo: op.nome ?? "Operação",
        linhas: [op.tipo ?? "", op.status ? `Status: ${op.status}` : "", op.areaAtuacao ?? "", dataHora(op.inicio)],
      });
    }

    for (const a of apoios as any[]) {
      lista.push({
        id: a.id,
        categoria: "apoios",
        latitude: Number(a.latitude),
        longitude: Number(a.longitude),
        titulo: a.nomeEvento ?? "Apoio",
        linhas: [a.tipo ?? "", a.status ? `Status: ${a.status}` : "", a.local ?? "", dataHora(a.dataHora)],
      });
    }

    return lista;
  }, [viaturas, ocorrencias, eventos, operacoes, apoios]);

  const contagem: Record<CategoriaMapa, number> = {
    viaturas: viaturas.length,
    ocorrencias: ocorrencias.length,
    eventos: eventos.length,
    operacoes: operacoes.length,
    apoios: apoios.length,
  };

  return (
    <div className="entrada flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Mapa em MapLibre GL com dados do OpenStreetMap — sem chave de API. Informe latitude e longitude nos
          registros para que apareçam aqui. As posições das viaturas podem ser enviadas pelo aplicativo do tablet.
        </p>
        <div className="flex items-center gap-2">
          <Selecao value={String(dias)} onChange={(e) => setDias(Number(e.target.value))} className="w-auto">
            <option value="1">Últimas 24 horas</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Últimos 12 meses</option>
          </Selecao>
          <button
            type="button"
            onClick={() => setAutoAtualizar((v) => !v)}
            className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
              autoAtualizar
                ? "border-success/50 bg-success/10 text-success"
                : "border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {autoAtualizar ? "Tempo real: ligado" : "Tempo real: desligado"}
          </button>
          <button
            type="button"
            onClick={() => dados.refetch()}
            disabled={dados.isFetching}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${dados.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TODAS.map((chave) => (
          <div key={chave} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="rotulo truncate" style={{ color: CATEGORIAS[chave].cor }}>
              {CATEGORIAS[chave].rotulo}
            </p>
            <p className="display mt-1 text-xl font-bold tabular-nums text-foreground">{numero(contagem[chave])}</p>
          </div>
        ))}
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="rotulo truncate">Sem coordenada</p>
          <p className="display mt-1 text-xl font-bold tabular-nums text-foreground">
            {numero(dados.data?.semCoordenada ?? 0)}
          </p>
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Layers className="size-4 text-gold" />
          Camadas
        </span>
        {TODAS.map((chave) => {
          const ativo = visiveis[chave];
          return (
            <button
              key={chave}
              type="button"
              onClick={() => setVisiveis((atual) => ({ ...atual, [chave]: !atual[chave] }))}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                ativo ? "border-border bg-surface-2 text-foreground" : "border-border/60 text-muted-foreground/60"
              }`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: ativo ? CATEGORIAS[chave].cor : "transparent", border: `1.5px solid ${CATEGORIAS[chave].cor}` }}
              />
              {CATEGORIAS[chave].rotulo} ({numero(contagem[chave])})
            </button>
          );
        })}
        <span className="ml-auto text-[10px] text-muted-foreground/70">Base: {provedor.nome}</span>
      </section>

      {dados.isLoading ? (
        <Carregando texto="Carregando dados do mapa…" />
      ) : (
        <MapaOperacional pontos={pontos} zonas={zonas} visiveis={visiveis} altura="520px" />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="display flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldAlert className="size-4 text-danger" />
            Ocorrências georreferenciadas
          </h2>
          {ocorrencias.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência com coordenadas no período.
            </p>
          ) : (
            <ul className="mt-3 flex max-h-[320px] flex-col divide-y divide-border overflow-y-auto">
              {ocorrencias.slice(0, 60).map((oco: any) => (
                <li key={oco.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {oco.numero} · {oco.tipo}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {dataHora(oco.dataHora)} · {oco.bairro ?? "sem bairro"} · {Number(oco.latitude).toFixed(5)},{" "}
                      {Number(oco.longitude).toFixed(5)}
                    </p>
                  </div>
                  <BadgeStatus valor={oco.prioridade} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="display flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="size-4 text-success" />
            Viaturas com posição registrada
          </h2>
          {viaturas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma viatura com coordenadas. A posição pode ser enviada pelo aplicativo do tablet.
            </p>
          ) : (
            <ul className="mt-3 flex max-h-[320px] flex-col divide-y divide-border overflow-y-auto">
              {(viaturas as any[]).map((viatura) => (
                <li key={viatura.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{viatura.prefixo ?? viatura.placa}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {Number(viatura.latitude).toFixed(5)}, {Number(viatura.longitude).toFixed(5)} · atualizada em{" "}
                      {dataHora(viatura.atualizadoEm)}
                    </p>
                  </div>
                  <BadgeStatus valor={viatura.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {modulo && (
        <section className="flex flex-col gap-3">
          <h2 className="display text-sm font-semibold text-foreground">Zonas, distritos e setores</h2>
          <DataModule modulo={modulo} usuario={usuario} compacto />
        </section>
      )}
    </div>
  );
}
