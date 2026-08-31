/** Chaves dos 20 módulos do sistema — usadas em permissões e na auditoria. */
export const MODULOS = [
  "dashboard",
  "atendimentos",
  "ocorrencias",
  "atividades",
  "apoios",
  "eventos",
  "operacoes",
  "rondas",
  "mapa",
  "efetivo",
  "escalas",
  "viaturas",
  "orgaos",
  "relatorios",
  "estatisticas",
  "indicadores",
  "usuarios",
  "configuracoes",
  "auditoria",
  "backup",
] as const;

export type Modulo = (typeof MODULOS)[number];

export const PERFIS = ["admin", "supervisor", "operador", "consulta"] as const;
export type Perfil = (typeof PERFIS)[number];

/** Módulos restritos ao perfil admin, independentemente das permissões. */
export const MODULOS_ADMIN: Modulo[] = ["usuarios", "configuracoes", "auditoria", "backup"];

/** Permissões padrão por perfil: nenhum | leitura | escrita. */
export function permissoesPadrao(perfil: Perfil): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const modulo of MODULOS) {
    if (perfil === "admin") mapa[modulo] = "escrita";
    else if (perfil === "consulta") mapa[modulo] = "leitura";
    else if (perfil === "supervisor") mapa[modulo] = MODULOS_ADMIN.includes(modulo) ? "leitura" : "escrita";
    else mapa[modulo] = MODULOS_ADMIN.includes(modulo) ? "nenhum" : "escrita";
  }
  return mapa;
}
