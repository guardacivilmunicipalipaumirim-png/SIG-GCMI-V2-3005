import type { StyleSpecification } from "maplibre-gl";

/**
 * Camada de abstração do provedor de mapas do SIG-GCMI.
 *
 * Nenhum provedor exige chave de API e todos servem dados de OpenStreetMap.
 * Para trocar o provedor (inclusive por um servidor de tiles próprio da
 * Prefeitura) basta ajustar o `.env` da raiz — nem o componente de mapa nem a
 * lógica da aplicação mudam:
 *
 *   VITE_MAPA_PROVEDOR   = escuro | claro | detalhado | osm-raster
 *   VITE_MAPA_ESTILO_URL = URL de um style.json próprio (tiles vetoriais)
 *   VITE_MAPA_TILES_URL  = template XYZ raster, ex. https://tiles.exemplo.gov.br/{z}/{x}/{y}.png
 *   VITE_MAPA_ATRIBUICAO = texto de atribuição exibido no canto do mapa
 */

/** Centro padrão: sede da Prefeitura de Ipaumirim (CE). */
export const CENTRO_PADRAO = { latitude: -6.7896, longitude: -38.7161, zoom: 14 };

const ATRIBUICAO_OSM =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

export type Provedor = {
  chave: string;
  nome: string;
  /** Vetorial: style.json completo. Raster: montado a partir dos tiles. */
  estilo: string | StyleSpecification;
  /** Aplica filtro CSS para escurecer tiles claros e casar com o tema. */
  escurecer: boolean;
};

/** Monta um style spec raster a partir de um template XYZ. */
function estiloRaster(tiles: string[], atribuicao: string, tamanhoTile = 256, zoomMaximo = 19): StyleSpecification {
  return {
    version: 8,
    sources: {
      base: { type: "raster", tiles, tileSize: tamanhoTile, maxzoom: zoomMaximo, attribution: atribuicao },
    },
    layers: [
      { id: "fundo", type: "background", paint: { "background-color": "#05070f" } },
      { id: "base", type: "raster", source: "base", paint: { "raster-opacity": 1 } },
    ],
  };
}

/**
 * Provedores disponíveis — todos sem chave de API.
 * OpenFreeMap serve tiles vetoriais de OpenStreetMap gratuitamente e sem
 * cadastro; o raster do openstreetmap.org fica como alternativa de contingência.
 */
export const PROVEDORES: Record<string, Provedor> = {
  escuro: {
    chave: "escuro",
    nome: "OpenFreeMap Escuro (OpenStreetMap)",
    estilo: "https://tiles.openfreemap.org/styles/dark",
    escurecer: false,
  },
  claro: {
    chave: "claro",
    nome: "OpenFreeMap Claro (OpenStreetMap)",
    estilo: "https://tiles.openfreemap.org/styles/positron",
    escurecer: false,
  },
  detalhado: {
    chave: "detalhado",
    nome: "OpenFreeMap Liberty (OpenStreetMap)",
    estilo: "https://tiles.openfreemap.org/styles/liberty",
    escurecer: false,
  },
  "osm-raster": {
    chave: "osm-raster",
    nome: "OpenStreetMap padrão (raster)",
    estilo: estiloRaster(
      [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      ATRIBUICAO_OSM,
    ),
    escurecer: true,
  },
};

const env = import.meta.env as Record<string, string | undefined>;

const ESCOLHIDO = env.VITE_MAPA_PROVEDOR?.trim() || "escuro";
const ESTILO_PROPRIO = env.VITE_MAPA_ESTILO_URL?.trim();
const TILES_PROPRIOS = env.VITE_MAPA_TILES_URL?.trim();
const ATRIBUICAO_PROPRIA = env.VITE_MAPA_ATRIBUICAO?.trim();

/** Provedor efetivo: style.json próprio > tiles próprios > provedor nomeado. */
export function provedorAtual(): Provedor {
  if (ESTILO_PROPRIO) {
    return { chave: "estilo-proprio", nome: "Estilo próprio", estilo: ESTILO_PROPRIO, escurecer: false };
  }
  if (TILES_PROPRIOS) {
    return {
      chave: "tiles-proprios",
      nome: "Servidor de tiles próprio",
      estilo: estiloRaster([TILES_PROPRIOS], ATRIBUICAO_PROPRIA || ATRIBUICAO_OSM, 256, 20),
      escurecer: false,
    };
  }
  return PROVEDORES[ESCOLHIDO] ?? PROVEDORES.escuro;
}

/** Estilo a entregar ao MapLibre. */
export function estiloDoMapa(): string | StyleSpecification {
  return provedorAtual().estilo;
}

/** Provedor de contingência, usado se o estilo principal falhar. */
export function provedorContingencia(): Provedor {
  return PROVEDORES["osm-raster"];
}
