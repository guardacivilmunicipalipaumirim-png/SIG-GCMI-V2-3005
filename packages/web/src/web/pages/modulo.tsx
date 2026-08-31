import { DataModule } from "@/components/data-module";
import { Aviso } from "@/components/ui/campos";
import { moduloPorChave } from "@/lib/modules";
import { podeVer, type UsuarioSessao } from "@/lib/session";

/**
 * Página genérica de CRUD: recebe a chave do módulo e monta tabela + formulário
 * a partir do registro em `lib/modules.ts`.
 */
export default function ModuloPage({ chave, usuario }: { chave: string; usuario: UsuarioSessao }) {
  const modulo = moduloPorChave(chave);

  if (!modulo) return <Aviso texto="Módulo não encontrado." />;
  if (!podeVer(usuario, modulo.chave)) {
    return <Aviso texto="Você não tem permissão para acessar este módulo." />;
  }

  return <DataModule modulo={modulo} usuario={usuario} />;
}
