import * as React from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import { AppShell } from "./components/app-shell";
import { MODULOS } from "./lib/modules";
import { obterToken, type UsuarioSessao } from "./lib/session";
import { useUsuarioAtual } from "./queries/auth";
import LoginPage from "./pages/login";
import ModuloPage from "./pages/modulo";
import DashboardPage from "./pages/dashboard";
import MapaPage from "./pages/mapa";
import EstatisticasPage from "./pages/estatisticas";
import RelatoriosPage from "./pages/relatorios";
import IndicadoresPage from "./pages/indicadores";
import ViaturasPage from "./pages/viaturas";
import UsuariosPage from "./pages/usuarios";
import ConfiguracoesPage from "./pages/configuracoes";
import AuditoriaPage from "./pages/auditoria";
import BackupPage from "./pages/backup";

/** Páginas próprias — as demais chaves caem no CRUD genérico. */
const PROPRIAS: Record<string, (usuario: UsuarioSessao) => React.ReactNode> = {
  dashboard: () => <DashboardPage />,
  mapa: (usuario) => <MapaPage usuario={usuario} />,
  estatisticas: () => <EstatisticasPage />,
  relatorios: (usuario) => <RelatoriosPage usuario={usuario} />,
  indicadores: (usuario) => <IndicadoresPage usuario={usuario} />,
  viaturas: (usuario) => <ViaturasPage usuario={usuario} />,
  usuarios: (usuario) => <UsuariosPage usuario={usuario} />,
  configuracoes: (usuario) => <ConfiguracoesPage usuario={usuario} />,
  auditoria: () => <AuditoriaPage />,
  backup: (usuario) => <BackupPage usuario={usuario} />,
};

function TelaCarregando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img src="/images/brasao.png" alt="" className="size-16 animate-pulse object-contain" />
      <p className="display text-sm tracking-[0.3em] text-muted-foreground">SIG-GCMI</p>
      <span className="size-5 animate-spin rounded-full border-2 border-primary-light border-t-transparent" />
    </div>
  );
}

function Central() {
  const consulta = useUsuarioAtual();
  const [rota] = useLocation();
  const temToken = !!obterToken();

  if (temToken && consulta.isPending) return <TelaCarregando />;

  const usuario = consulta.data as UsuarioSessao | undefined;
  if (!usuario) return <LoginPage />;

  if (rota === "/central" || rota === "/central/") return <Redirect to="/central/dashboard" />;

  return (
    <AppShell usuario={usuario}>
      <Switch>
        {MODULOS.map((modulo) => (
          <Route key={modulo.chave} path={modulo.rota}>
            {PROPRIAS[modulo.chave] ? (
              PROPRIAS[modulo.chave](usuario)
            ) : (
              <ModuloPage chave={modulo.chave} usuario={usuario} />
            )}
          </Route>
        ))}
        <Route>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="display text-lg font-semibold text-foreground">Página não encontrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use o menu lateral para acessar um dos módulos do sistema.
            </p>
          </div>
        </Route>
      </Switch>
    </AppShell>
  );
}

function Entrada() {
  const consulta = useUsuarioAtual();
  const temToken = !!obterToken();

  if (temToken && consulta.isPending) return <TelaCarregando />;
  if (consulta.data) return <Redirect to="/central/dashboard" />;
  return <LoginPage />;
}

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Entrada} />
        <Route path="/central/:resto*" component={Central} />
        <Route path="/central" component={Central} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
