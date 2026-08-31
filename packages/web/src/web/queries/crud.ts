import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Hooks genéricos de CRUD: os 20 módulos compartilham a mesma assinatura na API
 * (`list`/`get`/`create`/`update`/`remove`), então o nome do procedimento entra
 * como parâmetro. Este é o único ponto do frontend com acesso dinâmico ao client.
 */

export interface FiltroLista {
  busca?: string;
  filtros?: Record<string, string>;
  de?: string;
  ate?: string;
  ordem?: "asc" | "desc";
  ordenarPor?: string;
  limite?: number;
  pagina?: number;
}

export interface Pagina {
  itens: Record<string, any>[];
  total: number;
  pagina: number;
  limite: number;
}

function proc(rpc: string) {
  const alvo = (client as any)[rpc];
  if (!alvo) throw new Error(`Procedimento "${rpc}" não existe na API.`);
  return alvo;
}

export function chaveLista(rpc: string, filtro?: FiltroLista) {
  return ["modulo", rpc, "list", filtro ?? {}] as const;
}

export function chaveModulo(rpc: string) {
  return ["modulo", rpc] as const;
}

export function useLista(rpc: string, filtro: FiltroLista, habilitado = true) {
  return useQuery<Pagina>({
    queryKey: chaveLista(rpc, filtro),
    queryFn: async () => {
      const limpo: Record<string, unknown> = { ...filtro };
      if (filtro.filtros) {
        const filtros = Object.fromEntries(Object.entries(filtro.filtros).filter(([, v]) => v));
        if (Object.keys(filtros).length) limpo.filtros = filtros;
        else delete limpo.filtros;
      }
      for (const chave of ["busca", "de", "ate"]) {
        if (!limpo[chave]) delete limpo[chave];
      }
      return (await proc(rpc).list(limpo)) as Pagina;
    },
    enabled: habilitado,
    placeholderData: (anterior) => anterior,
  });
}

export function useCriar(rpc: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: Record<string, unknown>) => proc(rpc).create(dados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaveModulo(rpc) }),
  });
}

export function useAtualizar(rpc: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entrada: { id: number; dados: Record<string, unknown> }) => proc(rpc).update(entrada),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaveModulo(rpc) }),
  });
}

export function useExcluir(rpc: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => proc(rpc).remove({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaveModulo(rpc) }),
  });
}

/** Listas usadas nos selects de relação (agentes, viaturas, órgãos). */
export function useOpcoesRelacao(relacao: "efetivo" | "viaturas" | "orgaos", habilitado = true) {
  return useQuery<{ id: number; rotulo: string }[]>({
    queryKey: ["relacao", relacao],
    queryFn: async () => {
      try {
        const pagina = (await proc(relacao).list({ limite: 500, ordem: "asc", ordenarPor: "nome" })) as Pagina;
        return pagina.itens.map((item) => ({
          id: Number(item.id),
          rotulo:
            relacao === "viaturas"
              ? [item.prefixo, item.placa, item.modelo].filter(Boolean).join(" · ")
              : String(item.nomeGuerra || item.nome || `#${item.id}`),
        }));
      } catch {
        // Sem permissão na fonte: o select fica vazio em vez de derrubar a tela.
        return [];
      }
    },
    enabled: habilitado,
    staleTime: 120_000,
  });
}
