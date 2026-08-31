import * as React from "react";
import { Download, FileSpreadsheet, Play } from "lucide-react";
import { Aviso, Campo, Carregando, Entrada, Selecao, Vazio } from "@/components/ui/campos";
import { BadgeStatus } from "@/components/ui/badge-status";
import { dataHora, numero } from "@/lib/formatos";
import { podeEscrever, type UsuarioSessao } from "@/lib/session";
import { useFontesRelatorio, useGerarRelatorio, useHistoricoRelatorios } from "@/queries/relatorios";

type TipoFonte = "Ocorrências" | "Atendimentos" | "Atividades" | "Rondas" | "Efetivo" | "Viaturas";

const PERIODICIDADES = ["Ad-hoc", "Diário", "Semanal", "Mensal", "Trimestral", "Anual"];

function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob(["﻿", conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage({ usuario }: { usuario: UsuarioSessao }) {
  const fontes = useFontesRelatorio();
  const historico = useHistoricoRelatorios();
  const gerar = useGerarRelatorio();

  const [tipo, setTipo] = React.useState<TipoFonte>("Ocorrências");
  const [de, setDe] = React.useState("");
  const [ate, setAte] = React.useState("");
  const [periodicidade, setPeriodicidade] = React.useState("Ad-hoc");
  const [salvarHistorico, setSalvarHistorico] = React.useState(true);

  const resultado = gerar.data;
  /** Só quem tem escrita no módulo registra o relatório no histórico. */
  const podeRegistrar = podeEscrever(usuario, "relatorios");

  function aoGerar() {
    gerar.mutate({
      tipo,
      de: de ? new Date(`${de}T00:00:00`).toISOString() : undefined,
      ate: ate ? new Date(`${ate}T23:59:59`).toISOString() : undefined,
      periodicidade,
      formato: "CSV",
      salvarHistorico,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <header className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-gold" />
          <h2 className="display text-sm font-semibold text-foreground">Gerar relatório</h2>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="Fonte de dados" obrigatorio>
            <Selecao value={tipo} onChange={(e) => setTipo(e.target.value as TipoFonte)}>
              {(fontes.data ?? [{ nome: "Ocorrências" }]).map((fonte) => (
                <option key={fonte.nome} value={fonte.nome}>
                  {fonte.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="De">
            <Entrada type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </Campo>
          <Campo rotulo="Até">
            <Entrada type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </Campo>
          <Campo rotulo="Periodicidade">
            <Selecao value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
              {PERIODICIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Selecao>
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={aoGerar}
            disabled={gerar.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
          >
            <Play className="size-4" />
            {gerar.isPending ? "Gerando…" : "Gerar relatório"}
          </button>

          {resultado && (
            <button
              type="button"
              onClick={() =>
                baixarArquivo(
                  `relatorio-${resultado.tipo.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`,
                  resultado.csv,
                  "text/csv;charset=utf-8",
                )
              }
              className="inline-flex items-center gap-2 rounded-md border border-gold/50 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              <Download className="size-4" />
              Baixar CSV ({numero(resultado.total)} registros)
            </button>
          )}

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              aria-label="Registrar no histórico"
              disabled={!podeRegistrar}
              checked={salvarHistorico && podeRegistrar}
              onChange={(e) => setSalvarHistorico(e.target.checked)}
              className="size-3.5 accent-[#2e56c8]"
            />
            Registrar no histórico
          </label>
        </div>

        {gerar.isError && <div className="mt-3"><Aviso texto="Não foi possível gerar o relatório." /></div>}
      </section>

      {resultado && (
        <section className="rounded-lg border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="display text-sm font-semibold text-foreground">
              Prévia — {resultado.tipo}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {numero(resultado.total)} registro(s){resultado.total > 100 ? " · exibindo os 100 primeiros" : ""}
              </span>
            </h2>
          </header>
          {resultado.total === 0 ? (
            <Vazio texto="Nenhum registro encontrado para o período informado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2/60">
                  <tr>
                    {resultado.colunas.map((coluna) => (
                      <th key={coluna.campo} className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                        {coluna.rotulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.linhas.slice(0, 100).map((linha, i) => (
                    <tr key={i} className="border-t border-border/60 hover:bg-surface-2/40">
                      {resultado.colunas.map((coluna) => {
                        const valor = String(linha[coluna.campo] ?? "");
                        return (
                          <td key={coluna.campo} className="px-3 py-2 text-foreground/90">
                            <span className="block max-w-[28ch] truncate" title={valor}>
                              {valor || "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="rounded-lg border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="display text-sm font-semibold text-foreground">Histórico de relatórios</h2>
        </header>
        {historico.isPending ? (
          <Carregando />
        ) : historico.isError ? (
          <div className="p-4">
            <Aviso texto="Não foi possível carregar o histórico." />
          </div>
        ) : !historico.data?.length ? (
          <Vazio texto="Nenhum relatório gerado até agora." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60">
                <tr>
                  {["Relatório", "Tipo", "Periodicidade", "Registros", "Formato", "Gerado por", "Data"].map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.data.map((item) => (
                  <tr key={item.id} className="border-t border-border/60 hover:bg-surface-2/40">
                    <td className="px-3 py-2 text-foreground">{item.nome}</td>
                    <td className="px-3 py-2">
                      <BadgeStatus valor={item.tipo} />
                    </td>
                    <td className="px-3 py-2 text-foreground/90">{item.periodicidade}</td>
                    <td className="px-3 py-2 tabular-nums text-foreground/90">{numero(item.totalRegistros ?? 0)}</td>
                    <td className="px-3 py-2 text-foreground/90">{item.formato}</td>
                    <td className="px-3 py-2 text-foreground/90">{item.geradoPor ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{dataHora(item.criadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
