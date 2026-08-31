import { eq } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { hashSenha } from "./senha";
import { permissoesPadrao } from "./modulos";

const ADMIN_LOGIN = "Omega";
const ADMIN_SENHA = "Alpha@#gcm";

const CONFIG_PADRAO: { chave: string; valor: string; grupo: string; descricao: string }[] = [
  { chave: "instituicao.nome", valor: "Guarda Civil Municipal de Ipaumirim", grupo: "geral", descricao: "Nome da instituição" },
  { chave: "instituicao.sigla", valor: "GCM-Ipaumirim", grupo: "geral", descricao: "Sigla" },
  { chave: "instituicao.endereco", valor: "Ipaumirim - CE", grupo: "geral", descricao: "Endereço" },
  { chave: "instituicao.telefone", valor: "153", grupo: "geral", descricao: "Telefone da central" },
  { chave: "instituicao.email", valor: "", grupo: "geral", descricao: "E-mail institucional" },
  { chave: "protocolo.prefixo.atendimento", valor: "ATD", grupo: "sistema", descricao: "Prefixo do protocolo de atendimento" },
  { chave: "protocolo.prefixo.ocorrencia", valor: "OCO", grupo: "sistema", descricao: "Prefixo do número de ocorrência" },
  { chave: "operacional.jornada", valor: "6h", grupo: "sistema", descricao: "Jornada padrão de trabalho" },
  { chave: "operacional.turnos", valor: "Manhã (07h-13h), Tarde (13h-19h), Noite (19h-07h)", grupo: "sistema", descricao: "Turnos" },
  { chave: "seguranca.sessao_horas", valor: "12", grupo: "seguranca", descricao: "Validade da sessão em horas" },
  { chave: "seguranca.tentativas_maximas", valor: "5", grupo: "seguranca", descricao: "Tentativas de login antes do bloqueio" },
  { chave: "notificacoes.email", valor: "", grupo: "notificacoes", descricao: "E-mail para notificações" },
  { chave: "notificacoes.sms", valor: "", grupo: "notificacoes", descricao: "Número para SMS" },
  {
    chave: "integracoes.mapa_provedor",
    valor: "escuro",
    grupo: "integracoes",
    descricao: "Provedor de tiles do mapa operacional (MapLibre + OpenStreetMap, sem chave de API)",
  },
  { chave: "backup.frequencia", valor: "Diária", grupo: "backup", descricao: "Frequência do backup automático" },
  { chave: "backup.retencao_dias", valor: "30", grupo: "backup", descricao: "Retenção dos backups (dias)" },
  { chave: "personalizacao.tema", valor: "institucional-escuro", grupo: "personalizacao", descricao: "Tema da interface" },
];

let executado: Promise<void> | null = null;

async function executarSeed() {
  const [admin] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.login, ADMIN_LOGIN));
  if (!admin) {
    await db.insert(schema.usuarios).values({
      nome: "Administrador do Sistema",
      login: ADMIN_LOGIN,
      senhaHash: hashSenha(ADMIN_SENHA),
      perfil: "admin",
      permissoes: permissoesPadrao("admin"),
      status: "Ativo",
    });
  }

  const existentes = await db.select().from(schema.configuracoes);
  const chaves = new Set(existentes.map((c) => c.chave));
  const faltando = CONFIG_PADRAO.filter((c) => !chaves.has(c.chave));
  if (faltando.length > 0) await db.insert(schema.configuracoes).values(faltando);
}

/** Garante o usuário administrador e as configurações padrão (executa uma vez por processo). */
export function garantirSeed(): Promise<void> {
  if (!executado) {
    executado = executarSeed().catch((erro) => {
      executado = null;
      throw erro;
    });
  }
  return executado;
}
