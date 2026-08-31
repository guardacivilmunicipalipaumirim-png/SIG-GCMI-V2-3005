/** Sessão do SIG-GCMI no navegador: token Bearer + usuário em localStorage. */

const CHAVE_TOKEN = "sig-gcmi.token";
const CHAVE_USUARIO = "sig-gcmi.usuario";

export interface UsuarioSessao {
  id: number;
  nome: string;
  login: string;
  perfil: string;
  permissoes: Record<string, string>;
  agenteId: number | null;
}

export function obterToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function obterUsuarioLocal(): UsuarioSessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_USUARIO);
    return bruto ? (JSON.parse(bruto) as UsuarioSessao) : null;
  } catch {
    return null;
  }
}

export function salvarSessao(token: string, usuario: UsuarioSessao) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

export function limparSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}

/** Nível de acesso do usuário a um módulo. */
export function nivelAcesso(usuario: UsuarioSessao | null, modulo: string): "nenhum" | "leitura" | "escrita" {
  if (!usuario) return "nenhum";
  if (usuario.perfil === "admin") return "escrita";
  const modulosAdmin = ["usuarios", "configuracoes", "auditoria", "backup"];
  if (modulosAdmin.includes(modulo)) return "nenhum";
  const nivel = usuario.permissoes?.[modulo];
  return nivel === "escrita" || nivel === "leitura" ? nivel : "nenhum";
}

export function podeVer(usuario: UsuarioSessao | null, modulo: string) {
  return nivelAcesso(usuario, modulo) !== "nenhum";
}

export function podeEscrever(usuario: UsuarioSessao | null, modulo: string) {
  return nivelAcesso(usuario, modulo) === "escrita";
}
