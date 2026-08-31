import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import * as schema from "../database/schema";
import { autenticado, exigirPermissao } from "../middleware/auth";

function inicioDoDia(data = new Date()) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasAtras(dias: number) {
  return inicioDoDia(new Date(Date.now() - dias * 86_400_000));
}

async function contar(tabela: unknown, condicao?: ReturnType<typeof eq>) {
  const consulta = db
    .select({ valor: count() })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(tabela as any)
    .$dynamic();
  if (condicao) consulta.where(condicao);
  const [{ valor }] = await consulta;
  return Number(valor ?? 0);
}

/* -------------------------------------------------------------------- DASHBOARD */

export const dashboard = {
  /** KPIs, séries e listas do painel inicial — tudo começa zerado e se preenche com os registros. */
  resumo: autenticado.handler(async ({ context }) => {
    exigirPermissao(context.usuario, "dashboard", "leitura");
    const hoje = inicioDoDia();

    const [
      atendimentosHoje,
      atendimentosAbertos,
      atendimentosTotal,
      ocorrenciasHoje,
      ocorrenciasAbertas,
      ocorrenciasTotal,
      atividadesEmExecucao,
      rondasHoje,
      efetivoAtivo,
      efetivoTotal,
      viaturasOperacionais,
      viaturasTotal,
      eventosProximos,
      apoiosPendentes,
    ] = await Promise.all([
      contar(schema.atendimentos, gte(schema.atendimentos.dataHora, hoje)),
      contar(schema.atendimentos, eq(schema.atendimentos.situacao, "Aberta")),
      contar(schema.atendimentos),
      contar(schema.ocorrencias, gte(schema.ocorrencias.dataHora, hoje)),
      contar(schema.ocorrencias, eq(schema.ocorrencias.status, "Aberta")),
      contar(schema.ocorrencias),
      contar(schema.atividades, eq(schema.atividades.status, "Em execução")),
      contar(schema.rondas, gte(schema.rondas.data, hoje)),
      contar(schema.agentes, eq(schema.agentes.status, "Ativo")),
      contar(schema.agentes),
      contar(schema.viaturas, eq(schema.viaturas.status, "Operacional")),
      contar(schema.viaturas),
      contar(schema.eventos, gte(schema.eventos.inicio, hoje)),
      contar(schema.apoios, eq(schema.apoios.status, "Solicitado")),
    ]);

    const serieOcorrencias = await db
      .select({
        dia: sql<string>`strftime('%Y-%m-%d', ${schema.ocorrencias.dataHora} / 1000, 'unixepoch')`,
        total: count(),
      })
      .from(schema.ocorrencias)
      .where(gte(schema.ocorrencias.dataHora, diasAtras(13)))
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const serieAtendimentos = await db
      .select({
        dia: sql<string>`strftime('%Y-%m-%d', ${schema.atendimentos.dataHora} / 1000, 'unixepoch')`,
        total: count(),
      })
      .from(schema.atendimentos)
      .where(gte(schema.atendimentos.dataHora, diasAtras(13)))
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const porTipoOcorrencia = await db
      .select({ rotulo: schema.ocorrencias.tipo, total: count() })
      .from(schema.ocorrencias)
      .groupBy(schema.ocorrencias.tipo)
      .orderBy(desc(count()))
      .limit(8);

    const porStatusOcorrencia = await db
      .select({ rotulo: schema.ocorrencias.status, total: count() })
      .from(schema.ocorrencias)
      .groupBy(schema.ocorrencias.status);

    const ultimasOcorrencias = await db
      .select({
        id: schema.ocorrencias.id,
        numero: schema.ocorrencias.numero,
        dataHora: schema.ocorrencias.dataHora,
        tipo: schema.ocorrencias.tipo,
        prioridade: schema.ocorrencias.prioridade,
        status: schema.ocorrencias.status,
        bairro: schema.ocorrencias.bairro,
      })
      .from(schema.ocorrencias)
      .orderBy(desc(schema.ocorrencias.dataHora))
      .limit(6);

    const ultimosAtendimentos = await db
      .select({
        id: schema.atendimentos.id,
        protocolo: schema.atendimentos.protocolo,
        dataHora: schema.atendimentos.dataHora,
        tipo: schema.atendimentos.tipo,
        situacao: schema.atendimentos.situacao,
        solicitanteNome: schema.atendimentos.solicitanteNome,
      })
      .from(schema.atendimentos)
      .orderBy(desc(schema.atendimentos.dataHora))
      .limit(6);

    const agenda = await db
      .select({
        id: schema.eventos.id,
        titulo: schema.eventos.titulo,
        categoria: schema.eventos.categoria,
        inicio: schema.eventos.inicio,
        local: schema.eventos.local,
      })
      .from(schema.eventos)
      .where(gte(schema.eventos.inicio, hoje))
      .orderBy(schema.eventos.inicio)
      .limit(5);

    return {
      kpis: {
        atendimentosHoje,
        atendimentosAbertos,
        atendimentosTotal,
        ocorrenciasHoje,
        ocorrenciasAbertas,
        ocorrenciasTotal,
        atividadesEmExecucao,
        rondasHoje,
        efetivoAtivo,
        efetivoTotal,
        viaturasOperacionais,
        viaturasTotal,
        eventosProximos,
        apoiosPendentes,
      },
      serieOcorrencias,
      serieAtendimentos,
      porTipoOcorrencia,
      porStatusOcorrencia,
      ultimasOcorrencias,
      ultimosAtendimentos,
      agenda,
    };
  }),
};

/* ----------------------------------------------------------------- ESTATÍSTICAS */

export const estatisticas = {
  geral: autenticado
    .input(z.object({ de: z.coerce.date().optional(), ate: z.coerce.date().optional() }).optional())
    .handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, "estatisticas", "leitura");
      const de = input?.de ?? diasAtras(29);
      const ate = input?.ate ?? new Date();
      const periodo = and(gte(schema.ocorrencias.dataHora, de), lte(schema.ocorrencias.dataHora, ate));

      const ocorrenciasPorDia = await db
        .select({
          dia: sql<string>`strftime('%Y-%m-%d', ${schema.ocorrencias.dataHora} / 1000, 'unixepoch')`,
          total: count(),
        })
        .from(schema.ocorrencias)
        .where(periodo)
        .groupBy(sql`1`)
        .orderBy(sql`1`);

      const ocorrenciasPorTipo = await db
        .select({ rotulo: schema.ocorrencias.tipo, total: count() })
        .from(schema.ocorrencias)
        .where(periodo)
        .groupBy(schema.ocorrencias.tipo)
        .orderBy(desc(count()));

      const ocorrenciasPorBairro = await db
        .select({ rotulo: schema.ocorrencias.bairro, total: count() })
        .from(schema.ocorrencias)
        .where(periodo)
        .groupBy(schema.ocorrencias.bairro)
        .orderBy(desc(count()))
        .limit(10);

      const ocorrenciasPorPrioridade = await db
        .select({ rotulo: schema.ocorrencias.prioridade, total: count() })
        .from(schema.ocorrencias)
        .where(periodo)
        .groupBy(schema.ocorrencias.prioridade);

      const atendimentosPorTipo = await db
        .select({ rotulo: schema.atendimentos.tipo, total: count() })
        .from(schema.atendimentos)
        .where(and(gte(schema.atendimentos.dataHora, de), lte(schema.atendimentos.dataHora, ate)))
        .groupBy(schema.atendimentos.tipo)
        .orderBy(desc(count()));

      const atendimentosPorSituacao = await db
        .select({ rotulo: schema.atendimentos.situacao, total: count() })
        .from(schema.atendimentos)
        .where(and(gte(schema.atendimentos.dataHora, de), lte(schema.atendimentos.dataHora, ate)))
        .groupBy(schema.atendimentos.situacao);

      const atividadesPorStatus = await db
        .select({ rotulo: schema.atividades.status, total: count() })
        .from(schema.atividades)
        .groupBy(schema.atividades.status);

      const rondasPorTurno = await db
        .select({ rotulo: schema.rondas.turno, total: count() })
        .from(schema.rondas)
        .where(and(gte(schema.rondas.data, de), lte(schema.rondas.data, ate)))
        .groupBy(schema.rondas.turno);

      const efetivoPorStatus = await db
        .select({ rotulo: schema.agentes.status, total: count() })
        .from(schema.agentes)
        .groupBy(schema.agentes.status);

      const viaturasPorStatus = await db
        .select({ rotulo: schema.viaturas.status, total: count() })
        .from(schema.viaturas)
        .groupBy(schema.viaturas.status);

      const [encerradas] = await db
        .select({ valor: count() })
        .from(schema.ocorrencias)
        .where(and(periodo, eq(schema.ocorrencias.status, "Encerrada")));
      const [totalOcorrencias] = await db.select({ valor: count() }).from(schema.ocorrencias).where(periodo);

      const total = Number(totalOcorrencias?.valor ?? 0);
      const taxaResolucao = total > 0 ? Math.round((Number(encerradas?.valor ?? 0) / total) * 100) : 0;

      return {
        periodo: { de, ate },
        ocorrenciasPorDia,
        ocorrenciasPorTipo,
        ocorrenciasPorBairro,
        ocorrenciasPorPrioridade,
        atendimentosPorTipo,
        atendimentosPorSituacao,
        atividadesPorStatus,
        rondasPorTurno,
        efetivoPorStatus,
        viaturasPorStatus,
        totais: { ocorrencias: total, encerradas: Number(encerradas?.valor ?? 0), taxaResolucao },
      };
    }),
};

/* ------------------------------------------------------------ MAPA OPERACIONAL */

export const mapa = {
  dados: autenticado
    .input(z.object({ dias: z.number().min(1).max(365).optional() }).optional())
    .handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, "mapa", "leitura");
      const desde = diasAtras(input?.dias ?? 30);

      const ocorrencias = await db
        .select({
          id: schema.ocorrencias.id,
          numero: schema.ocorrencias.numero,
          tipo: schema.ocorrencias.tipo,
          status: schema.ocorrencias.status,
          prioridade: schema.ocorrencias.prioridade,
          endereco: schema.ocorrencias.endereco,
          bairro: schema.ocorrencias.bairro,
          latitude: schema.ocorrencias.latitude,
          longitude: schema.ocorrencias.longitude,
          dataHora: schema.ocorrencias.dataHora,
        })
        .from(schema.ocorrencias)
        .where(gte(schema.ocorrencias.dataHora, desde))
        .orderBy(desc(schema.ocorrencias.dataHora))
        .limit(500);

      const viaturas = await db
        .select({
          id: schema.viaturas.id,
          prefixo: schema.viaturas.prefixo,
          placa: schema.viaturas.placa,
          status: schema.viaturas.status,
          latitude: schema.viaturas.latitude,
          longitude: schema.viaturas.longitude,
          atualizadoEm: schema.viaturas.atualizadoEm,
        })
        .from(schema.viaturas);

      const zonas = await db.select().from(schema.zonas);

      return {
        ocorrencias: ocorrencias.filter((o) => o.latitude != null && o.longitude != null),
        viaturas: viaturas.filter((v) => v.latitude != null && v.longitude != null),
        zonas,
        semCoordenada: ocorrencias.filter((o) => o.latitude == null || o.longitude == null).length,
      };
    }),

  /** Atualiza a posição de uma viatura — endpoint usado também pelo APK do tablet. */
  atualizarPosicaoViatura: autenticado
    .input(z.object({ viaturaId: z.number(), latitude: z.number(), longitude: z.number() }))
    .handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, "mapa", "escrita");
      const [viatura] = await db
        .update(schema.viaturas)
        .set({ latitude: input.latitude, longitude: input.longitude, atualizadoEm: new Date() })
        .where(eq(schema.viaturas.id, input.viaturaId))
        .returning({ id: schema.viaturas.id, prefixo: schema.viaturas.prefixo });
      return viatura ?? null;
    }),
};

/** Agregado do painel (dashboard, estatísticas e mapa) — composto no router. */
export const painel = { dashboard, estatisticas, mapa };
