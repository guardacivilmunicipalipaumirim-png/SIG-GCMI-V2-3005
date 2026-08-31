import { db } from "../database";
import * as schema from "../database/schema";
import type { UsuarioSessao } from "../middleware/auth";

export interface EntradaAuditoria {
  usuario?: UsuarioSessao | null;
  ip?: string | null;
  acao: string;
  modulo: string;
  registroId?: number | null;
  descricao?: string | null;
  dadosAnteriores?: unknown;
  dadosNovos?: unknown;
}

function serializar(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  try {
    return JSON.stringify(valor);
  } catch {
    return null;
  }
}

/** Grava a trilha de auditoria (nunca interrompe a operação principal). */
export async function registrarAuditoria(entrada: EntradaAuditoria): Promise<void> {
  try {
    await db.insert(schema.auditoria).values({
      usuarioId: entrada.usuario?.id ?? null,
      usuarioNome: entrada.usuario?.nome ?? null,
      acao: entrada.acao,
      modulo: entrada.modulo,
      registroId: entrada.registroId ?? null,
      descricao: entrada.descricao ?? null,
      dadosAnteriores: serializar(entrada.dadosAnteriores),
      dadosNovos: serializar(entrada.dadosNovos),
      ip: entrada.ip ?? null,
    });
  } catch (erro) {
    console.error("Falha ao registrar auditoria:", erro);
  }
}
