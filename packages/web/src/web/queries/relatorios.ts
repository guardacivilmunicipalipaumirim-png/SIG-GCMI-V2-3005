import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useFontesRelatorio() {
  return useQuery(orpc.relatorios.fontes.queryOptions({ staleTime: 300_000 }));
}

export function useGerarRelatorio() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.relatorios.gerar.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.historicoRelatorios.key() });
        queryClient.invalidateQueries({ queryKey: ["modulo", "relatorios"] });
      },
    }),
  );
}

export function useHistoricoRelatorios() {
  return useQuery(orpc.historicoRelatorios.queryOptions({ staleTime: 30_000 }));
}

export function useIndicadoresAutomaticos() {
  return useQuery(orpc.indicadores.automaticos.queryOptions({ staleTime: 60_000 }));
}
