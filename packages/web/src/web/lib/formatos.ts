/** Formatadores pt-BR usados nas tabelas, cards e gráficos. */

export function paraData(valor: unknown): Date | null {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(String(valor));
  return Number.isNaN(data.getTime()) ? null : data;
}

export function dataHora(valor: unknown): string {
  const data = paraData(valor);
  return data ? data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export function dataCurta(valor: unknown): string {
  const data = paraData(valor);
  return data ? data.toLocaleDateString("pt-BR") : "—";
}

export function diaMes(dia: string): string {
  const [, mes, d] = dia.split("-");
  return d && mes ? `${d}/${mes}` : dia;
}

export function numero(valor: unknown): string {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR") : "0";
}

export function moeda(valor: unknown): string {
  const n = Number(valor ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Valor para o input datetime-local / date. */
export function paraInput(valor: unknown, tipo: "data" | "datahora"): string {
  const data = paraData(valor);
  if (!data) return "";
  const iso = new Date(data.getTime() - data.getTimezoneOffset() * 60_000).toISOString();
  return tipo === "data" ? iso.slice(0, 10) : iso.slice(0, 16);
}

const CORES_STATUS: Record<string, string> = {
  // positivos
  Concluída: "success",
  Concluído: "success",
  Encerrada: "success",
  Finalizada: "success",
  Cumprida: "success",
  Realizado: "success",
  Operacional: "success",
  Ativo: "success",
  Aprovado: "success",
  Confirmada: "success",
  Confirmado: "success",
  // andamento
  "Em andamento": "warning",
  "Em execução": "warning",
  Planejada: "info",
  Prevista: "info",
  Previsto: "info",
  Solicitado: "info",
  Aberta: "warning",
  Manutenção: "warning",
  Férias: "warning",
  Licença: "warning",
  // negativos
  Cancelada: "danger",
  Cancelado: "danger",
  Falhou: "danger",
  Falta: "danger",
  Negado: "danger",
  Perdida: "danger",
  Interrompida: "danger",
  Indisponível: "danger",
  Desativada: "danger",
  Inativo: "danger",
  Inativa: "danger",
  Afastado: "danger",
  Bloqueado: "danger",
  Crítica: "danger",
  Alta: "danger",
  Média: "warning",
  Baixa: "info",
  Suspeita: "warning",
};

export function tomStatus(valor: unknown): "success" | "warning" | "danger" | "info" | "neutro" {
  const chave = String(valor ?? "").trim();
  const tom = CORES_STATUS[chave];
  if (tom === "success" || tom === "warning" || tom === "danger" || tom === "info") return tom;
  return "neutro";
}
