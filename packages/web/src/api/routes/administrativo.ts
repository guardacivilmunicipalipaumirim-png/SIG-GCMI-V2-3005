import { z } from "zod";
import * as schema from "../database/schema";
import { criarCrud } from "../lib/crud";

const dataOpc = z.coerce.date().nullish();
const txt = z.string().nullish();
const num = z.number().nullish();

/* ---------------------------------------------------------------------- EFETIVO */

export const efetivo = criarCrud({
  modulo: "efetivo",
  tabela: schema.agentes,
  camposBusca: ["nome", "nomeGuerra", "matricula", "cpf", "cargo", "setor", "telefone"],
  ordenarPor: "nome",
  entrada: z.object({
    matricula: z.string().min(1),
    nome: z.string().min(1),
    nomeGuerra: txt,
    cpf: txt,
    rg: txt,
    dataNascimento: dataOpc,
    cargo: z.string(),
    setor: z.string(),
    status: z.string(),
    telefone: txt,
    email: txt,
    endereco: txt,
    dataAdmissao: dataOpc,
    qualificacoes: txt,
    certificacoes: txt,
    fotoUrl: txt,
    observacoes: txt,
  }),
});

/* ---------------------------------------------------------------------- ESCALAS */

export const escalas = criarCrud({
  modulo: "escalas",
  tabela: schema.escalas,
  camposBusca: ["turno", "funcao", "setor", "observacoes"],
  ordenarPor: "data",
  campoPeriodo: "data",
  rotulo: (r) => `escala de ${new Date(r.data).toLocaleDateString("pt-BR")} (${r.turno})`,
  entrada: z.object({
    data: z.coerce.date(),
    turno: z.string(),
    tipo: z.string(),
    agenteId: num,
    funcao: txt,
    viaturaId: num,
    setor: txt,
    status: z.string(),
    observacoes: txt,
  }),
});

/* --------------------------------------------------------------------- VIATURAS */

export const viaturas = criarCrud({
  modulo: "viaturas",
  tabela: schema.viaturas,
  camposBusca: ["placa", "prefixo", "modelo", "marca", "observacoes"],
  ordenarPor: "prefixo",
  rotulo: (r) => `viatura ${r.prefixo ?? r.placa}`,
  entrada: z.object({
    prefixo: txt,
    placa: z.string().min(1),
    modelo: txt,
    marca: txt,
    ano: num,
    cor: txt,
    tipo: z.string(),
    quilometragem: num,
    status: z.string(),
    responsavelId: num,
    equipamentos: txt,
    combustivel: txt,
    ultimaManutencao: dataOpc,
    proximaManutencao: dataOpc,
    latitude: num,
    longitude: num,
    observacoes: txt,
  }),
});

export const manutencoes = criarCrud({
  modulo: "viaturas",
  tabela: schema.manutencoes,
  camposBusca: ["oficina", "descricao"],
  ordenarPor: "data",
  campoPeriodo: "data",
  rotulo: (r) => `manutenção ${r.tipo}`,
  entrada: z.object({
    viaturaId: num,
    tipo: z.string(),
    data: z.coerce.date(),
    quilometragem: num,
    oficina: txt,
    custo: num,
    descricao: txt,
    status: z.string(),
  }),
});

/* ------------------------------------------------------------- ÓRGÃOS/ENTIDADES */

export const orgaos = criarCrud({
  modulo: "orgaos",
  tabela: schema.orgaos,
  camposBusca: ["nome", "responsavel", "telefone", "email", "endereco"],
  ordenarPor: "nome",
  entrada: z.object({
    nome: z.string().min(1),
    tipo: z.string(),
    responsavel: txt,
    telefone: txt,
    telefoneEmergencia: txt,
    email: txt,
    endereco: txt,
    convenio: txt,
    vigenciaConvenio: dataOpc,
    observacoes: txt,
  }),
});

/** Agregado do domínio administrativo — composto no router. */
export const administrativo = { efetivo, escalas, viaturas, manutencoes, orgaos };
