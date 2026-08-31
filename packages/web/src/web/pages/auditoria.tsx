/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import { Aviso, Campo, Carregando, Entrada, Selecao, Vazio } from "@/components/ui/campos";
import { BadgeStatus } from "@/components/ui/badge-status";
import { dataHora, numero } from "@/lib/formatos";
import { MODULOS } from "@/lib/modules";
import { useAuditoria } from "@/queries/sistema";

const ACOES = ["login", "logout", "criar", "editar", "excluir", "gerar_relatorio", "backup", "trocar_senha"];
const LIMITE = 50;

export default function AuditoriaPage() {
  const [busca, setBusca] = React.useState("");
  const [buscaAplicada, setBuscaAplicada] = React.useState("");
  const [modulo, setModulo] = React.useState("");
  const [acao, setAcao] = React.useState("");
  const [de, setDe] = React.useState("");
  const [ate, setAte] = React.useState("");
  const [pagina, setPagina] = React.useState(1);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaAplicada(busca);
      setPagina(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [busca]);

  const consulta = useAuditoria({
    busca: buscaAplicada,
    modulo,
    acao,
    de: de ? new Date(`${de}T00:00:00`).toISOString() : undefined,
    ate: ate ? new Date(`${ate}T23:59:59`).toISOString() : undefined,
    pagina,
  });

  const itens = (consulta.data?.itens ?? []) as any[];
  const total = consulta.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));

  function limpar() {
    setBusca("");
    setModulo("");
    setAcao("");
    setDe("");
    setAte("");
    setPagina(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <span className="rotulo mb-1.5 block">Buscar</span>
            <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-muted-foreground" />
            <Entrada
              placeholder="Descrição ou usuário…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Campo rotulo="Módulo" className="w-44">
            <Selecao
              value={modulo}
              onChange={(e) => {
                setModulo(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              {MODULOS.map((m) => (
                <option key={m.chave} value={m.chave}>
                  {m.curto}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Ação" className="w-40">
            <Selecao
              value={acao}
              onChange={(e) => {
                setAcao(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas</option>
              {ACOES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="De" className="w-40">
            <Entrada
              type="date"
              value={de}
              onChange={(e) => {
                setDe(e.target.value);
                setPagina(1);
              }}
            />
          </Campo>
          <Campo rotulo="Até" className="w-40">
            <Entrada
              type="date"
              value={ate}
              onChange={(e) => {
                setAte(e.target.value);
                setPagina(1);
              }}
            />
          </Campo>
          <button
            type="button"
            onClick={limpar}
            className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary-light hover:text-foreground"
          >
            Limpar filtros
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <ScrollText className="size-3.5 text-gold" />
          <span className="text-[11px] text-muted-foreground">
            {consulta.isFetching ? "atualizando…" : `${numero(total)} registro(s) na trilha de auditoria`}
          </span>
        </div>

        {consulta.isPending ? (
          <Carregando texto="Carregando registros…" />
        ) : consulta.isError ? (
          <div className="p-4">
            <Aviso texto="Não foi possível carregar a auditoria." />
          </div>
        ) : !itens.length ? (
          <Vazio texto="Nenhum registro encontrado com os filtros atuais." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60">
                <tr>
                  {["Data/Hora", "Usuário", "Ação", "Módulo", "Registro", "Descrição", "IP"].map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-t border-border/60 hover:bg-surface-2/40">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                      {dataHora(item.criadoEm)}
                    </td>
                    <td className="px-3 py-2 text-foreground">{item.usuarioNome ?? "—"}</td>
                    <td className="px-3 py-2">
                      <BadgeStatus valor={item.acao} />
                    </td>
                    <td className="px-3 py-2 text-foreground/90">{item.modulo ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-foreground/90">
                      {item.registroId != null ? `#${item.registroId}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground/90">
                      <span className="block max-w-[46ch] truncate" title={item.descricao ?? ""}>
                        {item.descricao || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{item.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paginas > 1 && (
          <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-[11px] text-muted-foreground">
              Página {pagina} de {paginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
                disabled={pagina >= paginas}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}
