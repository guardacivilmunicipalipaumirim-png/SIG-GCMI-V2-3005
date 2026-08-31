import { ORPCError } from "@orpc/server";
import { and, eq, gt } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { MODULOS_ADMIN, type Modulo } from "../lib/modulos";

export interface UsuarioSessao {
  id: number;
  nome: string;
  login: string;
  perfil: string;
  permissoes: Record<string, string>;
  agenteId: number | null;
}

function ipDe(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? null;
}

async function resolverSessao(headers: Headers) {
  const auth = headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  if (!token) return null;

  const [linha] = await db
    .select({ sessao: schema.sessoes, usuario: schema.usuarios })
    .from(schema.sessoes)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.sessoes.usuarioId))
    .where(and(eq(schema.sessoes.token, token), gt(schema.sessoes.expiraEm, new Date())));

  if (!linha || linha.usuario.status !== "Ativo") return null;

  const usuario: UsuarioSessao = {
    id: linha.usuario.id,
    nome: linha.usuario.nome,
    login: linha.usuario.login,
    perfil: linha.usuario.perfil,
    permissoes: linha.usuario.permissoes ?? {},
    agenteId: linha.usuario.agenteId ?? null,
  };
  return { usuario, token, ip: ipDe(headers) };
}

/** Autenticação opcional — `context.usuario` pode ser nulo. */
export const publico = base.use(async ({ context, next }) => {
  const sessao = await resolverSessao(context.headers);
  return next({
    context: { usuario: sessao?.usuario ?? null, token: sessao?.token ?? null, ip: ipDe(context.headers) },
  });
});

/** Procedimentos protegidos — exige token válido de sessão (web ou APK). */
export const autenticado = base.use(async ({ context, next }) => {
  const sessao = await resolverSessao(context.headers);
  if (!sessao) throw new ORPCError("UNAUTHORIZED", { message: "Sessão expirada ou inválida." });
  return next({ context: { usuario: sessao.usuario, token: sessao.token, ip: sessao.ip } });
});

/** Verifica o nível de acesso do usuário ao módulo. */
export function podeAcessar(
  usuario: UsuarioSessao,
  modulo: Modulo,
  nivelExigido: "leitura" | "escrita",
): boolean {
  if (usuario.perfil === "admin") return true;
  if (MODULOS_ADMIN.includes(modulo) && usuario.perfil !== "admin") return false;
  const nivel = usuario.permissoes?.[modulo] ?? "nenhum";
  if (nivel === "escrita") return true;
  return nivelExigido === "leitura" && nivel === "leitura";
}

export function exigirPermissao(
  usuario: UsuarioSessao,
  modulo: Modulo,
  nivelExigido: "leitura" | "escrita",
) {
  if (!podeAcessar(usuario, modulo, nivelExigido)) {
    throw new ORPCError("FORBIDDEN", { message: `Sem permissão de ${nivelExigido} no módulo ${modulo}.` });
  }
}

/** Restringe a procedimentos exclusivos do administrador. */
export const somenteAdmin = autenticado.use(async ({ context, next }) => {
  if (context.usuario.perfil !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Ação restrita ao administrador." });
  }
  return next();
});
