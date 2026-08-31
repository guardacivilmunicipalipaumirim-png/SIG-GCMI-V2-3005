import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Gera o hash de uma senha no formato `scrypt$<salt>$<hash>`. */
export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivada = scryptSync(senha, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivada}`;
}

/** Confere uma senha contra o hash armazenado. */
export function conferirSenha(senha: string, hashArmazenado: string): boolean {
  const partes = hashArmazenado.split("$");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  const [, salt, esperado] = partes;
  const derivada = scryptSync(senha, salt, 64).toString("hex");
  const a = Buffer.from(derivada, "hex");
  const b = Buffer.from(esperado, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Token de sessão opaco para web e para o aplicativo (APK). */
export function gerarToken(): string {
  return randomBytes(32).toString("hex");
}
