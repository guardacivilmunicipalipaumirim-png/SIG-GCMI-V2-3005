/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Save, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaTexto, Aviso, Campo, Carregando, Entrada, Vazio } from "@/components/ui/campos";
import { dataHora } from "@/lib/formatos";
import { podeEscrever, type UsuarioSessao } from "@/lib/session";
import { useConfiguracoes, useSalvarConfiguracoes } from "@/queries/sistema";

function mensagemErro(erro: unknown): string {
  const bruto = (erro as any)?.message ?? "";
  return String(bruto || "Não foi possível salvar as configurações.");
}

export default function ConfiguracoesPage({ usuario }: { usuario: UsuarioSessao }) {
  const consulta = useConfiguracoes();
  const salvar = useSalvarConfiguracoes();
  const escrita = podeEscrever(usuario, "configuracoes");

  const [grupoAtivo, setGrupoAtivo] = React.useState<string | null>(null);
  const [valores, setValores] = React.useState<Record<string, string>>({});
  const [salvo, setSalvo] = React.useState(false);

  const linhas = React.useMemo(() => (consulta.data ?? []) as any[], [consulta.data]);

  const grupos = React.useMemo(() => {
    const conjunto: string[] = [];
    for (const linha of linhas) {
      const grupo = linha.grupo || "Geral";
      if (!conjunto.includes(grupo)) conjunto.push(grupo);
    }
    return conjunto;
  }, [linhas]);

  React.useEffect(() => {
    if (!linhas.length) return;
    setValores(Object.fromEntries(linhas.map((l) => [l.chave, l.valor ?? ""])));
  }, [linhas]);

  React.useEffect(() => {
    if (!grupoAtivo && grupos.length) setGrupoAtivo(grupos[0]);
  }, [grupos, grupoAtivo]);

  const visiveis = linhas.filter((l) => (l.grupo || "Geral") === grupoAtivo);

  const alterados = linhas.filter((l) => (valores[l.chave] ?? "") !== (l.valor ?? ""));

  function aoSalvar() {
    setSalvo(false);
    salvar.mutate(
      { itens: alterados.map((l) => ({ chave: l.chave, valor: valores[l.chave] ?? "" })) },
      { onSuccess: () => setSalvo(true) },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings className="size-4 text-gold" />
          <h2 className="display text-sm font-semibold text-foreground">Configurações do sistema</h2>
        </div>
        <div className="flex items-center gap-3">
          {alterados.length > 0 && (
            <span className="text-[11px] text-gold">{alterados.length} alteração(ões) pendente(s)</span>
          )}
          {salvo && alterados.length === 0 && <span className="text-[11px] text-success">Configurações salvas.</span>}
          <button
            type="button"
            onClick={aoSalvar}
            disabled={!escrita || salvar.isPending || alterados.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
          >
            <Save className="size-4" />
            {salvar.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </section>

      {!escrita && <Aviso texto="Seu perfil permite apenas visualizar as configurações." tom="danger" />}
      {salvar.isError && <Aviso texto={mensagemErro(salvar.error)} />}

      {consulta.isPending ? (
        <Carregando texto="Carregando configurações…" />
      ) : consulta.isError ? (
        <Aviso texto="Não foi possível carregar as configurações." />
      ) : !linhas.length ? (
        <Vazio texto="Nenhuma configuração cadastrada." />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <nav className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-2 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
            {grupos.map((grupo) => (
              <button
                key={grupo}
                type="button"
                onClick={() => setGrupoAtivo(grupo)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors",
                  grupoAtivo === grupo
                    ? "bg-primary/25 text-foreground shadow-[inset_2px_0_0_0_var(--gold)]"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {grupo}
              </button>
            ))}
          </nav>

          <section className="flex-1 rounded-lg border border-border bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {visiveis.map((linha) => {
                const valor = valores[linha.chave] ?? "";
                const rotulo = linha.rotulo || linha.chave;
                const longo = valor.length > 60 || /observ|texto|aviso|mensagem|endereco/i.test(linha.chave);
                const tipo = linha.tipo || "texto";
                return (
                  <Campo
                    key={linha.chave}
                    rotulo={rotulo}
                    dica={linha.descricao || linha.chave}
                    className={longo ? "sm:col-span-2" : undefined}
                  >
                    {longo ? (
                      <AreaTexto
                        value={valor}
                        disabled={!escrita}
                        onChange={(e) => setValores({ ...valores, [linha.chave]: e.target.value })}
                      />
                    ) : (
                      <Entrada
                        type={tipo === "numero" ? "number" : tipo === "cor" ? "color" : "text"}
                        value={valor}
                        disabled={!escrita}
                        onChange={(e) => setValores({ ...valores, [linha.chave]: e.target.value })}
                      />
                    )}
                  </Campo>
                );
              })}
            </div>

            {visiveis.length > 0 && (
              <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                Última atualização do grupo:{" "}
                {dataHora(
                  visiveis
                    .map((l) => l.atualizadoEm)
                    .filter(Boolean)
                    .sort()
                    .at(-1),
                )}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
