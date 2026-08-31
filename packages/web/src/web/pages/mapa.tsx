import * as React from "react";
import { MapPin, RefreshCw, ShieldAlert } from "lucide-react";
import { DataModule } from "@/components/data-module";
import { Aviso, Carregando, Selecao } from "@/components/ui/campos";
import { BadgeStatus } from "@/components/ui/badge-status";
import { dataHora, numero } from "@/lib/formatos";
import { moduloPorChave } from "@/lib/modules";
import type { UsuarioSessao } from "@/lib/session";
import { useDadosMapa } from "@/queries/painel";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Centro padrão: sede da Prefeitura de Ipaumirim (CE). */
const CENTRO = { lat: -6.7896, lng: -38.7161 };
const CHAVE_MAPS = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const ESTILO_ESCURO = [
  { elementType: "geometry", stylers: [{ color: "#0b1020" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#05070f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a97bf" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#16204a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#a8b3d6" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#071026" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1c2647" }] },
];

let promessaMaps: Promise<void> | null = null;

function carregarMaps(): Promise<void> {
  if (!CHAVE_MAPS) return Promise.reject(new Error("sem-chave"));
  if ((window as any).google?.maps) return Promise.resolve();
  if (promessaMaps) return promessaMaps;
  promessaMaps = new Promise<void>((resolver, rejeitar) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${CHAVE_MAPS}&language=pt-BR&region=BR`;
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => rejeitar(new Error("falha-carregar"));
    document.head.appendChild(script);
  });
  return promessaMaps;
}

function corPrioridade(prioridade: unknown) {
  const valor = String(prioridade ?? "");
  if (valor === "Crítica") return "#d8443c";
  if (valor === "Alta") return "#e8b430";
  if (valor === "Média") return "#2e56c8";
  return "#8a97bf";
}

function MapaGoogle({ dados }: { dados: any }) {
  const alvo = React.useRef<HTMLDivElement | null>(null);
  const mapa = React.useRef<any>(null);
  const marcadores = React.useRef<any[]>([]);
  const [estado, setEstado] = React.useState<"carregando" | "pronto" | "erro">("carregando");

  React.useEffect(() => {
    let ativo = true;
    carregarMaps()
      .then(() => {
        if (!ativo || !alvo.current) return;
        const g = (window as any).google;
        mapa.current = new g.maps.Map(alvo.current, {
          center: CENTRO,
          zoom: 14,
          styles: ESTILO_ESCURO,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setEstado("pronto");
      })
      .catch(() => ativo && setEstado("erro"));
    return () => {
      ativo = false;
    };
  }, []);

  React.useEffect(() => {
    if (estado !== "pronto" || !mapa.current) return;
    const g = (window as any).google;
    for (const item of marcadores.current) item.setMap(null);
    marcadores.current = [];

    for (const zona of dados?.zonas ?? []) {
      if (zona.latitude == null || zona.longitude == null) continue;
      marcadores.current.push(
        new g.maps.Circle({
          map: mapa.current,
          center: { lat: Number(zona.latitude), lng: Number(zona.longitude) },
          radius: Number(zona.raioMetros ?? 500),
          strokeColor: zona.cor || "#2e56c8",
          strokeOpacity: 0.8,
          strokeWeight: 1.5,
          fillColor: zona.cor || "#2e56c8",
          fillOpacity: 0.12,
        }),
      );
    }

    for (const oco of dados?.ocorrencias ?? []) {
      const marcador = new g.maps.Marker({
        map: mapa.current,
        position: { lat: Number(oco.latitude), lng: Number(oco.longitude) },
        title: `${oco.numero} · ${oco.tipo}`,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: corPrioridade(oco.prioridade),
          fillOpacity: 0.95,
          strokeColor: "#05070f",
          strokeWeight: 1.5,
        },
      });
      const janela = new g.maps.InfoWindow({
        content: `<div style="color:#0b1020;font-size:12px"><strong>${oco.numero ?? ""}</strong><br/>${oco.tipo ?? ""}<br/>${oco.bairro ?? ""}<br/>${dataHora(oco.dataHora)}</div>`,
      });
      marcador.addListener("click", () => janela.open({ map: mapa.current, anchor: marcador }));
      marcadores.current.push(marcador);
    }

    for (const viatura of dados?.viaturas ?? []) {
      marcadores.current.push(
        new g.maps.Marker({
          map: mapa.current,
          position: { lat: Number(viatura.latitude), lng: Number(viatura.longitude) },
          title: `Viatura ${viatura.prefixo ?? viatura.placa}`,
          icon: {
            path: "M -8 -4 L 8 -4 L 8 4 L -8 4 z",
            scale: 1.4,
            fillColor: "#28a46a",
            fillOpacity: 0.95,
            strokeColor: "#05070f",
            strokeWeight: 1.5,
          },
        }),
      );
    }
  }, [estado, dados]);

  if (estado === "erro") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
        <Aviso
          texto={
            CHAVE_MAPS
              ? "Não foi possível carregar o Google Maps. Verifique a chave da API e a habilitação do serviço Maps JavaScript."
              : "Chave do Google Maps não configurada (VITE_GOOGLE_MAPS_API_KEY). A lista georreferenciada abaixo continua funcionando."
          }
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {estado === "carregando" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
          <Carregando texto="Carregando mapa…" />
        </div>
      )}
      <div ref={alvo} className="h-[460px] w-full" />
    </div>
  );
}

export default function MapaPage({ usuario }: { usuario: UsuarioSessao }) {
  const [dias, setDias] = React.useState(30);
  const dados = useDadosMapa(dias);
  const modulo = moduloPorChave("mapa");

  const ocorrencias = dados.data?.ocorrencias ?? [];
  const viaturas = dados.data?.viaturas ?? [];
  const zonas = dados.data?.zonas ?? [];

  return (
    <div className="entrada flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ocorrências e viaturas com coordenadas cadastradas. Informe latitude e longitude nos registros para que
          apareçam no mapa.
        </p>
        <div className="flex items-center gap-2">
          <Selecao value={String(dias)} onChange={(e) => setDias(Number(e.target.value))} className="w-auto">
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Últimos 12 meses</option>
          </Selecao>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { rotulo: "Ocorrências no mapa", valor: ocorrencias.length },
          { rotulo: "Viaturas localizadas", valor: viaturas.length },
          { rotulo: "Zonas cadastradas", valor: zonas.length },
          { rotulo: "Sem coordenada", valor: dados.data?.semCoordenada ?? 0 },
        ].map((item) => (
          <div key={item.rotulo} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="rotulo truncate">{item.rotulo}</p>
            <p className="display mt-1 text-xl font-bold tabular-nums text-foreground">{numero(item.valor)}</p>
          </div>
        ))}
      </div>

      {dados.isLoading ? <Carregando texto="Carregando dados do mapa…" /> : <MapaGoogle dados={dados.data} />}

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
              {viaturas.map((viatura: any) => (
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
