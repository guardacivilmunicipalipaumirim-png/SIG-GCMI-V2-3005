import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useResumoDashboard() {
  return useQuery(orpc.dashboard.resumo.queryOptions({ staleTime: 30_000, refetchInterval: 60_000 }));
}

export function useEstatisticas(periodo: { de?: string; ate?: string }) {
  return useQuery(
    orpc.estatisticas.geral.queryOptions({
      input: { de: periodo.de || undefined, ate: periodo.ate || undefined },
      staleTime: 30_000,
    }),
  );
}

export function useDadosMapa(dias: number) {
  return useQuery(orpc.mapa.dados.queryOptions({ input: { dias }, staleTime: 30_000 }));
}

export function useAtualizarPosicaoViatura() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.mapa.atualizarPosicaoViatura.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.mapa.key() }),
    }),
  );
}
