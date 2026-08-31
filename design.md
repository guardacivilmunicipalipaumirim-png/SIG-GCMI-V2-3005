# SIG-GCMI — Design

Sistema Integrado de Gestão da Guarda Civil Municipal de Ipaumirim. Central operacional **web** (React + Hono + Drizzle) com API token-based que servirá também o aplicativo Android (tablet) numa fase posterior. Visual institucional, dark mode, azul-marinho quase preto com acentos dourados — mesmo clima da tela de login de referência.

## Brand & Colors

Tokens em `packages/web/src/web/styles.css` (a app roda sempre em `.dark`).

| Token | Valor | Uso |
|-------|-------|-----|
| background | `#05070F` | Fundo da aplicação |
| surface / card | `#0B1020` | Cards, painéis, tabelas |
| surface-2 | `#111832` | Linhas alternadas, inputs, hover |
| border | `#1C2647` | Hairlines, divisórias |
| primary (azul institucional) | `#1B3A93` | Botões primários, cabeçalhos, brasão |
| primary-light | `#2E56C8` | Links, foco, estados ativos |
| gold (acento) | `#E8B430` | Detalhes institucionais, item ativo do menu, KPIs |
| foreground | `#EEF2FF` | Texto principal |
| muted | `#8A97BF` | Texto secundário, labels |
| success | `#28A46A` | Status concluído/operacional |
| warning | `#E0A02A` | Em andamento / atenção |
| danger | `#D8443C` | Excluir, crítico, atrasado |

Acento dourado é usado com parcimônia: item ativo do menu, faixa superior do brasão, números de KPI.

## Typography

- **Display / UI**: `Chakra Petch` (geométrica, quadrada — aproxima o Bank Gothic do login), tracking largo em títulos e no logotipo `SIG-GCMI`.
- **Corpo / tabelas**: `Barlow`.
- Labels de formulário e cabeçalhos de tabela: uppercase, 11–12px, tracking `0.12em`, cor muted.

## Layout

- **Login** (`pages/login.tsx`): tela cheia com foto da praça de Ipaumirim escurecida, brasão centralizado, título `SIG-GCMI`, campos LOGIN/SENHA com labels à direita alinhados, aviso legal em caixa alta no rodapé.
- **Central**: shell fixo — sidebar 264px com 4 seções (Operacional, Administrativo, Relatórios, Sistema, 20 módulos), topbar com brasão, nome do módulo, relógio, usuário e sair. Conteúdo com densidade controlada: filtros no topo, tabela densa, modal para criar/editar.
- Cards de KPI no dashboard: grid 4 colunas, número grande em Chakra Petch, rótulo uppercase muted, borda esquerda colorida por natureza do dado.

## Páginas (web)

Login → `/`. Central protegida em `/central/*`:

Operacional: Dashboard, Atendimentos (153), Ocorrências, Atividades Operacionais, Apoios e Atividades Institucionais, Eventos, Operações, Rondas, Mapa Operacional.
Administrativo: Efetivo, Escalas, Viaturas, Órgãos/Entidades.
Relatórios: Relatórios, Estatísticas, Indicadores.
Sistema: Usuários, Configurações, Auditoria, Backup.

## Fluxos principais

1. Login (admin fixo `Omega` / `Alpha@#gcm` semeado no banco, demais usuários criados em Usuários/Efetivo) → token em `localStorage` → shell da central com menu filtrado por permissão.
2. Registro operacional: novo atendimento/ocorrência → protocolo automático → aparece no dashboard, estatísticas e mapa.
3. Toda escrita grava trilha em Auditoria (usuário, ação, módulo, registro, antes/depois).

## Arquitetura

- API oRPC em `packages/web/src/api/routes/` com fábrica de CRUD (`lib/crud.ts`) por módulo + autenticação por token Bearer (tabela `sessoes`), pronta para o APK consumir a mesma API.
- Permissões por módulo (`nenhum | leitura | escrita`) no registro do usuário; `admin` tem acesso total.
- Frontend: registro único de módulos (`lib/modules.ts`) alimenta menu, rotas, tabelas e formulários genéricos (`components/data-module.tsx`).
- Banco: Drizzle ORM. Migrações versionadas em `packages/web/drizzle/`, credenciais em `.env` — migrável para PostgreSQL trocando o dialeto do Drizzle sem reescrever a aplicação.
