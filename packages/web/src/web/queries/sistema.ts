import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

/* ---------------------------------------------------------------------- USUÁRIOS */

export function useUsuarios(busca: string) {
  return useQuery(
    orpc.usuarios.list.queryOptions({ input: { busca: busca || undefined, limite: 200 }, staleTime: 15_000 }),
  );
}

export function useMetaUsuarios() {
  return useQuery(orpc.usuarios.meta.queryOptions({ staleTime: 300_000 }));
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.usuarios.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.usuarios.key() }),
    }),
  );
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.usuarios.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.usuarios.key() }),
    }),
  );
}

export function useExcluirUsuario() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.usuarios.remove.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.usuarios.key() }),
    }),
  );
}

/* ----------------------------------------------------------------- CONFIGURAÇÕES */

export function useConfiguracoes() {
  return useQuery(orpc.configuracoes.list.queryOptions({ staleTime: 60_000 }));
}

export function useSalvarConfiguracoes() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.configuracoes.salvar.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.configuracoes.key() }),
    }),
  );
}

/* --------------------------------------------------------------------- AUDITORIA */

export interface FiltroAuditoria {
  busca?: string;
  modulo?: string;
  acao?: string;
  de?: string;
  ate?: string;
  pagina?: number;
}

export function useAuditoria(filtro: FiltroAuditoria) {
  return useQuery(
    orpc.auditoria.list.queryOptions({
      input: {
        busca: filtro.busca || undefined,
        modulo: filtro.modulo || undefined,
        acao: filtro.acao || undefined,
        de: filtro.de || undefined,
        ate: filtro.ate || undefined,
        pagina: filtro.pagina ?? 1,
        limite: 50,
      },
      staleTime: 10_000,
    }),
  );
}

/* ------------------------------------------------------------------------ BACKUP */

export function useBackups() {
  return useQuery(orpc.backup.list.queryOptions({ staleTime: 15_000 }));
}

export function useExecutarBackup() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.backup.executar.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.backup.key() }),
    }),
  );
}

export function useBaixarBackup() {
  return useMutation(orpc.backup.baixar.mutationOptions());
}

export function useExcluirBackup() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.backup.remove.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.backup.key() }),
    }),
  );
}
