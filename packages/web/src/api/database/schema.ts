import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * SIG-GCMI — esquema do banco.
 * Modelado em Drizzle ORM (SQLite/Turso hoje), com tipos e relacionamentos
 * equivalentes aos de PostgreSQL para permitir a migração posterior do banco
 * para um servidor Postgres sem reescrever a aplicação.
 * Aplicar com `bun run db:push` (em packages/web).
 */

const now = () => new Date();

const timestamps = {
  criadoEm: integer("criado_em", { mode: "timestamp" }).notNull().$defaultFn(now),
  atualizadoEm: integer("atualizado_em", { mode: "timestamp" }).notNull().$defaultFn(now),
};

/* ------------------------------------------------------------------ SISTEMA */

export const usuarios = sqliteTable(
  "usuarios",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    login: text("login").notNull(),
    senhaHash: text("senha_hash").notNull(),
    email: text("email"),
    perfil: text("perfil").notNull().default("operador"), // admin | supervisor | operador | consulta
    permissoes: text("permissoes", { mode: "json" }).$type<Record<string, string>>(),
    agenteId: integer("agente_id"),
    status: text("status").notNull().default("Ativo"), // Ativo | Inativo | Bloqueado
    telefone: text("telefone"),
    ultimoAcesso: integer("ultimo_acesso", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("usuarios_login_idx").on(t.login)],
);

export const sessoes = sqliteTable(
  "sessoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    token: text("token").notNull(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    origem: text("origem").notNull().default("web"), // web | apk
    expiraEm: integer("expira_em", { mode: "timestamp" }).notNull(),
    criadoEm: integer("criado_em", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("sessoes_token_idx").on(t.token), index("sessoes_usuario_idx").on(t.usuarioId)],
);

export const auditoria = sqliteTable(
  "auditoria",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    usuarioId: integer("usuario_id"),
    usuarioNome: text("usuario_nome"),
    acao: text("acao").notNull(), // criar | editar | excluir | login | login_falho | logout | backup | restauracao
    modulo: text("modulo").notNull(),
    registroId: integer("registro_id"),
    descricao: text("descricao"),
    dadosAnteriores: text("dados_anteriores"),
    dadosNovos: text("dados_novos"),
    ip: text("ip"),
    criadoEm: integer("criado_em", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (t) => [index("auditoria_modulo_idx").on(t.modulo), index("auditoria_criado_idx").on(t.criadoEm)],
);

export const configuracoes = sqliteTable(
  "configuracoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chave: text("chave").notNull(),
    valor: text("valor"),
    grupo: text("grupo").notNull().default("geral"),
    descricao: text("descricao"),
    atualizadoEm: integer("atualizado_em", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("configuracoes_chave_idx").on(t.chave)],
);

export const backups = sqliteTable("backups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("Manual"), // Manual | Diário | Semanal | Mensal
  escopo: text("escopo").notNull().default("Completo"),
  status: text("status").notNull().default("Concluído"), // Concluído | Em andamento | Falhou
  local: text("local").notNull().default("Servidor local"),
  tamanhoKb: integer("tamanho_kb"),
  registros: integer("registros"),
  conteudo: text("conteudo"),
  observacoes: text("observacoes"),
  criadoPor: text("criado_por"),
  ...timestamps,
});

/* -------------------------------------------------------------- OPERACIONAL */

export const atendimentos = sqliteTable(
  "atendimentos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    protocolo: text("protocolo").notNull(),
    dataHora: integer("data_hora", { mode: "timestamp" }).notNull().$defaultFn(now),
    duracaoSegundos: integer("duracao_segundos"),
    tipo: text("tipo").notNull().default("Informação"), // Ocorrência | Informação | Solicitação | Denúncia | Trote
    canal: text("canal").notNull().default("153"),
    situacao: text("situacao").notNull().default("Aberta"), // Aberta | Em andamento | Finalizada | Perdida
    solicitanteNome: text("solicitante_nome"),
    solicitanteTelefone: text("solicitante_telefone"),
    endereco: text("endereco"),
    bairro: text("bairro"),
    descricao: text("descricao"),
    acoes: text("acoes"),
    atendenteId: integer("atendente_id"),
    ocorrenciaId: integer("ocorrencia_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("atendimentos_protocolo_idx").on(t.protocolo),
    index("atendimentos_data_idx").on(t.dataHora),
    index("atendimentos_situacao_idx").on(t.situacao),
  ],
);

export const ocorrencias = sqliteTable(
  "ocorrencias",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    numero: text("numero").notNull(),
    dataHora: integer("data_hora", { mode: "timestamp" }).notNull().$defaultFn(now),
    tipo: text("tipo").notNull().default("Perturbação do sossego"),
    natureza: text("natureza"),
    prioridade: text("prioridade").notNull().default("Média"), // Baixa | Média | Alta | Crítica
    status: text("status").notNull().default("Aberta"), // Aberta | Em andamento | Encerrada | Suspeita
    endereco: text("endereco"),
    bairro: text("bairro"),
    zona: text("zona"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    denunciante: text("denunciante"),
    denuncianteTelefone: text("denunciante_telefone"),
    vitima: text("vitima"),
    envolvidos: text("envolvidos"),
    descricao: text("descricao"),
    providencias: text("providencias"),
    observacoes: text("observacoes"),
    anexos: text("anexos"),
    responsavelId: integer("responsavel_id"),
    viaturaId: integer("viatura_id"),
    atendimentoId: integer("atendimento_id"),
    encerradoEm: integer("encerrado_em", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ocorrencias_numero_idx").on(t.numero),
    index("ocorrencias_data_idx").on(t.dataHora),
    index("ocorrencias_status_idx").on(t.status),
    index("ocorrencias_tipo_idx").on(t.tipo),
  ],
);

export const atividades = sqliteTable(
  "atividades",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    codigo: text("codigo"),
    titulo: text("titulo").notNull(),
    tipo: text("tipo").notNull().default("Patrulhamento"), // Patrulhamento | Fiscalização | Investigação | Intervenção | Prevenção
    prioridade: text("prioridade").notNull().default("Média"),
    status: text("status").notNull().default("Planejada"), // Planejada | Em execução | Concluída | Cancelada
    inicioPrevisto: integer("inicio_previsto", { mode: "timestamp" }),
    fimPrevisto: integer("fim_previsto", { mode: "timestamp" }),
    local: text("local"),
    equipe: text("equipe"),
    responsavelId: integer("responsavel_id"),
    viaturaId: integer("viatura_id"),
    progresso: integer("progresso").notNull().default(0),
    descricao: text("descricao"),
    resultado: text("resultado"),
    ...timestamps,
  },
  (t) => [index("atividades_status_idx").on(t.status)],
);

export const apoios = sqliteTable("apoios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nomeEvento: text("nome_evento").notNull(),
  tipo: text("tipo").notNull().default("Evento público"), // Evento público | Manifestação | Festa | Show | Escolar | Religioso | Outro
  dataHora: integer("data_hora", { mode: "timestamp" }),
  dataFim: integer("data_fim", { mode: "timestamp" }),
  local: text("local"),
  solicitante: text("solicitante"),
  orgaoId: integer("orgao_id"),
  publicoEstimado: integer("publico_estimado"),
  efetivoNecessario: integer("efetivo_necessario"),
  equipes: text("equipes"),
  viaturas: text("viaturas"),
  status: text("status").notNull().default("Solicitado"), // Solicitado | Aprovado | Em execução | Concluído | Negado
  latitude: real("latitude"),
  longitude: real("longitude"),
  briefing: text("briefing"),
  relatorioPos: text("relatorio_pos"),
  observacoes: text("observacoes"),
  ...timestamps,
});

export const eventos = sqliteTable("eventos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titulo: text("titulo").notNull(),
  categoria: text("categoria").notNull().default("Institucional"), // Treinamento | Reunião | Evento público | Data comemorativa | Folga institucional | Institucional
  inicio: integer("inicio", { mode: "timestamp" }).notNull().$defaultFn(now),
  fim: integer("fim", { mode: "timestamp" }),
  local: text("local"),
  responsavel: text("responsavel"),
  publicoAlvo: text("publico_alvo"),
  descricao: text("descricao"),
  status: text("status").notNull().default("Confirmado"), // Confirmado | Previsto | Cancelado | Realizado
  latitude: real("latitude"),
  longitude: real("longitude"),
  ...timestamps,
});

export const operacoes = sqliteTable("operacoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("Ordinária"), // Ordinária | Especial | Integrada | Preventiva | Emergencial
  inicio: integer("inicio", { mode: "timestamp" }),
  fim: integer("fim", { mode: "timestamp" }),
  status: text("status").notNull().default("Planejada"), // Planejada | Em andamento | Encerrada | Cancelada
  comandante: text("comandante"),
  efetivoEmpregado: integer("efetivo_empregado"),
  viaturasEmpregadas: integer("viaturas_empregadas"),
  orgaosApoio: text("orgaos_apoio"),
  areaAtuacao: text("area_atuacao"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  objetivo: text("objetivo"),
  resultado: text("resultado"),
  ...timestamps,
});

export const rondas = sqliteTable(
  "rondas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    data: integer("data", { mode: "timestamp" }).notNull().$defaultFn(now),
    horaInicio: text("hora_inicio"),
    horaFim: text("hora_fim"),
    turno: text("turno").notNull().default("Manhã"), // Manhã | Tarde | Noite | Extra
    agenteId: integer("agente_id"),
    equipe: text("equipe"),
    viaturaId: integer("viatura_id"),
    localidade: text("localidade"),
    roteiro: text("roteiro"),
    pontosVerificacao: text("pontos_verificacao"),
    kmInicial: integer("km_inicial"),
    kmFinal: integer("km_final"),
    incidentes: text("incidentes"),
    status: text("status").notNull().default("Planejada"), // Planejada | Em execução | Concluída | Interrompida
    observacoes: text("observacoes"),
    ...timestamps,
  },
  (t) => [index("rondas_data_idx").on(t.data)],
);

export const zonas = sqliteTable("zonas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("Zona"), // Zona | Distrito | Setor | Área de risco
  cor: text("cor").notNull().default("#E8B430"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  raioMetros: integer("raio_metros").notNull().default(600),
  responsavel: text("responsavel"),
  observacoes: text("observacoes"),
  ...timestamps,
});

/* ------------------------------------------------------------ ADMINISTRATIVO */

export const agentes = sqliteTable(
  "agentes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matricula: text("matricula").notNull(),
    nome: text("nome").notNull(),
    nomeGuerra: text("nome_guerra"),
    cpf: text("cpf"),
    rg: text("rg"),
    dataNascimento: integer("data_nascimento", { mode: "timestamp" }),
    cargo: text("cargo").notNull().default("Agente"), // Comandante | Subcomandante | Inspetor | Subinspetor | Agente
    setor: text("setor").notNull().default("Operacional"),
    status: text("status").notNull().default("Ativo"), // Ativo | Férias | Licença | Afastado | Inativo
    telefone: text("telefone"),
    email: text("email"),
    endereco: text("endereco"),
    dataAdmissao: integer("data_admissao", { mode: "timestamp" }),
    qualificacoes: text("qualificacoes"),
    certificacoes: text("certificacoes"),
    fotoUrl: text("foto_url"),
    observacoes: text("observacoes"),
    ...timestamps,
  },
  (t) => [uniqueIndex("agentes_matricula_idx").on(t.matricula), index("agentes_status_idx").on(t.status)],
);

export const escalas = sqliteTable(
  "escalas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    data: integer("data", { mode: "timestamp" }).notNull().$defaultFn(now),
    turno: text("turno").notNull().default("Manhã (07h-13h)"),
    tipo: text("tipo").notNull().default("Normal"), // Normal | Extra | Repouso | Férias | Licença
    agenteId: integer("agente_id"),
    funcao: text("funcao"),
    viaturaId: integer("viatura_id"),
    setor: text("setor"),
    status: text("status").notNull().default("Prevista"), // Prevista | Confirmada | Cumprida | Falta
    observacoes: text("observacoes"),
    ...timestamps,
  },
  (t) => [index("escalas_data_idx").on(t.data), index("escalas_agente_idx").on(t.agenteId)],
);

export const viaturas = sqliteTable(
  "viaturas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    prefixo: text("prefixo"),
    placa: text("placa").notNull(),
    modelo: text("modelo"),
    marca: text("marca"),
    ano: integer("ano"),
    cor: text("cor"),
    tipo: text("tipo").notNull().default("Automóvel"), // Automóvel | Motocicleta | Caminhonete | Van | Bicicleta
    quilometragem: integer("quilometragem"),
    status: text("status").notNull().default("Operacional"), // Operacional | Manutenção | Indisponível | Desativada
    responsavelId: integer("responsavel_id"),
    equipamentos: text("equipamentos"),
    combustivel: text("combustivel"),
    ultimaManutencao: integer("ultima_manutencao", { mode: "timestamp" }),
    proximaManutencao: integer("proxima_manutencao", { mode: "timestamp" }),
    latitude: real("latitude"),
    longitude: real("longitude"),
    observacoes: text("observacoes"),
    ...timestamps,
  },
  (t) => [uniqueIndex("viaturas_placa_idx").on(t.placa)],
);

export const manutencoes = sqliteTable("manutencoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  viaturaId: integer("viatura_id"),
  tipo: text("tipo").notNull().default("Preventiva"), // Preventiva | Corretiva | Sinistro | Revisão
  data: integer("data", { mode: "timestamp" }).notNull().$defaultFn(now),
  quilometragem: integer("quilometragem"),
  oficina: text("oficina"),
  custo: real("custo"),
  descricao: text("descricao"),
  status: text("status").notNull().default("Concluída"), // Agendada | Em execução | Concluída
  ...timestamps,
});

export const orgaos = sqliteTable("orgaos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("Outros"), // Polícia Militar | Polícia Civil | Bombeiros | SAMU | Saúde | Assistência Social | Prefeitura | Ministério Público | Outros
  responsavel: text("responsavel"),
  telefone: text("telefone"),
  telefoneEmergencia: text("telefone_emergencia"),
  email: text("email"),
  endereco: text("endereco"),
  convenio: text("convenio"),
  vigenciaConvenio: integer("vigencia_convenio", { mode: "timestamp" }),
  observacoes: text("observacoes"),
  ...timestamps,
});

/* ----------------------------------------------------------------- RELATÓRIOS */

export const relatorios = sqliteTable("relatorios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("Ocorrências"), // Ocorrências | Atendimentos | Atividades | Efetivo | Viaturas | Rondas | Consolidado
  periodicidade: text("periodicidade").notNull().default("Ad-hoc"), // Diário | Semanal | Mensal | Anual | Ad-hoc
  periodoInicio: integer("periodo_inicio", { mode: "timestamp" }),
  periodoFim: integer("periodo_fim", { mode: "timestamp" }),
  formato: text("formato").notNull().default("CSV"), // CSV | PDF | Excel
  filtros: text("filtros"),
  totalRegistros: integer("total_registros"),
  geradoPor: text("gerado_por"),
  observacoes: text("observacoes"),
  ...timestamps,
});

export const indicadores = sqliteTable("indicadores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  categoria: text("categoria").notNull().default("Operacional"),
  descricao: text("descricao"),
  unidade: text("unidade").notNull().default("un"),
  meta: real("meta"),
  valorAtual: real("valor_atual"),
  sentido: text("sentido").notNull().default("Maior é melhor"), // Maior é melhor | Menor é melhor
  periodicidade: text("periodicidade").notNull().default("Mensal"),
  responsavel: text("responsavel"),
  status: text("status").notNull().default("Ativo"), // Ativo | Inativo
  ...timestamps,
});
