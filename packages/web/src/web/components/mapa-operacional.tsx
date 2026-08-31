import * as React from "react";
import {
  FullscreenControl,
  GeolocateControl,
  Map as MapaGL,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CENTRO_PADRAO, estiloDoMapa, provedorAtual, provedorContingencia } from "@/lib/mapa-provedor";

/* -------------------------------------------------------------- categorias */

export type CategoriaMapa = "viaturas" | "ocorrencias" | "eventos" | "operacoes" | "apoios";

/** Ponto genérico plotado no mapa — a página monta isso a partir da API. */
export type PontoMapa = {
  id: number | string;
  categoria: CategoriaMapa;
  latitude: number;
  longitude: number;
  titulo: string;
  linhas?: string[];
  /** Sobrepõe a cor da categoria (ex.: prioridade da ocorrência). */
  cor?: string;
};

export type ZonaMapa = {
  id: number | string;
  nome: string;
  cor?: string | null;
  latitude: number;
  longitude: number;
  raioMetros?: number | null;
  tipo?: string | null;
};

type DefinicaoCategoria = {
  rotulo: string;
  cor: string;
  /** Path de um ícone 24x24 (traço), desenhado dentro do marcador. */
  icone: string;
};

export const CATEGORIAS: Record<CategoriaMapa, DefinicaoCategoria> = {
  viaturas: {
    rotulo: "Viaturas",
    cor: "#28a46a",
    icone:
      "M5 17h-2v-6l2-5h11l2 5v6h-2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M9 17h6M3 11h18",
  },
  ocorrencias: {
    rotulo: "Ocorrências",
    cor: "#d8443c",
    icone: "M12 3l9 16H3l9-16zM12 9v5M12 17h.01",
  },
  eventos: {
    rotulo: "Eventos",
    cor: "#2e56c8",
    icone: "M7 3v3M17 3v3M4 8h16M5 6h14v14H5zM9 12h2v2H9z",
  },
  operacoes: {
    rotulo: "Operações",
    cor: "#E8B430",
    icone: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zM12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zM12 11.5a.5.5 0 1 0 .5.5.5.5 0 0 0-.5-.5z",
  },
  apoios: {
    rotulo: "Apoios",
    cor: "#8f5ad8",
    icone: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z",
  },
};

/* ------------------------------------------------------------- utilitários */

function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function elementoMarcador(ponto: PontoMapa): HTMLDivElement {
  const definicao = CATEGORIAS[ponto.categoria];
  const cor = ponto.cor || definicao.cor;
  const el = document.createElement("div");
  el.className = "marcador-sig";
  el.style.setProperty("--cor-marcador", cor);
  el.setAttribute("title", ponto.titulo);
  el.innerHTML = `<span class="marcador-sig__pulso"></span>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${definicao.icone}" /></svg>`;
  return el;
}

function conteudoPopup(ponto: PontoMapa) {
  const definicao = CATEGORIAS[ponto.categoria];
  const linhas = (ponto.linhas ?? [])
    .filter(Boolean)
    .map((linha) => `<p class="popup-sig__linha">${escaparHtml(linha)}</p>`)
    .join("");
  return `<div class="popup-sig">
  <p class="popup-sig__tipo" style="color:${ponto.cor || definicao.cor}">${escaparHtml(definicao.rotulo)}</p>
  <p class="popup-sig__titulo">${escaparHtml(ponto.titulo)}</p>
  ${linhas}
  <p class="popup-sig__coord">${ponto.latitude.toFixed(5)}, ${ponto.longitude.toFixed(5)}</p>
</div>`;
}

/** Polígono aproximando um círculo em metros — usado para desenhar as zonas. */
function circuloGeoJson(zona: ZonaMapa) {
  const raio = Number(zona.raioMetros ?? 600);
  const passos = 64;
  const grausPorMetroLat = 1 / 110574;
  const grausPorMetroLng = 1 / (111320 * Math.cos((zona.latitude * Math.PI) / 180) || 1);
  const coordenadas: [number, number][] = [];
  for (let i = 0; i <= passos; i++) {
    const angulo = (i / passos) * 2 * Math.PI;
    coordenadas.push([
      zona.longitude + raio * grausPorMetroLng * Math.cos(angulo),
      zona.latitude + raio * grausPorMetroLat * Math.sin(angulo),
    ]);
  }
  return {
    type: "Feature" as const,
    properties: { nome: zona.nome, cor: zona.cor || "#E8B430", tipo: zona.tipo ?? "Zona" },
    geometry: { type: "Polygon" as const, coordinates: [coordenadas] },
  };
}

/* -------------------------------------------------------------- componente */

type Props = {
  pontos: PontoMapa[];
  zonas?: ZonaMapa[];
  /** Categorias visíveis; quando omitido, todas aparecem. */
  visiveis?: Record<CategoriaMapa, boolean>;
  /** Enquadra automaticamente os pontos na primeira carga. */
  enquadrar?: boolean;
  altura?: string;
};

export function MapaOperacional({ pontos, zonas = [], visiveis, enquadrar = true, altura = "460px" }: Props) {
  const alvo = React.useRef<HTMLDivElement | null>(null);
  const mapa = React.useRef<MapaGL | null>(null);
  const marcadores = React.useRef<Map<string, Marker>>(new Map());
  const jaEnquadrou = React.useRef(false);
  const [pronto, setPronto] = React.useState(false);
  const [falhaTiles, setFalhaTiles] = React.useState(false);

  const provedor = provedorAtual();

  /* cria o mapa uma única vez */
  React.useEffect(() => {
    if (!alvo.current || mapa.current) return;

    const instancia = new MapaGL({
      container: alvo.current,
      style: estiloDoMapa(),
      center: [CENTRO_PADRAO.longitude, CENTRO_PADRAO.latitude],
      zoom: CENTRO_PADRAO.zoom,
      attributionControl: { compact: true },
    });

    instancia.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    instancia.addControl(new FullscreenControl(), "top-right");
    instancia.addControl(new ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
    instancia.addControl(
      new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      "top-right",
    );

    /* garante as camadas de zonas — reexecutável após uma troca de estilo */
    const prepararCamadas = () => {
      if (!instancia.isStyleLoaded()) return;
      if (!instancia.getSource("zonas")) {
        instancia.addSource("zonas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      }
      if (!instancia.getLayer("zonas-preenchimento")) {
        instancia.addLayer({
          id: "zonas-preenchimento",
          type: "fill",
          source: "zonas",
          paint: { "fill-color": ["get", "cor"], "fill-opacity": 0.12 },
        });
      }
      if (!instancia.getLayer("zonas-contorno")) {
        instancia.addLayer({
          id: "zonas-contorno",
          type: "line",
          source: "zonas",
          paint: { "line-color": ["get", "cor"], "line-width": 1.5, "line-opacity": 0.8 },
        });
      }
      setPronto(true);
    };

    instancia.on("load", prepararCamadas);
    instancia.on("styledata", prepararCamadas);
    instancia.on("idle", prepararCamadas);

    let usouContingencia = false;
    instancia.on("error", (evento) => {
      const mensagem = String((evento as { error?: Error }).error?.message ?? "").toLowerCase();
      if (!mensagem.includes("tile") && !mensagem.includes("fetch") && !mensagem.includes("style")) return;
      // troca automática para o provedor de contingência (raster do OpenStreetMap)
      if (!usouContingencia && provedorAtual().chave !== provedorContingencia().chave) {
        usouContingencia = true;
        instancia.setStyle(provedorContingencia().estilo);
        return;
      }
      setFalhaTiles(true);
    });

    mapa.current = instancia;
    const mapaDeMarcadores = marcadores.current;

    return () => {
      for (const marcador of mapaDeMarcadores.values()) marcador.remove();
      mapaDeMarcadores.clear();
      instancia.remove();
      mapa.current = null;
    };
  }, []);

  /* sincroniza os marcadores — reposiciona os existentes em vez de recriar */
  React.useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !pronto) return;

    const vistos = new Set<string>();

    for (const ponto of pontos) {
      if (!Number.isFinite(ponto.latitude) || !Number.isFinite(ponto.longitude)) continue;
      if (visiveis && visiveis[ponto.categoria] === false) continue;

      const chave = `${ponto.categoria}:${ponto.id}`;
      vistos.add(chave);
      const existente = marcadores.current.get(chave);

      if (existente) {
        existente.setLngLat([ponto.longitude, ponto.latitude]);
        existente.getPopup()?.setHTML(conteudoPopup(ponto));
        const el = existente.getElement();
        el.style.setProperty("--cor-marcador", ponto.cor || CATEGORIAS[ponto.categoria].cor);
        el.setAttribute("title", ponto.titulo);
        continue;
      }

      const marcador = new Marker({ element: elementoMarcador(ponto), anchor: "center" })
        .setLngLat([ponto.longitude, ponto.latitude])
        .setPopup(new Popup({ offset: 16, closeButton: true, maxWidth: "260px" }).setHTML(conteudoPopup(ponto)))
        .addTo(instancia);
      marcadores.current.set(chave, marcador);
    }

    for (const [chave, marcador] of marcadores.current.entries()) {
      if (!vistos.has(chave)) {
        marcador.remove();
        marcadores.current.delete(chave);
      }
    }
  }, [pontos, visiveis, pronto]);

  /* zonas */
  React.useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !pronto) return;
    const fonte = instancia.getSource("zonas") as GeoJSONSource | undefined;
    if (!fonte) return;
    fonte.setData({
      type: "FeatureCollection",
      features: zonas
        .filter((z) => Number.isFinite(z.latitude) && Number.isFinite(z.longitude))
        .map((z) => circuloGeoJson(z)),
    });
  }, [zonas, pronto]);

  /* enquadra os pontos na primeira carga com dados */
  React.useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !pronto || !enquadrar || jaEnquadrou.current) return;
    const validos = pontos.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (validos.length === 0) return;

    jaEnquadrou.current = true;
    if (validos.length === 1) {
      instancia.easeTo({ center: [validos[0].longitude, validos[0].latitude], zoom: 15, duration: 600 });
      return;
    }
    const limites = validos.reduce(
      (acc, p) => ({
        oeste: Math.min(acc.oeste, p.longitude),
        leste: Math.max(acc.leste, p.longitude),
        sul: Math.min(acc.sul, p.latitude),
        norte: Math.max(acc.norte, p.latitude),
      }),
      { oeste: 180, leste: -180, sul: 90, norte: -90 },
    );
    const caixa: LngLatBoundsLike = [
      [limites.oeste, limites.sul],
      [limites.leste, limites.norte],
    ];
    instancia.fitBounds(caixa, { padding: 64, maxZoom: 16, duration: 600 });
  }, [pontos, pronto, enquadrar]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div
        ref={alvo}
        className={`w-full ${provedor.escurecer ? "mapa-escurecido" : ""}`}
        style={{ height: altura }}
      />
      {!pronto && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
          <p className="text-sm text-muted-foreground">Carregando mapa…</p>
        </div>
      )}
      {falhaTiles && (
        <p className="absolute left-2 top-2 z-10 rounded-md border border-warning/40 bg-card/95 px-3 py-1.5 text-[11px] text-warning">
          Falha ao baixar parte dos tiles — verifique a conexão do terminal com a internet.
        </p>
      )}
    </div>
  );
}
