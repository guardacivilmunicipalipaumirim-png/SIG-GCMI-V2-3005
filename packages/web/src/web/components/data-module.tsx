import * as React from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaTexto, Aviso, Campo, Carregando, Entrada, Selecao, Vazio } from "./ui/campos";
import { BadgeStatus } from "./ui/badge-status";
import { Modal } from "./ui/modal";
import type { CampoDef, ColunaDef, ModuloDef } from "@/lib/modules";
import { dataCurta, dataHora, numero, paraInput } from "@/lib/formatos";
import { podeEscrever, type UsuarioSessao } from "@/lib/session";
import {
  useAtualizar,
  useCriar,
  useExcluir,
  useLista,
  useOpcoesRelacao,
  type FiltroLista,
} from "@/queries/crud";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Registro = Record<string, any>;

const LIMITE = 25;

function mensagemErro(erro: unknown): string {
  const bruto = (erro as any)?.message ?? "";
  if (/UNAUTHORIZED|401/i.test(String(bruto))) return "Sessão expirada. Entre novamente.";
  return String(bruto || "Não foi possível concluir a operação.");
}

/** Valor inicial do formulário a partir dos campos do módulo. */
function valoresIniciais(campos: CampoDef[], registro?: Registro | null): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const campo of campos) {
    const atual = registro?.[campo.campo];
    if (campo.tipo === "data" || campo.tipo === "datahora") {
      valores[campo.campo] = registro ? paraInput(atual, campo.tipo === "data" ? "data" : "datahora") : "";
    } else if (campo.tipo === "select") {
      valores[campo.campo] = atual != null && atual !== "" ? String(atual) : (campo.opcoes?.[0] ?? "");
    } else if (campo.tipo === "cor") {
      valores[campo.campo] = atual ? String(atual) : "#2e56c8";
    } else {
      valores[campo.campo] = atual == null ? "" : String(atual);
    }
  }
  return valores;
}

/** Converte o formulário para o formato aceito pela API. */
function paraPayload(campos: CampoDef[], valores: Record<string, string>) {
  const dados: Record<string, unknown> = {};
  for (const campo of campos) {
    const valor = (valores[campo.campo] ?? "").trim();
    if (campo.tipo === "numero" || campo.tipo === "relacao") {
      dados[campo.campo] = valor === "" ? null : Number(valor);
    } else if (campo.tipo === "data" || campo.tipo === "datahora") {
      dados[campo.campo] = valor === "" ? null : new Date(valor).toISOString();
    } else {
      dados[campo.campo] = valor === "" ? null : valor;
    }
  }
  return dados;
}

function CelulaRelacao({
  valor,
  relacao,
}: {
  valor: unknown;
  relacao: NonNullable<ColunaDef["relacao"]>;
}) {
  const opcoes = useOpcoesRelacao(relacao);
  if (valor == null || valor === "") return <span className="text-muted-foreground">—</span>;
  const achado = opcoes.data?.find((o) => o.id === Number(valor));
  return <span>{achado?.rotulo ?? `#${valor}`}</span>;
}

function Celula({ coluna, registro }: { coluna: ColunaDef; registro: Registro }) {
  const valor = registro[coluna.campo];
  if (coluna.tipo === "status") return <BadgeStatus valor={valor} />;
  if (coluna.tipo === "relacao" && coluna.relacao) return <CelulaRelacao valor={valor} relacao={coluna.relacao} />;
  if (coluna.tipo === "datahora") return <span className="tabular-nums">{dataHora(valor)}</span>;
  if (coluna.tipo === "data") return <span className="tabular-nums">{dataCurta(valor)}</span>;
  if (coluna.tipo === "numero")
    return <span className="tabular-nums">{valor == null || valor === "" ? "—" : numero(valor)}</span>;
  const texto = valor == null || valor === "" ? "" : String(valor);
  if (!texto) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="block max-w-[22ch] truncate" title={texto}>
      {texto}
    </span>
  );
}

function CampoRelacao({
  campo,
  valor,
  onChange,
}: {
  campo: CampoDef;
  valor: string;
  onChange: (valor: string) => void;
}) {
  const opcoes = useOpcoesRelacao(campo.relacao ?? "efetivo");
  return (
    <Campo rotulo={campo.rotulo} dica={campo.dica} obrigatorio={campo.obrigatorio}>
      <Selecao value={valor} onChange={(e) => onChange(e.target.value)} disabled={opcoes.isLoading}>
        <option value="">{opcoes.isLoading ? "Carregando…" : "— não informado —"}</option>
        {opcoes.data?.map((opcao) => (
          <option key={opcao.id} value={String(opcao.id)}>
            {opcao.rotulo}
          </option>
        ))}
      </Selecao>
    </Campo>
  );
}

function FormularioModulo({
  campos,
  valores,
  onMudar,
}: {
  campos: CampoDef[];
  valores: Record<string, string>;
  onMudar: (campo: string, valor: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {campos.map((campo) => {
        const valor = valores[campo.campo] ?? "";
        const largura = campo.largura === "cheia" || campo.tipo === "textarea" ? "sm:col-span-2" : "";

        if (campo.tipo === "relacao") {
          return (
            <div key={campo.campo} className={largura}>
              <CampoRelacao campo={campo} valor={valor} onChange={(v) => onMudar(campo.campo, v)} />
            </div>
          );
        }

        return (
          <Campo
            key={campo.campo}
            rotulo={campo.rotulo}
            dica={campo.dica}
            obrigatorio={campo.obrigatorio}
            className={largura}
          >
            {campo.tipo === "textarea" ? (
              <AreaTexto value={valor} onChange={(e) => onMudar(campo.campo, e.target.value)} />
            ) : campo.tipo === "select" ? (
              <Selecao value={valor} onChange={(e) => onMudar(campo.campo, e.target.value)}>
                {!campo.obrigatorio && <option value="">— não informado —</option>}
                {campo.opcoes?.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </Selecao>
            ) : campo.tipo === "cor" ? (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label={campo.rotulo}
                  value={valor || "#2e56c8"}
                  onChange={(e) => onMudar(campo.campo, e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded-md border border-border bg-surface-2"
                />
                <Entrada value={valor} onChange={(e) => onMudar(campo.campo, e.target.value)} />
              </div>
            ) : (
              <Entrada
                type={
                  campo.tipo === "numero"
                    ? "number"
                    : campo.tipo === "data"
                      ? "date"
                      : campo.tipo === "datahora"
                        ? "datetime-local"
                        : campo.tipo === "hora"
                          ? "time"
                          : "text"
                }
                step={campo.tipo === "numero" ? "any" : undefined}
                value={valor}
                required={campo.obrigatorio}
                onChange={(e) => onMudar(campo.campo, e.target.value)}
              />
            )}
          </Campo>
        );
      })}
    </div>
  );
}

export function DataModule({
  modulo,
  usuario,
  compacto = false,
}: {
  modulo: ModuloDef;
  usuario: UsuarioSessao;
  compacto?: boolean;
}) {
  const rpc = modulo.rpc ?? modulo.chave;
  const campos = modulo.campos ?? [];
  const colunas = modulo.colunas ?? [];
  const escrita = podeEscrever(usuario, modulo.chave);

  const [busca, setBusca] = React.useState("");
  const [buscaAplicada, setBuscaAplicada] = React.useState("");
  const [filtros, setFiltros] = React.useState<Record<string, string>>({});
  const [periodo, setPeriodo] = React.useState<{ de: string; ate: string }>({ de: "", ate: "" });
  const [pagina, setPagina] = React.useState(1);

  const [aberto, setAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<Registro | null>(null);
  const [valores, setValores] = React.useState<Record<string, string>>(() => valoresIniciais(campos));
  const [erroForm, setErroForm] = React.useState("");
  const [excluindo, setExcluindo] = React.useState<Registro | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaAplicada(busca);
      setPagina(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [busca]);

  const filtro: FiltroLista = {
    busca: buscaAplicada,
    filtros,
    de: periodo.de ? new Date(periodo.de).toISOString() : undefined,
    ate: periodo.ate ? new Date(`${periodo.ate}T23:59:59`).toISOString() : undefined,
    ordenarPor: modulo.ordenarPor,
    ordem: "desc",
    limite: LIMITE,
    pagina,
  };

  const lista = useLista(rpc, filtro);
  const criar = useCriar(rpc);
  const atualizar = useAtualizar(rpc);
  const excluir = useExcluir(rpc);
  const salvando = criar.isPending || atualizar.isPending;

  const camposFiltro = (modulo.filtros ?? [])
    .map((nome) => campos.find((c) => c.campo === nome && c.tipo === "select"))
    .filter((c): c is CampoDef => Boolean(c));

  const abrirNovo = () => {
    setEditando(null);
    setValores(valoresIniciais(campos));
    setErroForm("");
    setAberto(true);
  };

  const abrirEdicao = (registro: Registro) => {
    setEditando(registro);
    setValores(valoresIniciais(campos, registro));
    setErroForm("");
    setAberto(true);
  };

  const salvar = (evento: React.FormEvent) => {
    evento.preventDefault();
    setErroForm("");
    const dados = paraPayload(campos, valores);
    const aoErrar = (erro: unknown) => setErroForm(mensagemErro(erro));
    if (editando) {
      atualizar.mutate(
        { id: Number(editando.id), dados },
        { onSuccess: () => setAberto(false), onError: aoErrar },
      );
    } else {
      criar.mutate(dados, { onSuccess: () => setAberto(false), onError: aoErrar });
    }
  };

  const confirmarExclusao = () => {
    if (!excluindo) return;
    excluir.mutate(Number(excluindo.id), { onSuccess: () => setExcluindo(null) });
  };

  const total = lista.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));
  const itens = lista.data?.itens ?? [];
  const filtrosAtivos =
    Boolean(buscaAplicada) || Boolean(periodo.de) || Boolean(periodo.ate) || Object.values(filtros).some(Boolean);

  return (
    <section className="flex flex-col gap-4">
      {!compacto && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{modulo.descricao}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => lista.refetch()}
              disabled={lista.isFetching}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw className={cn("size-4", lista.isFetching && "animate-spin")} />
              Atualizar
            </button>
            {escrita && (
              <button
                type="button"
                onClick={abrirNovo}
                className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-light"
              >
                <Plus className="size-4" />
                Novo{modulo.singular ? ` ${modulo.singular}` : ""}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra de busca e filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Entrada
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="pl-9"
          />
        </div>
        {camposFiltro.map((campo) => (
          <Selecao
            key={campo.campo}
            value={filtros[campo.campo] ?? ""}
            onChange={(e) => {
              setFiltros((atual) => ({ ...atual, [campo.campo]: e.target.value }));
              setPagina(1);
            }}
            className="w-auto min-w-[150px]"
          >
            <option value="">{campo.rotulo}: todos</option>
            {campo.opcoes?.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </Selecao>
        ))}
        <Entrada
          type="date"
          value={periodo.de}
          onChange={(e) => {
            setPeriodo((p) => ({ ...p, de: e.target.value }));
            setPagina(1);
          }}
          className="w-auto"
          title="Período — de"
        />
        <Entrada
          type="date"
          value={periodo.ate}
          onChange={(e) => {
            setPeriodo((p) => ({ ...p, ate: e.target.value }));
            setPagina(1);
          }}
          className="w-auto"
          title="Período — até"
        />
        {filtrosAtivos && (
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setFiltros({});
              setPeriodo({ de: "", ate: "" });
              setPagina(1);
            }}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-3.5" />
            Limpar
          </button>
        )}
        {compacto && escrita && (
          <button
            type="button"
            onClick={abrirNovo}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-light"
          >
            <Plus className="size-4" />
            Novo{modulo.singular ? ` ${modulo.singular}` : ""}
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {lista.isLoading ? (
          <Carregando texto={`Carregando ${modulo.curto.toLowerCase()}…`} />
        ) : lista.isError ? (
          <div className="p-4">
            <Aviso texto={mensagemErro(lista.error)} />
          </div>
        ) : itens.length === 0 ? (
          <Vazio
            texto={
              filtrosAtivos
                ? "Nenhum registro encontrado com os filtros aplicados."
                : `Nenhum registro cadastrado ainda.${escrita ? " Use o botão “Novo” para começar." : ""}`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/60">
                  {colunas.map((coluna) => (
                    <th key={coluna.campo} className="rotulo whitespace-nowrap px-3 py-2.5 text-left">
                      {coluna.rotulo}
                    </th>
                  ))}
                  <th className="rotulo w-24 px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((registro) => (
                  <tr
                    key={String(registro.id)}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/40"
                  >
                    {colunas.map((coluna) => (
                      <td key={coluna.campo} className="px-3 py-2.5 align-middle">
                        <Celula coluna={coluna} registro={registro} />
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(registro)}
                          title={escrita ? "Editar" : "Visualizar"}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-primary-light"
                        >
                          <Pencil className="size-4" />
                        </button>
                        {escrita && (
                          <button
                            type="button"
                            onClick={() => setExcluindo(registro)}
                            title="Excluir"
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {total} registro(s){lista.isFetching && !lista.isLoading ? " · atualizando…" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            className="rounded-md border border-border px-2.5 py-1.5 transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="tabular-nums">
            {pagina} / {paginas}
          </span>
          <button
            type="button"
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
            className="rounded-md border border-border px-2.5 py-1.5 transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Modal criar/editar */}
      <Modal
        aberto={aberto}
        titulo={
          editando
            ? `${escrita ? "Editar" : "Visualizar"} ${modulo.singular ?? "registro"}`
            : `Novo ${modulo.singular ?? "registro"}`
        }
        descricao={modulo.titulo}
        onFechar={() => setAberto(false)}
      >
        <form id="form-modulo" onSubmit={salvar} className="flex flex-col gap-4">
          {erroForm && <Aviso texto={erroForm} />}
          <fieldset disabled={!escrita} className="contents">
            <FormularioModulo
              campos={campos}
              valores={valores}
              onMudar={(campo, valor) => setValores((atual) => ({ ...atual, [campo]: valor }))}
            />
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {escrita ? "Cancelar" : "Fechar"}
            </button>
            {escrita && (
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-light disabled:opacity-60"
              >
                {salvando && (
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                )}
                {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* Confirmação de exclusão */}
      <Modal
        aberto={Boolean(excluindo)}
        titulo="Confirmar exclusão"
        largura="pequena"
        onFechar={() => setExcluindo(null)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Excluir definitivamente este registro de {modulo.curto.toLowerCase()}? A ação fica registrada na auditoria
            do sistema.
          </p>
          {excluir.isError && <Aviso texto={mensagemErro(excluir.error)} />}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setExcluindo(null)}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarExclusao}
              disabled={excluir.isPending}
              className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/85 disabled:opacity-60"
            >
              {excluir.isPending && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              )}
              {excluir.isPending ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
