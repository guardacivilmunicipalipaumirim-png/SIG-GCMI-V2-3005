import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { efetivo, escalas, manutencoes, orgaos, viaturas } from "./routes/administrativo";
import { auth } from "./routes/auth";
import {
  atendimentos,
  atividades,
  apoios,
  eventos,
  ocorrencias,
  operacoes,
  rondas,
  zonas,
} from "./routes/operacional";
import { dashboard, estatisticas, mapa } from "./routes/painel";
import { historicoRelatorios, indicadores, relatorios } from "./routes/relatorios";
import { auditoria, backup, configuracoes, usuarios } from "./routes/sistema";
import { ping } from "./routes/ping";

// API features are oRPC procedures, one file per feature in ./routes/,
// composed into this router — typed end-to-end via the clients
// (web: src/web/lib/api.ts, mobile: lib/api.ts).
export const router = {
  ping,
  auth,
  // Painel
  dashboard,
  estatisticas,
  mapa,
  // Operacional
  atendimentos,
  ocorrencias,
  atividades,
  apoios,
  eventos,
  operacoes,
  rondas,
  zonas,
  // Administrativo
  efetivo,
  escalas,
  viaturas,
  manutencoes,
  orgaos,
  // Relatórios
  relatorios,
  indicadores,
  historicoRelatorios,
  // Sistema
  usuarios,
  configuracoes,
  auditoria,
  backup,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);

export default app;
