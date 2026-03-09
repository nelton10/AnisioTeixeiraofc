import { supabase } from './supabase';
import { Aluno, ActiveExit, HistoryRecord, CoordinationItem, LibraryItem, Suspension, Aviso, AppConfig } from '@/types';

const STORAGE_KEYS = {
  AUTH: 'anisio_auth',
} as const;

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Helper to log errors
async function handleResponse(promise: any, actionName: string) {
  const response = await promise;
  if (response.error) {
    console.error(`Supabase Error [${actionName}]:`, response.error.message, response.error.details);
    throw new Error(response.error.message);
  }
  return response.data;
}

// Config
export async function getConfig(): Promise<AppConfig & { alunosList: Aluno[] }> {
  const defaultConfig: AppConfig = {
    autoBlocks: [],
    exitLimitMinutes: 15,
    passwords: { admin: 'gestao', professor: 'prof', apoio: 'apoio' },
  };

  try {
    const configRow = await handleResponse(
      supabase.from('config').select('data').eq('id', 'app_config').single(),
      'getConfigRow'
    ).catch(() => null);

    const alunosResponse = await supabase.from('alumnos').select('*').order('nome', { ascending: true });
    if (alunosResponse.error) {
      console.error('Supabase Error [getAlunos]:', alunosResponse.error.message, alunosResponse.error.details);
    }
    const AlunosData: Aluno[] = alunosResponse.data || [];

    const configData = configRow?.data || defaultConfig;
    return { ...configData, alunosList: AlunosData };
  } catch (error) {
    console.error("Error in getConfig:", error);
    return { ...defaultConfig, alunosList: [] };
  }
}

export async function saveConfig(data: Partial<AppConfig>) {
  const current = await handleResponse(
    supabase.from('config').select('data').eq('id', 'app_config').single(),
    'getConfigForUpdate'
  ).catch(() => null);

  const newValue = { ...(current?.data || {}), ...data };
  delete (newValue as any).alunosList;

  await handleResponse(
    supabase.from('config').upsert({ id: 'app_config', data: newValue }),
    'upsertConfig'
  );
}

// Alunos
export async function addAluno(aluno: Omit<Aluno, 'id'> & { id?: string }) {
  const id = aluno.id || generateId();
  await handleResponse(
    supabase.from('alumnos').insert([{ ...aluno, id }]),
    'addAluno'
  );
}

export async function updateAluno(id: string, data: Partial<Aluno>) {
  await handleResponse(
    supabase.from('alumnos').update(data).eq('id', id),
    'updateAluno'
  );
}

export async function deleteAlunos(ids: string[]) {
  await handleResponse(
    supabase.from('alumnos').delete().in('id', ids),
    'deleteAlunos'
  );
}

export async function deleteAlunosByTurma(turma: string) {
  await handleResponse(
    supabase.from('alumnos').delete().eq('turma', turma),
    'deleteAlunosByTurma'
  );
}

// Active Exits
export async function getActiveExits(): Promise<ActiveExit[]> {
  const data = await handleResponse(
    supabase.from('active_exits').select('*'),
    'getActiveExits'
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id,
    alunoId: r.aluno_id,
    alunoNome: r.aluno_nome,
    turma: r.turma,
    destino: r.destino,
    startTime: r.start_time,
    professor: r.professor,
    autorRole: r.autor_role,
    isEmergency: r.is_emergency
  }));
}

export async function addActiveExit(exit: ActiveExit) {
  const dbItem = {
    id: exit.id,
    aluno_id: exit.alunoId,
    aluno_nome: exit.alunoNome,
    turma: exit.turma,
    destino: exit.destino,
    start_time: exit.startTime,
    professor: exit.professor,
    autor_role: exit.autorRole,
    is_emergency: exit.isEmergency
  };
  await handleResponse(
    supabase.from('active_exits').insert([dbItem]),
    'addActiveExit'
  );
}

export async function removeActiveExit(id: string) {
  await handleResponse(
    supabase.from('active_exits').delete().eq('id', id),
    'removeActiveExit'
  );
}

// History
export async function getHistory(): Promise<HistoryRecord[]> {
  const data = await handleResponse(
    supabase.from('history').select('*').order('raw_timestamp', { ascending: false }),
    'getHistory'
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id,
    alunoId: r.aluno_id,
    alunoNome: r.aluno_nome,
    turma: r.turma,
    categoria: r.categoria,
    detalhe: r.detalhe,
    timestamp: r.timestamp,
    rawTimestamp: r.raw_timestamp,
    professor: r.professor,
    autorRole: r.autor_role,
    fotoUrl: r.foto_url
  }));
}

export async function addHistoryRecord(record: HistoryRecord) {
  const dbRecord = {
    id: record.id,
    aluno_id: record.alunoId,
    aluno_nome: record.alunoNome,
    turma: record.turma,
    categoria: record.categoria,
    detalhe: record.detalhe,
    raw_timestamp: record.rawTimestamp,
    professor: record.professor,
    autor_role: record.autorRole,
    foto_url: record.fotoUrl
  };
  await handleResponse(
    supabase.from('history').insert([dbRecord]),
    'addHistoryRecord'
  );
}

export async function updateHistoryRecord(id: string, data: Partial<HistoryRecord>) {
  const dbData: any = { ...data };
  if (data.alunoId) dbData.aluno_id = data.alunoId;
  if (data.alunoNome) dbData.aluno_nome = data.alunoNome;
  if (data.rawTimestamp) dbData.raw_timestamp = data.rawTimestamp;
  if (data.autorRole) dbData.autor_role = data.autorRole;
  if (data.fotoUrl) dbData.foto_url = data.fotoUrl;

  delete dbData.alunoId;
  delete dbData.alunoNome;
  delete dbData.rawTimestamp;
  delete dbData.autorRole;
  delete dbData.fotoUrl;

  await handleResponse(
    supabase.from('history').update(dbData).eq('id', id),
    'updateHistoryRecord'
  );
}

export async function deleteHistoryRecord(id: string) {
  await handleResponse(
    supabase.from('history').delete().eq('id', id),
    'deleteHistoryRecord'
  );
}

// Coordination Queue
export async function getCoordinationQueue(): Promise<CoordinationItem[]> {
  const data = await handleResponse(
    supabase.from('coordination_queue').select('*'),
    'getCoordinationQueue'
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id,
    alunoId: r.aluno_id,
    alunoNome: r.aluno_nome,
    turma: r.turma,
    motivo: r.motivo,
    timestamp: r.timestamp,
    professor: r.professor,
    fotoUrl: r.foto_url
  }));
}

export async function addCoordinationItem(item: CoordinationItem) {
  const dbItem = {
    id: item.id,
    aluno_id: item.alunoId,
    aluno_nome: item.alunoNome,
    turma: item.turma,
    motivo: item.motivo,
    professor: item.professor,
    foto_url: item.fotoUrl,
    timestamp: item.timestamp
  };
  await handleResponse(
    supabase.from('coordination_queue').insert([dbItem]),
    'addCoordinationItem'
  );
}

export async function removeCoordinationItem(id: string) {
  await handleResponse(
    supabase.from('coordination_queue').delete().eq('id', id),
    'removeCoordinationItem'
  );
}

// Library Queue
export async function getLibraryQueue(): Promise<LibraryItem[]> {
  const data = await handleResponse(
    supabase.from('library_queue').select('*'),
    'getLibraryQueue'
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id,
    alunoId: r.aluno_id,
    alunoNome: r.aluno_nome,
    turma: r.turma,
    timestamp: r.timestamp,
    professorCoord: r.professor_coord,
    obsCoord: r.obs_coord,
    fotoUrl: r.foto_url
  }));
}

export async function addLibraryItem(item: LibraryItem) {
  const dbItem = {
    id: item.id,
    aluno_id: item.alunoId,
    aluno_nome: item.alunoNome,
    turma: item.turma,
    professor_coord: item.professorCoord,
    obs_coord: item.obsCoord,
    foto_url: item.fotoUrl,
    timestamp: item.timestamp
  };
  await handleResponse(
    supabase.from('library_queue').insert([dbItem]),
    'addLibraryItem'
  );
}

export async function removeLibraryItem(id: string) {
  await handleResponse(
    supabase.from('library_queue').delete().eq('id', id),
    'removeLibraryItem'
  );
}

// Suspensions
export async function getSuspensions(): Promise<Suspension[]> {
  const data = await handleResponse(
    supabase.from('suspensions').select('*'),
    'getSuspensions'
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id,
    alunoId: r.aluno_id,
    alunoNome: r.aluno_nome,
    turma: r.turma,
    returnDate: r.return_date,
    timestamp: r.timestamp
  }));
}

export async function addSuspension(s: Suspension) {
  const dbS = {
    id: s.id,
    aluno_id: s.alunoId,
    aluno_nome: s.alunoNome,
    turma: s.turma,
    return_date: s.returnDate
  };
  await handleResponse(
    supabase.from('suspensions').insert([dbS]),
    'addSuspension'
  );
}

export async function removeSuspension(id: string) {
  await handleResponse(
    supabase.from('suspensions').delete().eq('id', id),
    'removeSuspension'
  );
}

// Avisos
export async function getAvisos(): Promise<Aviso[]> {
  const data = await handleResponse(
    supabase.from('avisos').select('*').order('raw_timestamp', { ascending: false }),
    'getAvisos'
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id,
    texto: r.texto,
    autor: r.autor,
    timestamp: r.timestamp,
    rawTimestamp: r.raw_timestamp
  }));
}

export async function addAviso(a: Aviso) {
  const dbA = {
    id: a.id,
    texto: a.texto,
    autor: a.autor,
    raw_timestamp: a.rawTimestamp
  };
  await handleResponse(
    supabase.from('avisos').insert([dbA]),
    'addAviso'
  );
}

export async function removeAviso(id: string) {
  await handleResponse(
    supabase.from('avisos').delete().eq('id', id),
    'removeAviso'
  );
}


// Auth
export function getSavedAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveAuth(role: string, name: string) {
  try { localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ role, name })); } catch { }
}

export function clearAuth() {
  try { localStorage.removeItem(STORAGE_KEYS.AUTH); } catch { }
}

