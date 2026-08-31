import { z } from "zod";
import * as schema from "../database/schema";
import { criarCrud, proximoNumero } from "../lib/crud";

const dataOpc = z.coerce.date().nullish();
const txt = z.string().nullish();
const num = z.number().nullish();

/* --------------------------------------------------------- ATENDIMENTOS (153) */

export const atendimentos = criarCrud({
  modulo: "atendimentos",
  tabela: schema.atendimentos,
  camposBusca: ["protocolo", "solicitanteNome", "solicitanteTelefone", "endereco", "descricao"],
  ordenarPor: "dataHora",
  campoPeriodo: "dataHora",
  rotulo: (r) => `atendimento ${r.protocolo}`,
  antesDeCriar: async (valores) => ({
    ...valores,
    protocolo: valores.protocolo || (await proximoNumero(schema.atendimentos, "ATD")),
  }),
  entrada: z.object({
    protocolo: txt,
    dataHora: dataOpc,
    duracaoSegundos: num,
    tipo: z.string(),
    canal: txt,
    situacao: z.string(),
    solicitanteNome: txt,
    solicitanteTelefone: txt,
    endereco: txt,
    bairro: txt,
    descricao: txt,
    acoes: txt,
    atendenteId: num,
    ocorrenciaId: num,
  }),
});

/* ------------------------------------------------------------------ OCORRÊNCIAS */

export const ocorrencias = criarCrud({
  modulo: "ocorrencias",
  tabela: schema.ocorrencias,
  camposBusca: ["numero", "tipo", "endereco", "bairro", "denunciante", "descricao"],
  ordenarPor: "dataHora",
  campoPeriodo: "dataHora",
  rotulo: (r) => `ocorrência ${r.numero}`,
  antesDeCriar: async (valores) => ({
    ...valores,
    numero: valores.numero || (await proximoNumero(schema.ocorrencias, "OCO")),
  }),
  entrada: z.object({
    numero: txt,
    dataHora: dataOpc,
    tipo: z.string(),
    natureza: txt,
    prioridade: z.string(),
    status: z.string(),
    endereco: txt,
    bairro: txt,
    zona: txt,
    latitude: num,
    longitude: num,
    denunciante: txt,
    denuncianteTelefone: txt,
    vitima: txt,
    envolvidos: txt,
    descricao: txt,
    providencias: txt,
    observacoes: txt,
    anexos: txt,
    responsavelId: num,
    viaturaId: num,
    atendimentoId: num,
    encerradoEm: dataOpc,
  }),
});

/* --------------------------------------------------- ATIVIDADES OPERACIONAIS */

export const atividades = criarCrud({
  modulo: "atividades",
  tabela: schema.atividades,
  camposBusca: ["titulo", "codigo", "local", "equipe", "descricao"],
  ordenarPor: "inicioPrevisto",
  campoPeriodo: "inicioPrevisto",
  entrada: z.object({
    codigo: txt,
    titulo: z.string().min(1),
    tipo: z.string(),
    prioridade: z.string(),
    status: z.string(),
    inicioPrevisto: dataOpc,
    fimPrevisto: dataOpc,
    local: txt,
    equipe: txt,
    responsavelId: num,
    viaturaId: num,
    progresso: num,
    descricao: txt,
    resultado: txt,
  }),
});

/* ------------------------------- APOIOS E ATIVIDADES INSTITUCIONAIS */

export const apoios = criarCrud({
  modulo: "apoios",
  tabela: schema.apoios,
  camposBusca: ["nomeEvento", "local", "solicitante", "observacoes"],
  ordenarPor: "dataHora",
  campoPeriodo: "dataHora",
  rotulo: (r) => `apoio "${r.nomeEvento}"`,
  entrada: z.object({
    nomeEvento: z.string().min(1),
    tipo: z.string(),
    dataHora: dataOpc,
    dataFim: dataOpc,
    local: txt,
    solicitante: txt,
    orgaoId: num,
    publicoEstimado: num,
    efetivoNecessario: num,
    equipes: txt,
    viaturas: txt,
    status: z.string(),
    briefing: txt,
    relatorioPos: txt,
    observacoes: txt,
  }),
});

/* ---------------------------------------------------------------------- EVENTOS */

export const eventos = criarCrud({
  modulo: "eventos",
  tabela: schema.eventos,
  camposBusca: ["titulo", "local", "responsavel", "descricao"],
  ordenarPor: "inicio",
  campoPeriodo: "inicio",
  entrada: z.object({
    titulo: z.string().min(1),
    categoria: z.string(),
    inicio: z.coerce.date(),
    fim: dataOpc,
    local: txt,
    responsavel: txt,
    publicoAlvo: txt,
    descricao: txt,
    status: z.string(),
  }),
});

/* -------------------------------------------------------------------- OPERAÇÕES */

export const operacoes = criarCrud({
  modulo: "operacoes",
  tabela: schema.operacoes,
  camposBusca: ["nome", "comandante", "areaAtuacao", "objetivo"],
  ordenarPor: "inicio",
  campoPeriodo: "inicio",
  entrada: z.object({
    nome: z.string().min(1),
    tipo: z.string(),
    inicio: dataOpc,
    fim: dataOpc,
    status: z.string(),
    comandante: txt,
    efetivoEmpregado: num,
    viaturasEmpregadas: num,
    orgaosApoio: txt,
    areaAtuacao: txt,
    objetivo: txt,
    resultado: txt,
  }),
});

/* ----------------------------------------------------------------------- RONDAS */

export const rondas = criarCrud({
  modulo: "rondas",
  tabela: schema.rondas,
  camposBusca: ["localidade", "roteiro", "equipe", "observacoes"],
  ordenarPor: "data",
  campoPeriodo: "data",
  rotulo: (r) => `ronda em ${r.localidade ?? "localidade não informada"}`,
  entrada: z.object({
    data: z.coerce.date(),
    horaInicio: txt,
    horaFim: txt,
    turno: z.string(),
    agenteId: num,
    equipe: txt,
    viaturaId: num,
    localidade: txt,
    roteiro: txt,
    pontosVerificacao: txt,
    kmInicial: num,
    kmFinal: num,
    incidentes: txt,
    status: z.string(),
    observacoes: txt,
  }),
});

/* ------------------------------------------------- ZONAS (mapa operacional) */

export const zonas = criarCrud({
  modulo: "mapa",
  tabela: schema.zonas,
  camposBusca: ["nome", "responsavel", "observacoes"],
  ordenarPor: "nome",
  entrada: z.object({
    nome: z.string().min(1),
    tipo: z.string(),
    cor: z.string(),
    latitude: num,
    longitude: num,
    raioMetros: num,
    responsavel: txt,
    observacoes: txt,
  }),
});

/** Agregado do domínio operacional — composto no router. */
export const operacional = {
  atendimentos,
  ocorrencias,
  atividades,
  apoios,
  eventos,
  operacoes,
  rondas,
  zonas,
};
