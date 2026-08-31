/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Database, Download, HardDriveDownload, Trash2 } from "lucide-react";
import { AreaTexto, Aviso, Campo, Carregando, Selecao, Vazio } from "@/components/ui/campos";
import { BadgeStatus } from "@/components/ui/badge-status";
import { Modal } from "@/components/ui/modal";
import { dataHora, numero } from "@/lib/formatos";
import { podeEscrever, type UsuarioSessao } from "@/lib/session";
import { useBackups, useBaixarBackup, useExcluirBackup, useExecutarBackup } from "@/queries/sistema";

function mensagemErro(erro: unknown): string {
  const bruto = (erro as any)?.message ?? "";
  return String(bruto || "Não foi possível concluir a operação.");
}

export default function BackupPage({ usuario }: { usuario: UsuarioSessao }) {
  const lista = useBackups();
  const executar = useExecutarBackup();
  const baixar = useBaixarBackup();
  const excluir = useExcluirBackup();
  const escrita = podeEscrever(usuario, "backup");

  const [tipo, setTipo] = React.useState("Manual");
  const [observacoes, setObservacoes] = React.useState("");
  const [excluindo, setExcluindo] = React.useState<any | null>(null);
  const [aviso, setAviso] = React.useState("");

  const itens = (lista.data ?? []) as any[];

  function aoExecutar() {
    setAviso("");
    executar.mutate(
      { tipo, observacoes: observacoes.trim() || null },
      {
        onSuccess: (registro: any) => {
          setObservacoes("");
          setAviso(`Backup ${registro?.nome ?? ""} gerado com ${numero(registro?.registros ?? 0)} registros.`);
        },
      },
    );
  }

  function aoBaixar(id: number) {
    baixar.mutate(
      { id },
      {
        onSuccess: (arquivo: any) => {
          const blob = new Blob([arquivo.conteudo], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = arquivo.nome ?? "backup-sig-gcmi.json";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <header className="flex items-center gap-2">
          <Database className="size-4 text-gold" />
          <h2 className="display text-sm font-semibold text-foreground">Gerar cópia de segurança</h2>
        </header>
        <p className="mt-1 text-xs text-muted-foreground">
          O backup exporta todas as tabelas operacionais e administrativas em um único arquivo JSON, que pode ser
          baixado e arquivado fora do servidor.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Campo rotulo="Tipo">
            <Selecao value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!escrita}>
              {["Manual", "Automático", "Pré-atualização", "Mensal"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <AreaTexto
              rows={2}
              value={observacoes}
              disabled={!escrita}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo do backup, responsável, destino do arquivo…"
            />
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={aoExecutar}
            disabled={!escrita || executar.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
          >
            <HardDriveDownload className="size-4" />
            {executar.isPending ? "Gerando backup…" : "Executar backup agora"}
          </button>
          {aviso && <span className="text-xs text-success">{aviso}</span>}
        </div>

        {!escrita && (
          <div className="mt-3">
            <Aviso texto="Seu perfil permite apenas consultar os backups existentes." />
          </div>
        )}
        {executar.isError && (
          <div className="mt-3">
            <Aviso texto={mensagemErro(executar.error)} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="display text-sm font-semibold text-foreground">Backups armazenados</h2>
          <span className="text-[11px] text-muted-foreground">
            {lista.isFetching ? "atualizando…" : `${itens.length} arquivo(s)`}
          </span>
        </header>

        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <div className="p-4">
            <Aviso texto={mensagemErro(lista.error)} />
          </div>
        ) : !itens.length ? (
          <Vazio texto="Nenhum backup gerado até agora." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60">
                <tr>
                  {["Arquivo", "Tipo", "Escopo", "Status", "Registros", "Tamanho", "Gerado por", "Data", ""].map(
                    (c, i) => (
                      <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                        {c}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-t border-border/60 hover:bg-surface-2/40">
                    <td className="px-3 py-2 text-foreground">{item.nome}</td>
                    <td className="px-3 py-2 text-foreground/90">{item.tipo}</td>
                    <td className="px-3 py-2 text-foreground/90">{item.escopo}</td>
                    <td className="px-3 py-2">
                      <BadgeStatus valor={item.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-foreground/90">{numero(item.registros ?? 0)}</td>
                    <td className="px-3 py-2 tabular-nums text-foreground/90">{numero(item.tamanhoKb ?? 0)} KB</td>
                    <td className="px-3 py-2 text-foreground/90">{item.criadoPor ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                      {dataHora(item.criadoEm)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => aoBaixar(item.id)}
                          disabled={baixar.isPending}
                          aria-label="Baixar"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-gold disabled:opacity-40"
                        >
                          <Download className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExcluindo(item)}
                          disabled={!escrita}
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
        aberto={!!excluindo}
        titulo="Excluir backup"
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
                excluindo && excluir.mutate({ id: excluindo.id }, { onSuccess: () => setExcluindo(null) })
              }
              className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/85 disabled:opacity-60"
            >
              {excluir.isPending ? "Excluindo…" : "Excluir"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Confirma a exclusão do arquivo <span className="text-foreground">{excluindo?.nome}</span>? Esta ação não pode
          ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
