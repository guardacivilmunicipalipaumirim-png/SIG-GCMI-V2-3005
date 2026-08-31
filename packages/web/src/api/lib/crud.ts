import { ORPCError } from "@orpc/server";
import { and, asc, count, desc, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { exigirPermissao } from "../middleware/auth";
import { autenticado } from "../middleware/auth";
import type { Modulo } from "./modulos";
import { registrarAuditoria } from "./auditoria";

/* eslint-disable @typescript-eslint/no-explicit-any */

const filtroLista = z.object({
  busca: z.string().optional(),
  filtros: z.record(z.string(), z.string()).optional(),
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
  ordem: z.enum(["asc", "desc"]).optional(),
  ordenarPor: z.string().optional(),
  limite: z.number().int().min(1).max(500).optional(),
  pagina: z.number().int().min(1).optional(),
});

export type FiltroLista = z.infer<typeof filtroLista>;

export interface OpcoesCrud {
  /** Módulo para checagem de permissão e auditoria. */
  modulo: Modulo;
  /** Tabela Drizzle. */
  tabela: any;
  /** Esquema Zod dos campos aceitos na criação. */
  entrada: z.ZodObject<any>;
  /** Campos usados na busca textual. */
  camposBusca?: string[];
  /** Coluna padrão de ordenação. */
  ordenarPor?: string;
  /** Coluna de data usada nos filtros de período. */
  campoPeriodo?: string;
  /** Rótulo legível do registro para a auditoria. */
  rotulo?: (registro: any) => string;
  /** Hook executado antes de inserir (ex.: gerar protocolo). */
  antesDeCriar?: (valores: any) => Promise<any> | any;
}

export function condicoesLista(opcoes: OpcoesCrud, input: FiltroLista): SQL | undefined {
  const colunas = getTableColumns(opcoes.tabela) as Record<string, any>;
  const condicoes: SQL[] = [];

  if (input.busca && opcoes.camposBusca?.length) {
    const termo = `%${input.busca.toLowerCase()}%`;
    const alvos = opcoes.camposBusca
      .filter((campo) => colunas[campo])
      .map((campo) => like(colunas[campo], termo) as SQL);
    if (alvos.length) condicoes.push(or(...alvos) as SQL);
  }

  for (const [campo, valor] of Object.entries(input.filtros ?? {})) {
    if (!valor || !colunas[campo]) continue;
    const coluna = colunas[campo];
    const numerico = coluna.dataType === "number" || coluna.columnType?.includes("Integer");
    if (numerico && !Number.isNaN(Number(valor))) condicoes.push(eq(coluna, Number(valor)) as SQL);
    else condicoes.push(eq(coluna, valor) as SQL);
  }

  const campoPeriodo = opcoes.campoPeriodo ?? "criadoEm";
  if (colunas[campoPeriodo]) {
    if (input.de) condicoes.push(gte(colunas[campoPeriodo], input.de) as SQL);
    if (input.ate) condicoes.push(lte(colunas[campoPeriodo], input.ate) as SQL);
  }

  return condicoes.length ? (and(...condicoes) as SQL) : undefined;
}

/**
 * Fábrica de CRUD: gera list/get/create/update/remove para um módulo,
 * já com permissão por módulo, paginação, filtros e auditoria.
 */
export function criarCrud(opcoes: OpcoesCrud) {
  const colunas = () => getTableColumns(opcoes.tabela) as Record<string, any>;
  const rotulo = (registro: any) =>
    opcoes.rotulo?.(registro) ??
    registro?.nome ??
    registro?.titulo ??
    registro?.numero ??
    registro?.protocolo ??
    `#${registro?.id}`;

  return {
    list: autenticado.input(filtroLista.optional()).handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, opcoes.modulo, "leitura");
      const filtro = input ?? {};
      const cols = colunas();
      const where = condicoesLista(opcoes, filtro);
      const colunaOrdem = cols[filtro.ordenarPor ?? opcoes.ordenarPor ?? "id"] ?? cols.id;
      const direcao = (filtro.ordem ?? "desc") === "asc" ? asc : desc;
      const limite = filtro.limite ?? 100;
      const pagina = filtro.pagina ?? 1;

      const consulta = db.select().from(opcoes.tabela).$dynamic();
      if (where) consulta.where(where);
      const itens = await consulta
        .orderBy(direcao(colunaOrdem))
        .limit(limite)
        .offset((pagina - 1) * limite);

      const consultaTotal = db.select({ valor: count() }).from(opcoes.tabela).$dynamic();
      if (where) consultaTotal.where(where);
      const totais = (await consultaTotal) as unknown as Array<{ valor: number }>;
      const total = totais[0]?.valor ?? 0;

      return { itens: itens as any[], total: Number(total ?? 0), pagina, limite };
    }),

    get: autenticado.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, opcoes.modulo, "leitura");
      const [registro] = await db.select().from(opcoes.tabela).where(eq(colunas().id, input.id));
      if (!registro) throw new ORPCError("NOT_FOUND", { message: "Registro não encontrado." });
      return registro as any;
    }),

    create: autenticado.input(opcoes.entrada).handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, opcoes.modulo, "escrita");
      let valores: any = { ...(input as any) };
      if (opcoes.antesDeCriar) valores = await opcoes.antesDeCriar(valores);
      const inseridos = (await db
        .insert(opcoes.tabela)
        .values(valores)
        .returning()) as unknown as any[];
      const registro = inseridos[0];
      await registrarAuditoria({
        usuario: context.usuario,
        ip: context.ip,
        acao: "criar",
        modulo: opcoes.modulo,
        registroId: (registro as any).id,
        descricao: `Criou ${rotulo(registro)}`,
        dadosNovos: registro,
      });
      return registro as any;
    }),

    update: autenticado
      .input(z.object({ id: z.number(), dados: opcoes.entrada.partial() }))
      .handler(async ({ context, input }) => {
        exigirPermissao(context.usuario, opcoes.modulo, "escrita");
        const cols = colunas();
        const [anterior] = await db.select().from(opcoes.tabela).where(eq(cols.id, input.id));
        if (!anterior) throw new ORPCError("NOT_FOUND", { message: "Registro não encontrado." });
        const valores: any = { ...(input.dados as any) };
        if (cols.atualizadoEm) valores.atualizadoEm = new Date();
        const atualizados = (await db
          .update(opcoes.tabela)
          .set(valores)
          .where(eq(cols.id, input.id))
          .returning()) as unknown as any[];
        const registro = atualizados[0];
        await registrarAuditoria({
          usuario: context.usuario,
          ip: context.ip,
          acao: "editar",
          modulo: opcoes.modulo,
          registroId: input.id,
          descricao: `Editou ${rotulo(registro)}`,
          dadosAnteriores: anterior,
          dadosNovos: registro,
        });
        return registro as any;
      }),

    remove: autenticado.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
      exigirPermissao(context.usuario, opcoes.modulo, "escrita");
      const cols = colunas();
      const [anterior] = await db.select().from(opcoes.tabela).where(eq(cols.id, input.id));
      if (!anterior) throw new ORPCError("NOT_FOUND", { message: "Registro não encontrado." });
      await db.delete(opcoes.tabela).where(eq(cols.id, input.id));
      await registrarAuditoria({
        usuario: context.usuario,
        ip: context.ip,
        acao: "excluir",
        modulo: opcoes.modulo,
        registroId: input.id,
        descricao: `Excluiu ${rotulo(anterior)}`,
        dadosAnteriores: anterior,
      });
      return { id: input.id };
    }),
  };
}

/** Gera sequencial no formato PREFIXO-AAAA-000123 a partir da contagem da tabela. */
export async function proximoNumero(tabela: any, prefixo: string): Promise<string> {
  const [{ valor }] = await db.select({ valor: count() }).from(tabela);
  const ano = new Date().getFullYear();
  const sequencial = String(Number(valor ?? 0) + 1).padStart(6, "0");
  return `${prefixo}-${ano}-${sequencial}`;
}
