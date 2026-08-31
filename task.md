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

## Pendente
- [ ] VITE_GOOGLE_MAPS_API_KEY — mapa funciona com fallback em lista até a chave chegar
