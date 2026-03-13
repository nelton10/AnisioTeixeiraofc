import { supabase } from './supabase';
import { Aluno, ActiveExit, HistoryRecord, CoordinationItem, LibraryItem, Suspension, Aviso, AppConfig } from '@/types';
import { toast } from 'sonner';

const STORAGE_KEYS = {
  AUTH: 'anisio_auth',
  OFFLINE_MUTATIONS: 'anisio_mutations',
  CACHE_CONFIG: 'cache_config',
  CACHE_ALUNOS: 'cache_alunos',
  CACHE_EXITS: 'cache_exits',
  CACHE_HISTORY: 'cache_history',
  CACHE_COORD: 'cache_coord',
  CACHE_LIB: 'cache_lib',
  CACHE_SUSP: 'cache_susp',
  CACHE_AVISOS: 'cache_avisos'
} as const;

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ----------------- PWA OFFLINE SYNC -----------------

interface OfflineMutation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete' | 'deleteIn';
  payload?: any;
  matchField?: string;
  matchValue?: any;
}

function queueMutation(mutation: Omit<OfflineMutation, 'id'>) {
  try {
    const q: OfflineMutation[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_MUTATIONS) || '[]');
    q.push({ ...mutation, id: Date.now().toString() });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_MUTATIONS, JSON.stringify(q));
    toast.warning("Modo Offline", { description: "Salvando localmente. Sincronizará quando a internet voltar." });
  } catch (e) { }
}

export async function syncOfflineQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const q: OfflineMutation[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_MUTATIONS) || '[]');
  if (!q.length) return;

  const remaining: OfflineMutation[] = [];
  let syncedCount = 0;

  for (const mut of q) {
    try {
      let query = supabase.from(mut.table);
      if (mut.action === 'insert') await query.insert(mut.payload);
      else if (mut.action === 'update') await query.update(mut.payload).eq(mut.matchField!, mut.matchValue);
      else if (mut.action === 'delete') await query.delete().eq(mut.matchField!, mut.matchValue);
      else if (mut.action === 'deleteIn') await query.delete().in(mut.matchField!, mut.matchValue);
      syncedCount++;
    } catch (e: any) {
      remaining.push(mut);
    }
  }

  localStorage.setItem(STORAGE_KEYS.OFFLINE_MUTATIONS, JSON.stringify(remaining));
  if (syncedCount > 0) {
    toast.success("Sincronização Concluída", { description: `${syncedCount} registros enviados para a nuvem.` });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineQueue);
}

async function executeMutation(mutation: Omit<OfflineMutation, 'id'>, fallbackAction: () => Promise<any>) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueMutation(mutation);
    return;
  }
  try {
    await fallbackAction();
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
      queueMutation(mutation);
    } else {
      throw error;
    }
  }
}

async function handleResponse(promise: any, actionName: string, cacheKey?: string) {
  try {
    const response = await promise;
    if (response.error) {
      console.error(`Supabase Error [${actionName}]:`, response.error.message, response.error.details);
      throw new Error(response.error.message);
    }
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(response.data));
    return response.data;
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || (typeof window !== 'undefined' && !navigator.onLine)) {
      if (cacheKey) return JSON.parse(localStorage.getItem(cacheKey) || 'null');
    }
    throw error;
  }
}

// ----------------- END PWA -----------------


// Config
export async function getConfig(): Promise<AppConfig & { alunosList: Aluno[] }> {
  const defaultConfig: AppConfig = {
    autoBlocks: [],
    exitLimitMinutes: 15,
    passwords: { admin: 'gestao', professor: 'prof', apoio: 'apoio', parent: 'pais' },
  };

  try {
    const configRow = await handleResponse(
      supabase.from('config').select('data').eq('id', 'app_config').single(),
      'getConfigRow',
      STORAGE_KEYS.CACHE_CONFIG
    ).catch(() => null);

    const AlunosData = await handleResponse(
      supabase.from('alumnos').select('*').order('nome', { ascending: true }),
      'getAlunos',
      STORAGE_KEYS.CACHE_ALUNOS
    );

    const configData = configRow?.data || defaultConfig;
    return { ...configData, alunosList: AlunosData || [] };
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

  await executeMutation(
    { table: 'config', action: 'update', payload: { data: newValue }, matchField: 'id', matchValue: 'app_config' },
    () => handleResponse(supabase.from('config').upsert({ id: 'app_config', data: newValue }), 'upsertConfig')
  );
}

// Alunos
export async function addAluno(aluno: Omit<Aluno, 'id'> & { id?: string }) {
  const id = aluno.id || generateId();
  const dbAluno = {
    id,
    nome: aluno.nome,
    turma: aluno.turma,
    responsavel_nome: aluno.responsavel_nome,
    responsavel_telefone: aluno.responsavel_telefone,
    responsavel_email: aluno.responsavel_email
  };
  await executeMutation(
    { table: 'alumnos', action: 'insert', payload: [dbAluno] },
    () => handleResponse(supabase.from('alumnos').insert([dbAluno]), 'addAluno')
  );
}

export async function updateAluno(id: string, data: Partial<Aluno>) {
  const dbData: any = { ...data };
  if (data.responsavel_nome !== undefined) dbData.responsavel_nome = data.responsavel_nome;
  if (data.responsavel_telefone !== undefined) dbData.responsavel_telefone = data.responsavel_telefone;
  if (data.responsavel_email !== undefined) dbData.responsavel_email = data.responsavel_email;

  await executeMutation(
    { table: 'alumnos', action: 'update', payload: dbData, matchField: 'id', matchValue: id },
    () => handleResponse(supabase.from('alumnos').update(dbData).eq('id', id), 'updateAluno')
  );
}

export async function deleteAlunos(ids: string[]) {
  await executeMutation(
    { table: 'alumnos', action: 'deleteIn', matchField: 'id', matchValue: ids },
    () => handleResponse(supabase.from('alumnos').delete().in('id', ids), 'deleteAlunos')
  );
}

export async function deleteAlunosByTurma(turma: string) {
  await executeMutation(
    { table: 'alumnos', action: 'delete', matchField: 'turma', matchValue: turma },
    () => handleResponse(supabase.from('alumnos').delete().eq('turma', turma), 'deleteAlunosByTurma')
  );
}

// Active Exits
export async function getActiveExits(): Promise<ActiveExit[]> {
  const data = await handleResponse(
    supabase.from('active_exits').select('*'),
    'getActiveExits',
    STORAGE_KEYS.CACHE_EXITS
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id, alunoId: r.aluno_id, alunoNome: r.aluno_nome, turma: r.turma, destino: r.destino,
    startTime: r.start_time, professor: r.professor, autorRole: r.autor_role, isEmergency: r.is_emergency
  }));
}

export async function addActiveExit(exit: ActiveExit) {
  const dbItem = { id: exit.id, aluno_id: exit.alunoId, aluno_nome: exit.alunoNome, turma: exit.turma, destino: exit.destino, start_time: exit.startTime, professor: exit.professor, autor_role: exit.autorRole, is_emergency: exit.isEmergency };
  await executeMutation(
    { table: 'active_exits', action: 'insert', payload: [dbItem] },
    () => handleResponse(supabase.from('active_exits').insert([dbItem]), 'addActiveExit')
  );
}

export async function removeActiveExit(id: string) {
  await executeMutation(
    { table: 'active_exits', action: 'delete', matchField: 'id', matchValue: id },
    () => handleResponse(supabase.from('active_exits').delete().eq('id', id), 'removeActiveExit')
  );
}

// History
export async function getHistory(): Promise<HistoryRecord[]> {
  const data = await handleResponse(
    supabase.from('history')
      .select('id, aluno_id, aluno_nome, turma, categoria, detalhe, timestamp, raw_timestamp, professor, autor_role')
      .order('raw_timestamp', { ascending: false })
      .limit(300),
    'getHistory',
    STORAGE_KEYS.CACHE_HISTORY
  ).catch(() => []);

  return (data || []).map((r: any) => ({
    id: r.id, alunoId: r.aluno_id, alunoNome: r.aluno_nome, turma: r.turma, categoria: r.categoria,
    detalhe: r.detalhe, timestamp: r.timestamp, rawTimestamp: r.raw_timestamp, professor: r.professor, autorRole: r.autor_role, fotoUrl: null
  }));
}

export async function getHistoryRecordWithPhoto(id: string): Promise<HistoryRecord | null> {
  const data = await handleResponse(
    supabase.from('history').select('*').eq('id', id).single(),
    'getHistoryRecordWithPhoto'
  ).catch(() => null);

  if (!data) return null;
  return {
    id: data.id, alunoId: data.aluno_id, alunoNome: data.aluno_nome, turma: data.turma, categoria: data.categoria,
    detalhe: data.detalhe, timestamp: data.timestamp, rawTimestamp: data.raw_timestamp, professor: data.professor, autorRole: data.autor_role, fotoUrl: data.foto_url
  };
}

export async function addHistoryRecord(record: HistoryRecord) {
  const dbRecord = { id: record.id, aluno_id: record.alunoId, aluno_nome: record.alunoNome, turma: record.turma, categoria: record.categoria, detalhe: record.detalhe, timestamp: record.timestamp, raw_timestamp: record.rawTimestamp, professor: record.professor, autor_role: record.autorRole, foto_url: record.fotoUrl };
  await executeMutation(
    { table: 'history', action: 'insert', payload: [dbRecord] },
    () => handleResponse(supabase.from('history').insert([dbRecord]), 'addHistoryRecord')
  );
}

export async function updateHistoryRecord(id: string, data: Partial<HistoryRecord>) {
  const dbData: any = { ...data };
  if (data.alunoId) dbData.aluno_id = data.alunoId; if (data.alunoNome) dbData.aluno_nome = data.alunoNome;
  if (data.rawTimestamp) dbData.raw_timestamp = data.rawTimestamp; if (data.autorRole) dbData.autor_role = data.autorRole;
  if (data.fotoUrl) dbData.foto_url = data.fotoUrl;
  ['alunoId', 'alunoNome', 'rawTimestamp', 'autorRole', 'fotoUrl'].forEach(k => delete dbData[k]);

  await executeMutation(
    { table: 'history', action: 'update', payload: dbData, matchField: 'id', matchValue: id },
    () => handleResponse(supabase.from('history').update(dbData).eq('id', id), 'updateHistoryRecord')
  );
}

export async function deleteHistoryRecord(id: string) {
  await executeMutation(
    { table: 'history', action: 'delete', matchField: 'id', matchValue: id },
    () => handleResponse(supabase.from('history').delete().eq('id', id), 'deleteHistoryRecord')
  );
}

export async function deleteMultipleHistoryRecords(ids: string[]) {
  await executeMutation(
    { table: 'history', action: 'deleteIn', matchField: 'id', matchValue: ids },
    () => handleResponse(supabase.from('history').delete().in('id', ids), 'deleteMultipleHistoryRecords')
  );
}

// Coordination Queue
export async function getCoordinationQueue(): Promise<CoordinationItem[]> {
  const data = await handleResponse(
    supabase.from('coordination_queue').select('id, aluno_id, aluno_nome, turma, motivo, timestamp, professor'),
    'getCoordinationQueue',
    STORAGE_KEYS.CACHE_COORD
  ).catch(() => []);
  return (data || []).map((r: any) => ({
    id: r.id, alunoId: r.aluno_id, alunoNome: r.aluno_nome, turma: r.turma, motivo: r.motivo, timestamp: r.timestamp, professor: r.professor, fotoUrl: null
  }));
}

export async function getCoordinationItemWithPhoto(id: string): Promise<CoordinationItem | null> {
  const data = await handleResponse(
    supabase.from('coordination_queue').select('*').eq('id', id).single(),
    'getCoordinationItemWithPhoto'
  ).catch(() => null);

  if (!data) return null;
  return {
    id: data.id, alunoId: data.aluno_id, alunoNome: data.aluno_nome, turma: data.turma, motivo: data.motivo, timestamp: data.timestamp, professor: data.professor, fotoUrl: data.foto_url
  };
}

export async function addCoordinationItem(item: CoordinationItem) {
  const dbItem = { id: item.id, aluno_id: item.alunoId, aluno_nome: item.alunoNome, turma: item.turma, motivo: item.motivo, professor: item.professor, foto_url: item.fotoUrl, timestamp: item.timestamp };
  await executeMutation({ table: 'coordination_queue', action: 'insert', payload: [dbItem] }, () => handleResponse(supabase.from('coordination_queue').insert([dbItem]), 'addCoordinationItem'));
}

export async function removeCoordinationItem(id: string) {
  await executeMutation({ table: 'coordination_queue', action: 'delete', matchField: 'id', matchValue: id }, () => handleResponse(supabase.from('coordination_queue').delete().eq('id', id), 'removeCoordinationItem'));
}

// Library Queue
export async function getLibraryQueue(): Promise<LibraryItem[]> {
  const data = await handleResponse(
    supabase.from('library_queue').select('id, aluno_id, aluno_nome, turma, timestamp, professor_coord, obs_coord'),
    'getLibraryQueue',
    STORAGE_KEYS.CACHE_LIB
  ).catch(() => []);
  return (data || []).map((r: any) => ({
    id: r.id, alunoId: r.aluno_id, alunoNome: r.aluno_nome, turma: r.turma, timestamp: r.timestamp, professorCoord: r.professor_coord, obsCoord: r.obs_coord, fotoUrl: null
  }));
}

export async function getLibraryItemWithPhoto(id: string): Promise<LibraryItem | null> {
  const data = await handleResponse(
    supabase.from('library_queue').select('*').eq('id', id).single(),
    'getLibraryItemWithPhoto'
  ).catch(() => null);

  if (!data) return null;
  return {
    id: data.id, alunoId: data.aluno_id, alunoNome: data.aluno_nome, turma: data.turma, timestamp: data.timestamp, professorCoord: data.professor_coord, obsCoord: data.obs_coord, fotoUrl: data.foto_url
  };
}

export async function addLibraryItem(item: LibraryItem) {
  const dbItem = { id: item.id, aluno_id: item.alunoId, aluno_nome: item.alunoNome, turma: item.turma, professor_coord: item.professorCoord, obs_coord: item.obsCoord, foto_url: item.fotoUrl, timestamp: item.timestamp };
  await executeMutation({ table: 'library_queue', action: 'insert', payload: [dbItem] }, () => handleResponse(supabase.from('library_queue').insert([dbItem]), 'addLibraryItem'));
}

export async function removeLibraryItem(id: string) {
  await executeMutation({ table: 'library_queue', action: 'delete', matchField: 'id', matchValue: id }, () => handleResponse(supabase.from('library_queue').delete().eq('id', id), 'removeLibraryItem'));
}

// Suspensions
export async function getSuspensions(): Promise<Suspension[]> {
  const data = await handleResponse(supabase.from('suspensions').select('*'), 'getSuspensions', STORAGE_KEYS.CACHE_SUSP).catch(() => []);
  return (data || []).map((r: any) => ({ id: r.id, alunoId: r.aluno_id, alunoNome: r.aluno_nome, turma: r.turma, returnDate: r.return_date, timestamp: r.timestamp }));
}

export async function addSuspension(s: Suspension) {
  const dbS = { id: s.id, aluno_id: s.alunoId, aluno_nome: s.alunoNome, turma: s.turma, return_date: s.returnDate };
  await executeMutation({ table: 'suspensions', action: 'insert', payload: [dbS] }, () => handleResponse(supabase.from('suspensions').insert([dbS]), 'addSuspension'));
}

export async function removeSuspension(id: string) {
  await executeMutation({ table: 'suspensions', action: 'delete', matchField: 'id', matchValue: id }, () => handleResponse(supabase.from('suspensions').delete().eq('id', id), 'removeSuspension'));
}

// Avisos
export async function getAvisos(): Promise<Aviso[]> {
  const data = await handleResponse(supabase.from('avisos').select('*').order('raw_timestamp', { ascending: false }), 'getAvisos', STORAGE_KEYS.CACHE_AVISOS).catch(() => []);
  return (data || []).map((r: any) => ({ id: r.id, texto: r.texto, autor: r.autor, timestamp: r.timestamp, rawTimestamp: r.raw_timestamp }));
}

export async function addAviso(a: Aviso) {
  const dbA = { id: a.id, texto: a.texto, autor: a.autor, raw_timestamp: a.rawTimestamp };
  await executeMutation({ table: 'avisos', action: 'insert', payload: [dbA] }, () => handleResponse(supabase.from('avisos').insert([dbA]), 'addAviso'));
}

export async function removeAviso(id: string) {
  await executeMutation({ table: 'avisos', action: 'delete', matchField: 'id', matchValue: id }, () => handleResponse(supabase.from('avisos').delete().eq('id', id), 'removeAviso'));
}

// Auth
export function getSavedAuth() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) || 'null'); } catch { return null; }
}
export function saveAuth(role: string, name: string, linkedStudentName?: string) {
  try { localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ role, name, linkedStudentName })); } catch { }
}
export function clearAuth() {
  try { localStorage.removeItem(STORAGE_KEYS.AUTH); } catch { }
}
