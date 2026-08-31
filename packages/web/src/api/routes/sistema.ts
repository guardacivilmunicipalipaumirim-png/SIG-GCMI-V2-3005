import { ORPCError } from "@orpc/server";
import { and, desc, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import { count } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import * as schema from "../database/schema";
import { registrarAuditoria } from "../lib/auditoria";
import { MODULOS, PERFIS, permissoesPadrao, type Perfil } from "../lib/modulos";
import { hashSenha } from "../lib/senha";
import { autenticado, somenteAdmin } from "../middleware/auth";

const txt = z.string().nullish();
const nivel = z.enum(["nenhum", "leitura", "escrita"]);

const semSenha = {
  id: schema.usuarios.id,
  nome: schema.usuarios.nome,
  login: schema.usuarios.login,
  email: schema.usuarios.email,
  perfil: schema.usuarios.perfil,
  permissoes: schema.usuarios.permissoes,
  agenteId: schema.usuarios.agenteId,
  status: schema.usuarios.status,
  telefone: schema.usuarios.telefone,
  ultimoAcesso: schema.usuarios.ultimoAcesso,
  criadoEm: schema.usuarios.criadoEm,
  atualizadoEm: schema.usuarios.atualizadoEm,
};

/* --------------------------------------------------------------------- USUÁRIOS */

export const usuarios = {
  list: somenteAdmin
    .input(z.object({ busca: z.string().optional(), limite: z.number().optional(), pagina: z.number().optional() }).optional())
    .handler(async ({ input }) => {
      const filtro = input ?? {};
      const limite = filtro.limite ?? 100;
      const pagina = filtro.pagina ?? 1;
      const where = filtro.busca
        ? or(
            like(schema.usuarios.nome, `%${filtro.busca}%`),
            like(schema.usuarios.login, `%${filtro.busca}%`),
          )
        : undefined;
      const consulta = db.select(semSenha).from(schema.usuarios).$dynamic();
      if (where) consulta.where(where);
      const itens = await consulta.orderBy(desc(schema.usuarios.id)).limit(limite).offset((pagina - 1) * limite);
      const [{ valor }] = await db.select({ valor: count() }).from(schema.usuarios);
      return { itens, total: Number(valor ?? 0), pagina, limite };
    }),

  get: somenteAdmin.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [usuario] = await db.select(semSenha).from(schema.usuarios).where(eq(schema.usuarios.id, input.id));
    if (!usuario) throw new ORPCError("NOT_FOUND", { message: "Usuário não encontrado." });
    return usuario;
  }),

  create: somenteAdmin
    .input(
      z.object({
        nome: z.string().min(1),
        login: z.string().min(3),
        senha: z.string().min(6),
        email: txt,
        telefone: txt,
        perfil: z.enum(PERFIS),
        status: z.string().default("Ativo"),
        agenteId: z.number().nullish(),
        permissoes: z.record(z.string(), nivel).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const [existente] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.login, input.login));
      if (existente) throw new ORPCError("CONFLICT", { message: "Já existe um usuário com este login." });
      const [usuario] = await db
        .insert(schema.usuarios)
        .values({
          nome: input.nome,
          login: input.login,
          senhaHash: hashSenha(input.senha),
          email: input.email ?? null,
          telefone: input.telefone ?? null,
          perfil: input.perfil,
          status: input.status,
          agenteId: input.agenteId ?? null,
          permissoes: input.permissoes ?? permissoesPadrao(input.perfil as Perfil),
        })
        .returning(semSenha);
      await registrarAuditoria({
        usuario: context.usuario,
        ip: context.ip,
        acao: "criar",
        modulo: "usuarios",
        registroId: usuario.id,
        descricao: `Criou o usuário ${usuario.login} (${usuario.perfil})`,
        dadosNovos: usuario,
      });
      return usuario;
    }),

  update: somenteAdmin
    .input(
      z.object({
        id: z.number(),
        dados: z.object({
          nome: z.string().optional(),
          login: z.string().optional(),
          email: txt,
          telefone: txt,
          perfil: z.enum(PERFIS).optional(),
          status: z.string().optional(),
          agenteId: z.number().nullish(),
          permissoes: z.record(z.string(), nivel).optional(),
          senha: z.string().min(6).optional(),
        }),
      }),
    )
    .handler(async ({ context, input }) => {
      const [anterior] = await db.select(semSenha).from(schema.usuarios).where(eq(schema.usuarios.id, input.id));
      if (!anterior) throw new ORPCError("NOT_FOUND", { message: "Usuário não encontrado." });
      const { senha, ...resto } = input.dados;
      const valores: Record<string, unknown> = { ...resto, atualizadoEm: new Date() };
      if (senha) valores.senhaHash = hashSenha(senha);
      const [usuario] = await db
        .update(schema.usuarios)
        .set(valores)
        .where(eq(schema.usuarios.id, input.id))
        .returning(semSenha);
      await registrarAuditoria({
        usuario: context.usuario,
        ip: context.ip,
        acao: "editar",
        modulo: "usuarios",
        registroId: input.id,
        descricao: `Editou o usuário ${usuario.login}${senha ? " (senha redefinida)" : ""}`,
        dadosAnteriores: anterior,
        dadosNovos: usuario,
      });
      return usuario;
    }),

  remove: somenteAdmin.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const [anterior] = await db.select(semSenha).from(schema.usuarios).where(eq(schema.usuarios.id, input.id));
    if (!anterior) throw new ORPCError("NOT_FOUND", { message: "Usuário não encontrado." });
    if (anterior.login === "Omega") {
      throw new ORPCError("FORBIDDEN", { message: "O administrador principal não pode ser excluído." });
    }
    if (anterior.id === context.usuario.id) {
      throw new ORPCError("FORBIDDEN", { message: "Você não pode excluir o próprio usuário." });
    }
    await db.delete(schema.usuarios).where(eq(schema.usuarios.id, input.id));
    await registrarAuditoria({
      usuario: context.usuario,
      ip: context.ip,
      acao: "excluir",
      modulo: "usuarios",
      registroId: input.id,
      descricao: `Excluiu o usuário ${anterior.login}`,
      dadosAnteriores: anterior,
    });
    return { id: input.id };
  }),

  /** Sessões ativas e módulos disponíveis para montar a matriz de permissões. */
  meta: somenteAdmin.handler(async () => ({
    modulos: [...MODULOS],
    perfis: [...PERFIS],
    padroes: Object.fromEntries(PERFIS.map((p) => [p, permissoesPadrao(p)])),
  })),
};

/* --------------------------------------------------------------- CONFIGURAÇÕES */

export const configuracoes = {
  list: autenticado.handler(async () => db.select().from(schema.configuracoes).orderBy(schema.configuracoes.grupo)),

  salvar: somenteAdmin
    .input(z.object({ itens: z.array(z.object({ chave: z.string(), valor: z.string() })) }))
    .handler(async ({ context, input }) => {
      for (const item of input.itens) {
        const [existente] = await db
          .select()
          .from(schema.configuracoes)
          .where(eq(schema.configuracoes.chave, item.chave));
        if (existente) {
          await db
            .update(schema.configuracoes)
            .set({ valor: item.valor, atualizadoEm: new Date() })
            .where(eq(schema.configuracoes.chave, item.chave));
        } else {
          await db.insert(schema.configuracoes).values({ chave: item.chave, valor: item.valor });
        }
      }
      await registrarAuditoria({
        usuario: context.usuario,
        ip: context.ip,
        acao: "editar",
        modulo: "configuracoes",
        descricao: `Atualizou ${input.itens.length} configuração(ões)`,
        dadosNovos: input.itens,
      });
      return { ok: true };
    }),
};

/* ------------------------------------------------------------------- AUDITORIA */

export const auditoria = {
  list: somenteAdmin
    .input(
      z
        .object({
          busca: z.string().optional(),
          modulo: z.string().optional(),
          acao: z.string().optional(),
          de: z.coerce.date().optional(),
          ate: z.coerce.date().optional(),
          limite: z.number().optional(),
          pagina: z.number().optional(),
        })
        .optional(),
    )
    .handler(async ({ input }) => {
      const filtro = input ?? {};
      const limite = filtro.limite ?? 100;
      const pagina = filtro.pagina ?? 1;
      const condicoes: SQL[] = [];
      if (filtro.modulo) condicoes.push(eq(schema.auditoria.modulo, filtro.modulo) as SQL);
      if (filtro.acao) condicoes.push(eq(schema.auditoria.acao, filtro.acao) as SQL);
      if (filtro.de) condicoes.push(gte(schema.auditoria.criadoEm, filtro.de) as SQL);
      if (filtro.ate) condicoes.push(lte(schema.auditoria.criadoEm, filtro.ate) as SQL);
      if (filtro.busca) {
        condicoes.push(
          or(
            like(schema.auditoria.descricao, `%${filtro.busca}%`),
            like(schema.auditoria.usuarioNome, `%${filtro.busca}%`),
          ) as SQL,
        );
      }
      const where = condicoes.length ? (and(...condicoes) as SQL) : undefined;
      const consulta = db.select().from(schema.auditoria).$dynamic();
      if (where) consulta.where(where);
      const itens = await consulta.orderBy(desc(schema.auditoria.criadoEm)).limit(limite).offset((pagina - 1) * limite);
      const consultaTotal = db.select({ valor: count() }).from(schema.auditoria).$dynamic();
      if (where) consultaTotal.where(where);
      const [{ valor }] = await consultaTotal;
      return { itens, total: Number(valor ?? 0), pagina, limite };
    }),
};

/* ---------------------------------------------------------------------- BACKUP */

const TABELAS_BACKUP = {
  usuarios: schema.usuarios,
  atendimentos: schema.atendimentos,
  ocorrencias: schema.ocorrencias,
  atividades: schema.atividades,
  apoios: schema.apoios,
  eventos: schema.eventos,
  operacoes: schema.operacoes,
  rondas: schema.rondas,
  zonas: schema.zonas,
  agentes: schema.agentes,
  escalas: schema.escalas,
  viaturas: schema.viaturas,
  manutencoes: schema.manutencoes,
  orgaos: schema.orgaos,
  relatorios: schema.relatorios,
  indicadores: schema.indicadores,
  configuracoes: schema.configuracoes,
} as const;

export const backup = {
  list: somenteAdmin.handler(async () =>
    db
      .select({
        id: schema.backups.id,
        nome: schema.backups.nome,
        tipo: schema.backups.tipo,
        escopo: schema.backups.escopo,
        status: schema.backups.status,
        local: schema.backups.local,
        tamanhoKb: schema.backups.tamanhoKb,
        registros: schema.backups.registros,
        observacoes: schema.backups.observacoes,
        criadoPor: schema.backups.criadoPor,
        criadoEm: schema.backups.criadoEm,
      })
      .from(schema.backups)
      .orderBy(desc(schema.backups.criadoEm)),
  ),

  /** Executa um backup lógico (dump JSON de todas as tabelas). */
  executar: somenteAdmin
    .input(z.object({ tipo: z.string().default("Manual"), observacoes: z.string().nullish() }).optional())
    .handler(async ({ context, input }) => {
      const dump: Record<string, unknown[]> = {};
      let registros = 0;
      for (const [nome, tabela] of Object.entries(TABELAS_BACKUP)) {
        const linhas = await db.select().from(tabela);
        dump[nome] = linhas;
        registros += linhas.length;
      }
      const conteudo = JSON.stringify({ geradoEm: new Date().toISOString(), dados: dump });
      const [registro] = await db
        .insert(schema.backups)
        .values({
          nome: `backup-sig-gcmi-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`,
          tipo: input?.tipo ?? "Manual",
          escopo: "Completo",
          status: "Concluído",
          local: "Servidor local",
          tamanhoKb: Math.max(1, Math.round(conteudo.length / 1024)),
          registros,
          conteudo,
          observacoes: input?.observacoes ?? null,
          criadoPor: context.usuario.nome,
        })
        .returning({ id: schema.backups.id, nome: schema.backups.nome, registros: schema.backups.registros });
      await registrarAuditoria({
        usuario: context.usuario,
        ip: context.ip,
        acao: "backup",
        modulo: "backup",
        registroId: registro.id,
        descricao: `Gerou backup completo (${registros} registros)`,
      });
      return registro;
    }),

  baixar: somenteAdmin.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [registro] = await db.select().from(schema.backups).where(eq(schema.backups.id, input.id));
    if (!registro) throw new ORPCError("NOT_FOUND", { message: "Backup não encontrado." });
    return { nome: registro.nome, conteudo: registro.conteudo ?? "{}" };
  }),

  remove: somenteAdmin.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db.delete(schema.backups).where(eq(schema.backups.id, input.id));
    await registrarAuditoria({
      usuario: context.usuario,
      ip: context.ip,
      acao: "excluir",
      modulo: "backup",
      registroId: input.id,
      descricao: "Excluiu um backup",
    });
    return { id: input.id };
  }),
};

/** Agregado do módulo de sistema — composto no router. */
export const sistema = { usuarios, configuracoes, auditoria, backup };
