import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Aviso, Campo, Carregando, Entrada, Vazio } from "@/components/ui/campos";
import { diaMes, numero } from "@/lib/formatos";
import { useEstatisticas } from "@/queries/painel";

const CORES = ["#2e56c8", "#e8b430", "#28a46a", "#d8443c", "#7c5cd6", "#2aa3b8", "#e0a02a", "#8a97bf"];

const tooltipEstilo = {
  contentStyle: {
    background: "#0B1020",
    border: "1px solid #1C2647",
    borderRadius: 8,
    fontSize: 12,
    color: "#EEF2FF",
  },
  labelStyle: { color: "#8A97BF" },
} as const;

function paraInputData(data: Date) {
  return data.toISOString().slice(0, 10);
}

function Painel({
  titulo,
  subtitulo,
  children,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>
      <header>
        <h2 className="display text-sm font-semibold text-foreground">{titulo}</h2>
        {subtitulo && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitulo}</p>}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type Serie = { rotulo: string | null; total: number }[];

function BarrasHorizontais({ dados, cor = "#2e56c8" }: { dados: Serie; cor?: string }) {
  const limpos = dados.filter((d) => d.total > 0).map((d) => ({ rotulo: d.rotulo || "Não informado", total: d.total }));
  if (!limpos.length) return <Vazio texto="Sem dados no período." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, limpos.length * 34)}>
      <BarChart data={limpos} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#1C2647" />
        <XAxis type="number" stroke="#8A97BF" fontSize={11} allowDecimals={false} />
        <YAxis type="category" dataKey="rotulo" stroke="#8A97BF" fontSize={11} width={110} />
        <Tooltip {...tooltipEstilo} formatter={(v: number) => [numero(v), "Registros"]} />
        <Bar dataKey="total" fill={cor} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Rosca({ dados }: { dados: Serie }) {
  const limpos = dados.filter((d) => d.total > 0).map((d) => ({ rotulo: d.rotulo || "Não informado", total: d.total }));
  if (!limpos.length) return <Vazio texto="Sem dados no período." />;
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={limpos} dataKey="total" nameKey="rotulo" innerRadius={52} outerRadius={82} paddingAngle={2}>
          {limpos.map((_, i) => (
            <Cell key={i} fill={CORES[i % CORES.length]} stroke="#05070F" />
          ))}
        </Pie>
        <Tooltip {...tooltipEstilo} formatter={(v: number, n: string) => [numero(v), n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Legenda({ dados }: { dados: Serie }) {
  const limpos = dados.filter((d) => d.total > 0);
  if (!limpos.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
      {limpos.map((item, i) => (
        <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-2 rounded-sm" style={{ background: CORES[i % CORES.length] }} />
          {item.rotulo || "Não informado"}
          <span className="tabular-nums text-foreground">{numero(item.total)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function EstatisticasPage() {
  const hoje = React.useMemo(() => new Date(), []);
  const inicioPadrao = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d;
  }, []);

  const [de, setDe] = React.useState(paraInputData(inicioPadrao));
  const [ate, setAte] = React.useState(paraInputData(hoje));

  const consulta = useEstatisticas({
    de: de ? new Date(`${de}T00:00:00`).toISOString() : undefined,
    ate: ate ? new Date(`${ate}T23:59:59`).toISOString() : undefined,
  });

  function aplicarAtalho(dias: number) {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - (dias - 1));
    setDe(paraInputData(inicio));
    setAte(paraInputData(new Date()));
  }

  const dados = consulta.data;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <Campo rotulo="De" className="w-40">
          <Entrada type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </Campo>
        <Campo rotulo="Até" className="w-40">
          <Entrada type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </Campo>
        <div className="flex flex-wrap gap-2">
          {[
            { rotulo: "7 dias", dias: 7 },
            { rotulo: "30 dias", dias: 30 },
            { rotulo: "90 dias", dias: 90 },
            { rotulo: "365 dias", dias: 365 },
          ].map((atalho) => (
            <button
              key={atalho.dias}
              type="button"
              onClick={() => aplicarAtalho(atalho.dias)}
              className="rounded-md border border-border bg-surface-2/70 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary-light hover:text-foreground"
            >
              {atalho.rotulo}
            </button>
          ))}
        </div>
        {consulta.isFetching && <span className="text-[11px] text-muted-foreground">atualizando…</span>}
      </section>

      {consulta.isPending && <Carregando texto="Calculando estatísticas…" />}
      {consulta.isError && <Aviso texto="Não foi possível carregar as estatísticas." />}

      {dados && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3.5">
              <p className="rotulo">Ocorrências no período</p>
              <p className="display mt-1 text-2xl font-bold tabular-nums text-foreground">
                {numero(dados.totais.ocorrencias)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3.5">
              <p className="rotulo">Encerradas</p>
              <p className="display mt-1 text-2xl font-bold tabular-nums text-success">
                {numero(dados.totais.encerradas)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3.5">
              <p className="rotulo">Taxa de resolução</p>
              <p className="display mt-1 text-2xl font-bold tabular-nums text-gold">{dados.totais.taxaResolucao}%</p>
            </div>
          </div>

          <Painel titulo="Ocorrências por dia" subtitulo="Evolução no período selecionado">
            {dados.ocorrenciasPorDia.length === 0 ? (
              <Vazio texto="Sem ocorrências registradas no período." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dados.ocorrenciasPorDia} margin={{ left: -18, right: 8, top: 6, bottom: 0 }}>
                  <CartesianGrid stroke="#1C2647" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    stroke="#8A97BF"
                    fontSize={11}
                    tickFormatter={(v: string) => diaMes(v)}
                    minTickGap={18}
                  />
                  <YAxis stroke="#8A97BF" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    {...tooltipEstilo}
                    labelFormatter={(v: string) => diaMes(v)}
                    formatter={(v: number) => [numero(v), "Ocorrências"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#2e56c8"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#e8b430", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Painel>

          <div className="grid gap-3 lg:grid-cols-2">
            <Painel titulo="Ocorrências por tipo">
              <BarrasHorizontais dados={dados.ocorrenciasPorTipo} />
            </Painel>
            <Painel titulo="Ocorrências por bairro" subtitulo="Top 10 localidades">
              <BarrasHorizontais dados={dados.ocorrenciasPorBairro} cor="#e8b430" />
            </Painel>
            <Painel titulo="Ocorrências por prioridade">
              <Rosca dados={dados.ocorrenciasPorPrioridade} />
              <Legenda dados={dados.ocorrenciasPorPrioridade} />
            </Painel>
            <Painel titulo="Atendimentos por situação">
              <Rosca dados={dados.atendimentosPorSituacao} />
              <Legenda dados={dados.atendimentosPorSituacao} />
            </Painel>
            <Painel titulo="Atendimentos por tipo">
              <BarrasHorizontais dados={dados.atendimentosPorTipo} cor="#2aa3b8" />
            </Painel>
            <Painel titulo="Atividades por status">
              <BarrasHorizontais dados={dados.atividadesPorStatus} cor="#7c5cd6" />
            </Painel>
            <Painel titulo="Rondas por turno">
              <BarrasHorizontais dados={dados.rondasPorTurno} cor="#28a46a" />
            </Painel>
            <Painel titulo="Efetivo por status">
              <Rosca dados={dados.efetivoPorStatus} />
              <Legenda dados={dados.efetivoPorStatus} />
            </Painel>
            <Painel titulo="Frota por status" className="lg:col-span-2">
              <BarrasHorizontais dados={dados.viaturasPorStatus} cor="#d8443c" />
            </Painel>
          </div>
        </>
      )}
    </div>
  );
}
