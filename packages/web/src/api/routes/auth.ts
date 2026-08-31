import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { registrarAuditoria } from "../lib/auditoria";
import { permissoesPadrao, type Perfil } from "../lib/modulos";
import { garantirSeed } from "../lib/seed";
import { conferirSenha, gerarToken, hashSenha } from "../lib/senha";
import { autenticado, publico } from "../middleware/auth";

const HORAS_SESSAO = 12;

function ipDe(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? null;
}

/**
 * Autenticação do SIG-GCMI: login/senha próprios (usuários criados dentro do
 * sistema) com sessão por token Bearer — o mesmo fluxo servirá o APK do tablet.
 */
export const auth = {
  /** Autentica e devolve o token de sessão. */
  login: base
    .input(z.object({ login: z.string().min(1), senha: z.string().min(1), origem: z.enum(["web", "apk"]).optional() }))
    .handler(async ({ input, context }) => {
      await garantirSeed();
      const ip = ipDe(context.headers);
      const [usuario] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.login, input.login));

      if (!usuario || !conferirSenha(input.senha, usuario.senhaHash)) {
        await registrarAuditoria({
          acao: "login_falho",
          modulo: "usuarios",
          descricao: `Tentativa de login falhou para "${input.login}"`,
          ip,
        });
        throw new ORPCError("UNAUTHORIZED", { message: "Login ou senha inválidos." });
      }
      if (usuario.status !== "Ativo") {
        throw new ORPCError("FORBIDDEN", { message: `Usuário ${usuario.status.toLowerCase()}. Procure o administrador.` });
      }

      const token = gerarToken();
      const expiraEm = new Date(Date.now() + HORAS_SESSAO * 3600_000);
      await db.insert(schema.sessoes).values({
        token,
        usuarioId: usuario.id,
        ip,
        userAgent: context.headers.get("user-agent"),
        origem: input.origem ?? "web",
        expiraEm,
      });
      await db.update(schema.usuarios).set({ ultimoAcesso: new Date() }).where(eq(schema.usuarios.id, usuario.id));
      await registrarAuditoria({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          login: usuario.login,
          perfil: usuario.perfil,
          permissoes: usuario.permissoes ?? {},
          agenteId: usuario.agenteId ?? null,
        },
        acao: "login",
        modulo: "usuarios",
        registroId: usuario.id,
        descricao: `Acesso ao sistema via ${input.origem ?? "web"}`,
        ip,
      });

      return {
        token,
        expiraEm,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          login: usuario.login,
          perfil: usuario.perfil,
          permissoes: usuario.permissoes ?? permissoesPadrao(usuario.perfil as Perfil),
          agenteId: usuario.agenteId ?? null,
        },
      };
    }),

  /** Retorna o usuário da sessão atual (ou null). */
  eu: publico.handler(async ({ context }) => {
    await garantirSeed();
    if (!context.usuario) return null;
    return context.usuario;
  }),

  logout: autenticado.handler(async ({ context }) => {
    await db.delete(schema.sessoes).where(eq(schema.sessoes.token, context.token));
    await registrarAuditoria({
      usuario: context.usuario,
      acao: "logout",
      modulo: "usuarios",
      registroId: context.usuario.id,
      descricao: "Saiu do sistema",
      ip: context.ip,
    });
    return { ok: true };
  }),

  /** Troca da própria senha. */
  trocarSenha: autenticado
    .input(z.object({ senhaAtual: z.string().min(1), novaSenha: z.string().min(6) }))
    .handler(async ({ context, input }) => {
      const [usuario] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, context.usuario.id));
      if (!usuario || !conferirSenha(input.senhaAtual, usuario.senhaHash)) {
        throw new ORPCError("BAD_REQUEST", { message: "Senha atual incorreta." });
      }
      await db
        .update(schema.usuarios)
        .set({ senhaHash: hashSenha(input.novaSenha), atualizadoEm: new Date() })
        .where(eq(schema.usuarios.id, usuario.id));
      await registrarAuditoria({
        usuario: context.usuario,
        acao: "editar",
        modulo: "usuarios",
        registroId: usuario.id,
        descricao: "Alterou a própria senha",
        ip: context.ip,
      });
      return { ok: true };
    }),
};
