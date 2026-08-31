# SIG-GCMI — progresso

## Feito
- Backend completo (20 módulos): schema Drizzle (20 tabelas), auth por token Bearer, fábrica de CRUD, auditoria, seed admin Omega/Alpha@#gcm.
- `src/api/index.ts` compondo todos os routers. `db:push` aplicado.
- Assets em `packages/web/public/images/` (brasao.png, login-bg.png).
- Frontend base: index.html, styles.css, lib/{session,api,formatos,modules}, queries/{auth,crud,painel,relatorios,sistema}, components/{app-shell,data-module,ui/*}.

## Páginas
- [x] login.tsx
- [x] modulo.tsx (CRUD genérico)
- [x] dashboard.tsx
- [x] mapa.tsx
- [x] estatisticas.tsx
- [x] relatorios.tsx
- [x] indicadores.tsx
- [x] viaturas.tsx (abas viaturas/manutenções)
- [x] usuarios.tsx (matriz de permissões)
- [x] configuracoes.tsx (abas por grupo)
- [x] auditoria.tsx
- [x] backup.tsx
- [x] app.tsx com rotas + guarda de sessão

## Validações
- [x] lint (0 erros / 0 warnings) · typecheck (3/3) · build (sucesso)
- [x] dev na porta 4200
- [x] API validada por curl: login, criar ocorrência (OCO-2026-000001), dashboard.resumo, relatorios.gerar (CSV)
- [x] varredura headless das 20 rotas com login real — todas renderizam, console sem erros
- [x] corrigido `podeGerar is not defined` em pages/relatorios.tsx
- [x] deliver (type website, port 4200)

## Mapa operacional — MapLibre + OpenStreetMap (sem Google)
- [x] Google Maps removido por completo — nenhuma chave de API é exigida
- [x] `maplibre-gl` instalado em packages/web
- [x] `src/web/lib/mapa-provedor.ts` — camada de abstração de provedor de tiles
      (escuro/claro/detalhado do OpenFreeMap + osm-raster de contingência;
       trocável por .env: VITE_MAPA_PROVEDOR / VITE_MAPA_ESTILO_URL / VITE_MAPA_TILES_URL / VITE_MAPA_ATRIBUICAO)
- [x] `src/web/components/mapa-operacional.tsx` — 5 categorias de marcador
      (viaturas, ocorrências, eventos, operações, apoios) com ícone e cor próprios,
      reposicionamento dinâmico via setLngLat, popups, zonas em GeoJSON,
      controles de zoom/bússola/tela cheia/escala/geolocalização e troca automática
      para o provedor de contingência em caso de falha de estilo/tiles
- [x] colunas latitude/longitude adicionadas a apoios, eventos e operacoes (db:push aplicado)
      + campos nos formulários (modules.ts) e no schema de entrada da API (operacional.ts)
- [x] `mapa.dados` devolve ocorrências, viaturas, eventos, operações, apoios e zonas
- [x] correção: `optimizeDeps.exclude: ["maplibre-gl"]` no vite.config — o pré-bundle do Vite
      quebrava o web worker do MapLibre (maplibre-gl-worker.mjs) e o mapa nunca terminava de carregar
- [x] validado em navegador headless: 6 marcadores das 5 categorias, popup, toggle de camadas,
      atribuição OpenStreetMap, 0 erros de console, 0 requisições ao Google
- [x] lint 0 erros · typecheck 3/3 · build ok
