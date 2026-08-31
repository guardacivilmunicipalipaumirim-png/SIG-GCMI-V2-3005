import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import * as schema from "../database/schema";
import { registrarAuditoria } from "../lib/auditoria";
import { criarCrud } from "../lib/crud";
import { autenticado, exigirPermissao } from "../middleware/auth";

const txt = z.string().nullish();
const num = z.number().nullish();
const dataOpc = z.coerce.date().nullish();

/* ------------------------------------------------------------------ RELATÓRIOS */

const crudRelatorios = criarCrud({
  modulo: "relatorios",
  tabela: schema.relatorios,
  camposBusca: ["nome", "tipo", "geradoPor"],
  ordenarPor: "criadoEm",
  entrada: z.object({
    nome: z.string().min(1),
    tipo: z.string(),
    periodicidade: z.string(),
    periodoInicio: dataOpc,
    periodoFim: dataOpc,
    formato: z.string(),
    filtros: txt,
    totalRegistros: num,
    geradoPor: txt,
    observacoes: txt,
  }),
});

const FONTES = {
  Ocorrências: {
    tabela: schema.ocorrencias,
    campoData: schema.ocorrencias.dataHora,
    colunas: [
      ["numero", "Número"],
      ["dataHora", "Data/Hora"],
      ["tipo", "Tipo"],
      ["prioridade", "Prioridade"],
      ["status", "Status"],
      ["endereco", "Endereço"],
      ["bairro", "Bairro"],
      ["denunciante", "Denunciante"],
      ["descricao", "Descrição"],
    ],
  },
  Atendimentos: {
    tabela: schema.atendimentos,
    campoData: schema.atendimentos.dataHora,
    colunas: [
      ["protocolo", "Protocolo"],
      ["dataHora", "Data/Hora"],
      ["tipo", "Tipo"],
      ["situacao", "Situação"],
      ["solicitanteNome", "Solicitante"],
      ["solicitanteTelefone", "Telefone"],
      ["endereco", "Endereço"],
      ["descricao", "Descrição"],
    ],
  },
  Atividades: {
    tabela: schema.atividades,
    campoData: schema.atividades.inicioPrevisto,
    colunas: [
      ["titulo", "Título"],
      ["tipo", "Tipo"],
      ["status", "Status"],
      ["prioridade", "Prioridade"],
      ["inicioPrevisto", "Início previsto"],
      ["local", "Local"],
      ["equipe", "Equipe"],
    ],
  },
  Rondas: {
    tabela: schema.rondas,
    campoData: schema.rondas.data,
    colunas: [
      ["data", "Data"],
      ["turno", "Turno"],
      ["localidade", "Localidade"],
      ["horaInicio", "Início"],
      ["horaFim", "Fim"],
      ["status", "Status"],
      ["incidentes", "Incidentes"],
    ],
  },
  Efetivo: {
    tabela: schema.agentes,
    campoData: schema.agentes.criadoEm,
    colunas: [
      ["matricula", "Matrícula"],
      ["nome", "Nome"],
      ["cargo", "Cargo"],
      ["setor", "Setor"],
      ["status", "Status"],
      ["telefone", "Telefone"],
    ],
  },
  Viaturas: {
    tabela: schema.viaturas,
    campoData: schema.viaturas.criadoEm,
    colunas: [
      ["prefixo", "Prefixo"],
      ["placa", "Placa"],
      ["modelo", "Modelo"],
      ["status", "Status"],
      ["quilometragem", "KM"],
      ["ultimaManutencao", "Última manutenção"],
    ],
  },
} as const;

function formatarCelula(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toLocaleString("pt-BR");
  return String(valor).replace(/\r?\n/g, " ");
}

function paraCsv(colunas: readonly (readonly [string, string])[], linhas: Record<string, unknown>[]): string {
  const cabecalho = colunas.map(([, rotulo]) => `"${rotulo}"`).join(";");
  const corpo = linhas.map((linha) =>
    colunas.map(([campo]) => `"${formatarCelula(linha[campo]).replace(/"/g, '""')}"`).join(";"),
  );
  return [cabecalho, ...corpo].join("\n");
}

export const relatorios = {
  ...crudRelatorios,

  fontes: autenticado.handler(async ({ context }) => {
    exigirPermissao(context.usuario, "relatorios", "leitura");
    return Object.entries(FONTES).map(([nome, def]) => ({
      nome,
      colunas: def.colunas.map(([campo, rotulo]) => ({ campo, rotulo })),
    }));
  }),

  /** Gera o relatório, devolve as linhas + CSV e registra o histórico. */
  gerar: autenticado
    .input(
      z.object({
        tipo: z.enum(["Ocorrências", "Atendimentos", "Atividades", "Rondas", "Efetivo", "Viaturas"]),
        de: z.coerce.date().optional(),
        ate: z.coerce.date().optional(),
        periodicidade: z.string().default("Ad-hoc"),
        formato: z.string().default("CSV"),
        salvarHistorico: z.boolean().default(true),
      }),
    )
    .handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, "relatorios", "leitura");
      const fonte = FONTES[input.tipo];
      const condicoes: SQL[] = [];
      if (input.de) condicoes.push(gte(fonte.campoData, input.de) as SQL);
      if (input.ate) condicoes.push(lte(fonte.campoData, input.ate) as SQL);
      const where = condicoes.length ? (and(...condicoes) as SQL) : undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const consulta = db.select().from(fonte.tabela as any).$dynamic();
      if (where) consulta.where(where);
      const linhas = (await consulta.limit(5000)) as Record<string, unknown>[];

      const colunas = fonte.colunas.map(([campo, rotulo]) => ({ campo, rotulo }));
      const csv = paraCsv(fonte.colunas, linhas);

      let registroId: number | null = null;
      if (input.salvarHistorico) {
        const [registro] = await db
          .insert(schema.relatorios)
          .values({
            nome: `${input.tipo} — ${new Date().toLocaleDateString("pt-BR")}`,
            tipo: input.tipo,
            periodicidade: input.periodicidade,
            periodoInicio: input.de ?? null,
            periodoFim: input.ate ?? null,
            formato: input.formato,
            filtros: JSON.stringify({ de: input.de ?? null, ate: input.ate ?? null }),
            totalRegistros: linhas.length,
            geradoPor: context.usuario.nome,
          })
          .returning({ id: schema.relatorios.id });
        registroId = registro?.id ?? null;
        await registrarAuditoria({
          usuario: context.usuario,
          ip: context.ip,
          acao: "gerar_relatorio",
          modulo: "relatorios",
          registroId,
          descricao: `Gerou relatório de ${input.tipo} (${linhas.length} registros)`,
        });
      }

      return {
        registroId,
        tipo: input.tipo,
        colunas,
        linhas: linhas.map((linha) =>
          Object.fromEntries(colunas.map(({ campo }) => [campo, formatarCelula(linha[campo])])),
        ),
        total: linhas.length,
        csv,
      };
    }),
};

/* ------------------------------------------------------------------ INDICADORES */

const crudIndicadores = criarCrud({
  modulo: "indicadores",
  tabela: schema.indicadores,
  camposBusca: ["nome", "categoria", "responsavel", "descricao"],
  ordenarPor: "nome",
  entrada: z.object({
    nome: z.string().min(1),
    categoria: z.string(),
    descricao: txt,
    unidade: z.string(),
    meta: num,
    valorAtual: num,
    sentido: z.string(),
    periodicidade: z.string(),
    responsavel: txt,
    status: z.string(),
  }),
});

export const indicadores = {
  ...crudIndicadores,

  /** Indicadores automáticos calculados a partir dos registros operacionais. */
  automaticos: autenticado.handler(async ({ context }) => {
    exigirPermissao(context.usuario, "indicadores", "leitura");
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [totalMes] = await db
      .select({ valor: count() })
      .from(schema.ocorrencias)
      .where(gte(schema.ocorrencias.dataHora, inicioMes));
    const [encerradasMes] = await db
      .select({ valor: count() })
      .from(schema.ocorrencias)
      .where(and(gte(schema.ocorrencias.dataHora, inicioMes), eq(schema.ocorrencias.status, "Encerrada")));
    const [atendimentosMes] = await db
      .select({ valor: count() })
      .from(schema.atendimentos)
      .where(gte(schema.atendimentos.dataHora, inicioMes));
    const [rondasMes] = await db
      .select({ valor: count() })
      .from(schema.rondas)
      .where(gte(schema.rondas.data, inicioMes));
    const [efetivoAtivo] = await db
      .select({ valor: count() })
      .from(schema.agentes)
      .where(eq(schema.agentes.status, "Ativo"));
    const [viaturasOperacionais] = await db
      .select({ valor: count() })
      .from(schema.viaturas)
      .where(eq(schema.viaturas.status, "Operacional"));

    const total = Number(totalMes?.valor ?? 0);
    const encerradas = Number(encerradasMes?.valor ?? 0);

    return [
      { nome: "Ocorrências no mês", valor: total, unidade: "un" },
      { nome: "Taxa de resolução", valor: total ? Math.round((encerradas / total) * 100) : 0, unidade: "%" },
      { nome: "Atendimentos no mês", valor: Number(atendimentosMes?.valor ?? 0), unidade: "un" },
      { nome: "Rondas no mês", valor: Number(rondasMes?.valor ?? 0), unidade: "un" },
      { nome: "Efetivo ativo", valor: Number(efetivoAtivo?.valor ?? 0), unidade: "agentes" },
      { nome: "Viaturas operacionais", valor: Number(viaturasOperacionais?.valor ?? 0), unidade: "un" },
    ];
  }),
};

/** Últimos relatórios gerados (atalho para o dashboard). */
export const historicoRelatorios = autenticado.handler(async ({ context }) => {
  exigirPermissao(context.usuario, "relatorios", "leitura");
  return db.select().from(schema.relatorios).orderBy(desc(schema.relatorios.criadoEm)).limit(10);
});
