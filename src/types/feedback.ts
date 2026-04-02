export type FeedbackType = 'bug' | 'melhoria' | 'nova_funcionalidade';

export type FeedbackArea = 
  | 'Jira Suggestions' 
  | 'BDD Generator' 
  | 'K6 Generator' 
  | 'Base de Conhecimento' 
  | 'Consultora QA' 
  | 'Auth' 
  | 'Dashboard' 
  | 'Configurações' 
  | 'Geral';

export type FeedbackStatus = 
  | 'novo' 
  | 'em_analise' 
  | 'planejado' 
  | 'em_andamento' 
  | 'concluido' 
  | 'mesclado';

export interface Feedback {
  id: string;
  tipo: FeedbackType;
  area: FeedbackArea;
  titulo: string;
  descricao: string;
  status: FeedbackStatus;
  votos: number;
  votedBy: string[]; // IDs dos usuários que votaram
  criadoPor: string;
  criadoEm: Date;
  mescladoEm?: string; // ID do feedback principal
}

export interface FeedbackGroup {
  id: string;
  feedbackIds: string[];
  similarity: 'alta' | 'media';
  ignored: boolean;
}

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug',
  melhoria: 'Melhoria de UX',
  nova_funcionalidade: 'Nova Funcionalidade',
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  novo: 'Novo',
  em_analise: 'Em Análise',
  planejado: 'Planejado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  mesclado: 'Mesclado',
};

export const FEEDBACK_AREAS: FeedbackArea[] = [
  'Jira Suggestions',
  'BDD Generator',
  'K6 Generator',
  'Base de Conhecimento',
  'Consultora QA',
  'Auth',
  'Dashboard',
  'Configurações',
  'Geral',
];
