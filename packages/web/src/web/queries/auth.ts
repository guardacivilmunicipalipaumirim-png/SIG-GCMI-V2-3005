import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { limparSessao, salvarSessao, type UsuarioSessao } from "../lib/session";

/** Usuário da sessão atual (null quando não autenticado). */
export function useUsuarioAtual() {
  return useQuery(
    orpc.auth.eu.queryOptions({
      staleTime: 60_000,
      retry: false,
    }),
  );
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.auth.login.mutationOptions({
      onSuccess: (dados) => {
        salvarSessao(dados.token, dados.usuario as UsuarioSessao);
        queryClient.clear();
      },
    }),
  );
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.auth.logout.mutationOptions({
      onSettled: () => {
        limparSessao();
        queryClient.clear();
      },
    }),
  );
}

export function useTrocarSenha() {
  return useMutation(orpc.auth.trocarSenha.mutationOptions());
}
