import * as React from "react";
import { cn } from "@/lib/utils";
import { DataModule } from "@/components/data-module";
import { Aviso } from "@/components/ui/campos";
import { MANUTENCOES, moduloPorChave } from "@/lib/modules";
import { podeVer, type UsuarioSessao } from "@/lib/session";

export default function ViaturasPage({ usuario }: { usuario: UsuarioSessao }) {
  const [aba, setAba] = React.useState<"viaturas" | "manutencoes">("viaturas");
  const viaturas = moduloPorChave("viaturas");

  if (!viaturas) return <Aviso texto="Módulo não encontrado." />;
  if (!podeVer(usuario, "viaturas")) return <Aviso texto="Você não tem permissão para acessar este módulo." />;

  const abas = [
    { chave: "viaturas" as const, rotulo: "Frota" },
    { chave: "manutencoes" as const, rotulo: "Manutenções" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-card p-1">
        {abas.map((item) => (
          <button
            key={item.chave}
            type="button"
            onClick={() => setAba(item.chave)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              aba === item.chave
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {aba === "viaturas" ? (
        <DataModule modulo={viaturas} usuario={usuario} />
      ) : (
        <DataModule modulo={MANUTENCOES} usuario={usuario} />
      )}
    </div>
  );
}
