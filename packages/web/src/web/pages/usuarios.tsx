/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Pencil, Plus, Search, Trash2, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Aviso, Campo, Carregando, Entrada, Selecao, Vazio } from "@/components/ui/campos";
import { BadgeStatus } from "@/components/ui/badge-status";
import { Modal } from "@/components/ui/modal";
import { dataHora } from "@/lib/formatos";
import { moduloPorChave } from "@/lib/modules";
import type { UsuarioSessao } from "@/lib/session";
import { useOpcoesRelacao } from "@/queries/crud";
import {
  useAtualizarUsuario,
  useCriarUsuario,
  useExcluirUsuario,
  useMetaUsuarios,
  useUsuarios,
} from "@/queries/sistema";

type Nivel = "nenhum" | "leitura" | "escrita";

interface Formulario {
  nome: string;
  login: string;
  senha: string;
  email: string;
  telefone: string;
  perfil: string;
  status: string;
  agenteId: string;
  permissoes: Record<string, Nivel>;
}

const NIVEIS: { valor: Nivel; rotulo: string }[] = [
  { valor: "nenhum", rotulo: "Nenhum" },
  { valor: "leitura", rotulo: "Leitura" },
  { valor: "escrita", rotulo: "Escrita" },
];

const ROTULO_PERFIL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
  consulta: "Consulta",
};

function formularioVazio(padroes?: Record<string, Record<string, string>>): Formulario {
  return {
    nome: "",
    login: "",
    senha: "",
    email: "",
    telefone: "",
    perfil: "operador",
    status: "Ativo",
    agenteId: "",
    permissoes: (padroes?.operador ?? {}) as Record<string, Nivel>,
  };
}

function mensagemErro(erro: unknown): string {
  const bruto = (erro as any)?.message ?? "";
  return String(bruto || "Não foi possível concluir a operação.");
}

export default function UsuariosPage({ usuario }: { usuario: UsuarioSessao }) {
  const [busca, setBusca] = React.useState("");
  const [buscaAplicada, setBuscaAplicada] = React.useState("");
  const [aberto, setAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<Formulario>(() => formularioVazio());
  const [erro, setErro] = React.useState("");
  const [excluindo, setExcluindo] = React.useState<any | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setBuscaAplicada(busca), 350);
    return () => clearTimeout(timer);
  }, [busca]);

  const lista = useUsuarios(buscaAplicada);
  const meta = useMetaUsuarios();
  const agentes = useOpcoesRelacao("efetivo", aberto);
  const criar = useCriarUsuario();
  const atualizar = useAtualizarUsuario();
  const excluir = useExcluirUsuario();

  const modulos = meta.data?.modulos ?? [];
  const perfis = meta.data?.perfis ?? ["admin", "supervisor", "operador", "consulta"];
  const padroes = (meta.data?.padroes ?? {}) as Record<string, Record<string, string>>;

  function abrirNovo() {
    setEditando(null);
    setForm(formularioVazio(padroes));
    setErro("");
    setAberto(true);
  }

  function abrirEdicao(registro: any) {
    setEditando(registro);
    setForm({
      nome: registro.nome ?? "",
      login: registro.login ?? "",
      senha: "",
      email: registro.email ?? "",
      telefone: registro.telefone ?? "",
      perfil: registro.perfil ?? "operador",
      status: registro.status ?? "Ativo",
      agenteId: registro.agenteId != null ? String(registro.agenteId) : "",
      permissoes: (registro.permissoes ?? {}) as Record<string, Nivel>,
    });
    setErro("");
    setAberto(true);
  }

  function trocarPerfil(perfil: string) {
    setForm((atual) => ({
      ...atual,
      perfil,
      permissoes: { ...((padroes[perfil] ?? {}) as Record<string, Nivel>) },
    }));
  }

  function definirNivel(modulo: string, nivel: Nivel) {
    setForm((atual) => ({ ...atual, permissoes: { ...atual.permissoes, [modulo]: nivel } }));
  }

  function aplicarTodos(nivel: Nivel) {
    setForm((atual) => ({
      ...atual,
      permissoes: Object.fromEntries(modulos.map((m) => [m, nivel])) as Record<string, Nivel>,
    }));
  }

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");

    if (!form.nome.trim() || !form.login.trim()) {
      setErro("Informe o nome e o login do usuário.");
      return;
    }
    if (!editando && form.senha.trim().length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (editando && form.senha.trim() && form.senha.trim().length < 6) {
      setErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    const base = {
      nome: form.nome.trim(),
      login: form.login.trim(),
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      perfil: form.perfil as any,
      status: form.status,
      agenteId: form.agenteId ? Number(form.agenteId) : null,
      permissoes: form.permissoes,
    };

    const aoFalhar = (falha: unknown) => setErro(mensagemErro(falha));
    const aoConcluir = () => setAberto(false);

    if (editando) {
      const dados: Record<string, unknown> = { ...base };
      if (form.senha.trim()) dados.senha = form.senha.trim();
      atualizar.mutate({ id: editando.id, dados } as any, { onSuccess: aoConcluir, onError: aoFalhar });
    } else {
      criar.mutate({ ...base, senha: form.senha.trim() } as any, { onSuccess: aoConcluir, onError: aoFalhar });
    }
  }

  const salvando = criar.isPending || atualizar.isPending;
  const itens = lista.data?.itens ?? [];

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Entrada
              placeholder="Buscar por nome ou login…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {lista.isFetching ? "atualizando…" : `${lista.data?.total ?? 0} usuário(s)`}
          </span>
          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            <Plus className="size-4" />
            Novo usuário
          </button>
        </header>

        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <div className="p-4">
            <Aviso texto={mensagemErro(lista.error)} />
          </div>
        ) : !itens.length ? (
          <Vazio texto="Nenhum usuário cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60">
                <tr>
                  {["Nome", "Login", "Perfil", "Status", "E-mail", "Telefone", "Último acesso", ""].map((c, i) => (
                    <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((item: any) => (
                  <tr key={item.id} className="border-t border-border/60 hover:bg-surface-2/40">
                    <td className="px-3 py-2 font-medium text-foreground">{item.nome}</td>
                    <td className="px-3 py-2 text-foreground/90">{item.login}</td>
                    <td className="px-3 py-2 text-foreground/90">{ROTULO_PERFIL[item.perfil] ?? item.perfil}</td>
                    <td className="px-3 py-2">
                      <BadgeStatus valor={item.status} />
                    </td>
                    <td className="px-3 py-2 text-foreground/90">{item.email || "—"}</td>
                    <td className="px-3 py-2 text-foreground/90">{item.telefone || "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {item.ultimoAcesso ? dataHora(item.ultimoAcesso) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(item)}
                          aria-label="Editar"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExcluindo(item)}
                          disabled={item.login === "Omega" || item.id === usuario.id}
                          aria-label="Excluir"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-danger/15 hover:text-danger disabled:opacity-30"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        aberto={aberto}
        titulo={editando ? `Editar usuário — ${editando.login}` : "Novo usuário"}
        descricao="Dados da conta e nível de permissão em cada módulo do sistema."
        onFechar={() => setAberto(false)}
        rodape={
          <>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-usuario"
              disabled={salvando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </>
        }
      >
        <form id="form-usuario" onSubmit={salvar} className="flex flex-col gap-5">
          {erro && <Aviso texto={erro} />}

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome completo" obrigatorio>
              <Entrada value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Campo>
            <Campo rotulo="Login" obrigatorio>
              <Entrada
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                autoComplete="off"
              />
            </Campo>
            <Campo
              rotulo={editando ? "Nova senha" : "Senha"}
              obrigatorio={!editando}
              dica={editando ? "Deixe em branco para manter a senha atual." : "Mínimo de 6 caracteres."}
            >
              <Entrada
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                autoComplete="new-password"
              />
            </Campo>
            <Campo rotulo="Perfil" obrigatorio dica="Trocar o perfil recarrega as permissões padrão.">
              <Selecao value={form.perfil} onChange={(e) => trocarPerfil(e.target.value)}>
                {perfis.map((p) => (
                  <option key={p} value={p}>
                    {ROTULO_PERFIL[p] ?? p}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="E-mail">
              <Entrada type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Campo>
            <Campo rotulo="Telefone">
              <Entrada value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </Campo>
            <Campo rotulo="Status" obrigatorio>
              <Selecao value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {["Ativo", "Inativo", "Bloqueado"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Agente vinculado" dica="Opcional — associa a conta a um agente do efetivo.">
              <Selecao value={form.agenteId} onChange={(e) => setForm({ ...form, agenteId: e.target.value })}>
                <option value="">Não vinculado</option>
                {(agentes.data ?? []).map((opcao) => (
                  <option key={opcao.id} value={String(opcao.id)}>
                    {opcao.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <div>
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCog className="size-4 text-gold" />
                <h3 className="display text-sm font-semibold text-foreground">Permissões por módulo</h3>
              </div>
              <div className="flex gap-1.5">
                {NIVEIS.map((nivel) => (
                  <button
                    key={nivel.valor}
                    type="button"
                    onClick={() => aplicarTodos(nivel.valor)}
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary-light hover:text-foreground"
                  >
                    Tudo: {nivel.rotulo}
                  </button>
                ))}
              </div>
            </header>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {modulos.map((chave) => {
                const definicao = moduloPorChave(chave);
                const atual = (form.permissoes[chave] ?? "nenhum") as Nivel;
                return (
                  <div
                    key={chave}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
                  >
                    <span className="truncate text-xs text-foreground" title={definicao?.titulo ?? chave}>
                      {definicao?.curto ?? chave}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      {NIVEIS.map((nivel) => (
                        <button
                          key={nivel.valor}
                          type="button"
                          onClick={() => definirNivel(chave, nivel.valor)}
                          className={cn(
                            "rounded px-2 py-1 text-[11px] transition-colors",
                            atual === nivel.valor
                              ? nivel.valor === "nenhum"
                                ? "bg-danger/20 text-danger"
                                : nivel.valor === "leitura"
                                  ? "bg-primary/30 text-foreground"
                                  : "bg-success/20 text-success"
                              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                          )}
                        >
                          {nivel.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        aberto={!!excluindo}
        titulo="Excluir usuário"
        largura="pequena"
        onFechar={() => setExcluindo(null)}
        rodape={
          <>
            <button
              type="button"
              onClick={() => setExcluindo(null)}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={excluir.isPending}
              onClick={() =>
                excluindo &&
                excluir.mutate(
                  { id: excluindo.id },
                  { onSuccess: () => setExcluindo(null), onError: (falha) => setErro(mensagemErro(falha)) },
                )
              }
              className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/85 disabled:opacity-60"
            >
              {excluir.isPending ? "Excluindo…" : "Excluir"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Confirma a exclusão do usuário <span className="text-foreground">{excluindo?.nome}</span>? A conta perderá o
          acesso imediatamente.
        </p>
        {excluir.isError && (
          <div className="mt-3">
            <Aviso texto={mensagemErro(excluir.error)} />
          </div>
        )}
      </Modal>
    </div>
  );
}
