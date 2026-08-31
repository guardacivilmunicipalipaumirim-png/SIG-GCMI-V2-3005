import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  Car,
  HandHelping,
  PhoneCall,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Aviso, Carregando } from "@/components/ui/campos";
import { BadgeStatus } from "@/components/ui/badge-status";
import { dataHora, diaMes, numero } from "@/lib/formatos";
import { useResumoDashboard } from "@/queries/painel";

const CORES = ["#2e56c8", "#e8b430", "#28a46a", "#d8443c", "#7c5cd6", "#2aa3b8", "#e0a02a", "#8a97bf"];

function Kpi({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  tom = "primary",
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
  icone: LucideIcon;
  tom?: "primary" | "gold" | "success" | "danger";
}) {
  const tons: Record<string, string> = {
    primary: "text-primary-light",
    gold: "text-gold",
    success: "text-success",
    danger: "text-danger",
  };
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
      <div className="min-w-0">
        <p className="rotulo truncate">{rotulo}</p>
        <p className="display mt-1 text-2xl font-bold tabular-nums text-foreground">{numero(valor)}</p>
        {detalhe && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detalhe}</p>}
      </div>
      <Icone className={`size-5 shrink-0 ${tons[tom]}`} />
    </div>
  );
}

function Painel({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>
      <h2 className="display text-sm font-semibold text-foreground">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const eixo = { stroke: "#8a97bf", fontSize: 11 };
const tooltipEstilo = {
  contentStyle: {
    background: "#0b1020",
    border: "1px solid #1c2647",
    borderRadius: 8,
    fontSize: 12,
    color: "#eef2ff",
  },
  labelStyle: { color: "#8a97bf" },
};

export default function DashboardPage() {
  const resumo = useResumoDashboard();

  if (resumo.isLoading) return <Carregando texto="Carregando painel operacional…" />;
  if (resumo.isError || !resumo.data) {
    return <Aviso texto={String((resumo.error as { message?: string })?.message ?? "Falha ao carregar o painel.")} />;
  }

  const d = resumo.data;
  const k = d.kpis;

  const dias = new Map<string, { dia: string; ocorrencias: number; atendimentos: number }>();
  for (let i = 13; i >= 0; i--) {
    const data = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    dias.set(data, { dia: diaMes(data), ocorrencias: 0, atendimentos: 0 });
  }
  for (const linha of d.serieOcorrencias) {
    const alvo = dias.get(String(linha.dia));
    if (alvo) alvo.ocorrencias = Number(linha.total);
  }
  for (const linha of d.serieAtendimentos) {
    const alvo = dias.get(String(linha.dia));
    if (alvo) alvo.atendimentos = Number(linha.total);
  }
  const serie = [...dias.values()];

  const porTipo = d.porTipoOcorrencia.map((i) => ({ rotulo: String(i.rotulo ?? "Não informado"), total: Number(i.total) }));
  const porStatus = d.porStatusOcorrencia.map((i) => ({
    rotulo: String(i.rotulo ?? "Não informado"),
    total: Number(i.total),
  }));
  const semDados = serie.every((s) => s.ocorrencias === 0 && s.atendimentos === 0);

  return (
    <div className="entrada flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          rotulo="Ocorrências hoje"
          valor={k.ocorrenciasHoje}
          detalhe={`${numero(k.ocorrenciasAbertas)} abertas · ${numero(k.ocorrenciasTotal)} no total`}
          icone={ShieldAlert}
          tom="danger"
        />
        <Kpi
          rotulo="Atendimentos 153 hoje"
          valor={k.atendimentosHoje}
          detalhe={`${numero(k.atendimentosAbertos)} em aberto · ${numero(k.atendimentosTotal)} no total`}
          icone={PhoneCall}
        />
        <Kpi
          rotulo="Efetivo ativo"
          valor={k.efetivoAtivo}
          detalhe={`de ${numero(k.efetivoTotal)} agentes cadastrados`}
          icone={Users}
          tom="success"
        />
        <Kpi
          rotulo="Viaturas operacionais"
          valor={k.viaturasOperacionais}
          detalhe={`de ${numero(k.viaturasTotal)} na frota`}
          icone={Car}
          tom="gold"
        />
        <Kpi rotulo="Atividades em execução" valor={k.atividadesEmExecucao} icone={Activity} />
        <Kpi rotulo="Rondas hoje" valor={k.rondasHoje} icone={Radio} tom="gold" />
        <Kpi rotulo="Eventos futuros" valor={k.eventosProximos} icone={CalendarDays} tom="success" />
        <Kpi rotulo="Apoios aguardando" valor={k.apoiosPendentes} icone={HandHelping} tom="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Painel titulo="Ocorrências e atendimentos — últimos 14 dias" className="xl:col-span-2">
          {semDados ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Sem registros nos últimos 14 dias. Os gráficos se preenchem conforme a operação for lançada.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={serie} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-oco" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2e56c8" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#2e56c8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="grad-atd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8b430" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#e8b430" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1c2647" vertical={false} />
                <XAxis dataKey="dia" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis tick={eixo} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipEstilo} />
                <Area
                  type="monotone"
                  name="Ocorrências"
                  dataKey="ocorrencias"
                  stroke="#2e56c8"
                  fill="url(#grad-oco)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="Atendimentos"
                  dataKey="atendimentos"
                  stroke="#e8b430"
                  fill="url(#grad-atd)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Painel>

        <Painel titulo="Ocorrências por status">
          {porStatus.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porStatus} dataKey="total" nameKey="rotulo" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {porStatus.map((item, indice) => (
                    <Cell key={item.rotulo} fill={CORES[indice % CORES.length]} stroke="#0b1020" />
                  ))}
                </Pie>
                <Tooltip {...tooltipEstilo} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {porStatus.map((item, indice) => (
              <li key={item.rotulo} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: CORES[indice % CORES.length] }}
                  aria-hidden
                />
                {item.rotulo} · <span className="tabular-nums text-foreground">{numero(item.total)}</span>
              </li>
            ))}
          </ul>
        </Painel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Painel titulo="Tipos de ocorrência mais registrados" className="xl:col-span-2">
          {porTipo.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, porTipo.length * 34)}>
              <BarChart data={porTipo} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#1c2647" horizontal={false} />
                <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="rotulo" tick={eixo} width={150} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipEstilo} />
                <Bar dataKey="total" name="Ocorrências" fill="#2e56c8" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Painel>

        <Painel titulo="Próximos eventos">
          {d.agenda.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">Nenhum evento agendado.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {d.agenda.map((evento) => (
                <li key={evento.id} className="py-2.5">
                  <p className="text-sm font-semibold text-foreground">{evento.titulo}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {dataHora(evento.inicio)} · {evento.categoria}
                    {evento.local ? ` · ${evento.local}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Painel titulo="Últimas ocorrências">
          {d.ultimasOcorrencias.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="rotulo px-2 py-2 text-left">Número</th>
                    <th className="rotulo px-2 py-2 text-left">Data/Hora</th>
                    <th className="rotulo px-2 py-2 text-left">Tipo</th>
                    <th className="rotulo px-2 py-2 text-left">Prioridade</th>
                    <th className="rotulo px-2 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.ultimasOcorrencias.map((oco) => (
                    <tr key={oco.id} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-2 font-medium text-foreground">{oco.numero}</td>
                      <td className="px-2 py-2 tabular-nums text-muted-foreground">{dataHora(oco.dataHora)}</td>
                      <td className="max-w-[18ch] truncate px-2 py-2">{oco.tipo}</td>
                      <td className="px-2 py-2">
                        <BadgeStatus valor={oco.prioridade} />
                      </td>
                      <td className="px-2 py-2">
                        <BadgeStatus valor={oco.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>

        <Painel titulo="Últimos atendimentos 153">
          {d.ultimosAtendimentos.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum atendimento registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="rotulo px-2 py-2 text-left">Protocolo</th>
                    <th className="rotulo px-2 py-2 text-left">Data/Hora</th>
                    <th className="rotulo px-2 py-2 text-left">Tipo</th>
                    <th className="rotulo px-2 py-2 text-left">Solicitante</th>
                    <th className="rotulo px-2 py-2 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {d.ultimosAtendimentos.map((atd) => (
                    <tr key={atd.id} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-2 font-medium text-foreground">{atd.protocolo}</td>
                      <td className="px-2 py-2 tabular-nums text-muted-foreground">{dataHora(atd.dataHora)}</td>
                      <td className="max-w-[16ch] truncate px-2 py-2">{atd.tipo}</td>
                      <td className="max-w-[16ch] truncate px-2 py-2">{atd.solicitanteNome ?? "—"}</td>
                      <td className="px-2 py-2">
                        <BadgeStatus valor={atd.situacao} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>
      </div>
    </div>
  );
}
