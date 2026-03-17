export interface Aluno {
  id: string;
  nome: string;
  turma: string;
  responsavel_nome?: string;
  responsavel_telefone?: string;
  responsavel_email?: string;
  proibido_saida?: boolean;
}

export interface ActiveExit {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  destino: string;
  startTime: number;
  professor: string;
  autorRole: string;
  isEmergency: boolean;
}

export interface SaidasQueueItem {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  destino: string;
  timestamp: number;
}

export interface HistoryRecord {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  categoria: 'saida' | 'ocorrencia' | 'merito' | 'atraso' | 'coordenação' | 'medida' | 'avaliacao_aula' | 'frequencia';
  detalhe: string;
  timestamp: string;
  rawTimestamp: number;
  professor: string;
  autorRole?: string;
  fotoUrl?: string | null;
}

export interface CoordinationItem {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  motivo: string;
  timestamp: string;
  professor: string;
  fotoUrl?: string | null;
}

export interface LibraryItem {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  timestamp: string;
  professorCoord: string;
  obsCoord: string;
  fotoUrl?: string | null;
}

export interface Suspension {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  returnDate: string;
  timestamp: string;
}

export interface Aviso {
  id: string;
  texto: string;
  autor: string;
  timestamp: string;
  rawTimestamp: number;
}

export interface AppConfig {
  autoBlocks: { start: string; end: string; label: string }[];
  exitLimitMinutes: number;
  passwords: { admin: string; professor: string; apoio: string; parent?: string };
}

export type UserRole = 'admin' | 'professor' | 'aluno' | 'parent';

export interface AuthState {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  linkedStudentName?: string;
}

export interface Frequencia {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  data: string;
  period: '8h' | '14h';
  status: 'P' | 'A';
  justificativa?: string;
  professor?: string;
  timestamp: string;
  rawTimestamp: number;
}
