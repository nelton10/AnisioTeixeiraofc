import { Aluno, ActiveExit, HistoryRecord, CoordinationItem, LibraryItem, Suspension, Aviso, AppConfig } from '@/types';

const STORAGE_KEYS = {
  CONFIG: 'anisio_config',
  ACTIVE_EXITS: 'anisio_active_exits',
  HISTORY: 'anisio_history',
  COORDINATION: 'anisio_coordination',
  LIBRARY: 'anisio_library',
  SUSPENSIONS: 'anisio_suspensions',
  AVISOS: 'anisio_avisos',
  AUTH: 'anisio_auth',
} as const;

const DEFAULT_CONFIG: AppConfig = {
  autoBlocks: [],
  exitLimitMinutes: 15,
  passwords: { admin: 'gestao', professor: 'prof', apoio: 'apoio' },
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Config
export function getConfig(): AppConfig & { alunosList: Aluno[] } {
  return get(STORAGE_KEYS.CONFIG, { ...DEFAULT_CONFIG, alunosList: [] });
}
export function saveConfig(data: Partial<AppConfig & { alunosList: Aluno[] }>) {
  const current = getConfig();
  set(STORAGE_KEYS.CONFIG, { ...current, ...data });
}

// Active Exits
export function getActiveExits(): ActiveExit[] { return get(STORAGE_KEYS.ACTIVE_EXITS, []); }
export function addActiveExit(exit: ActiveExit) { set(STORAGE_KEYS.ACTIVE_EXITS, [...getActiveExits(), exit]); }
export function removeActiveExit(id: string) { set(STORAGE_KEYS.ACTIVE_EXITS, getActiveExits().filter(e => e.id !== id)); }

// History
export function getHistory(): HistoryRecord[] { return get(STORAGE_KEYS.HISTORY, []); }
export function addHistoryRecord(record: HistoryRecord) {
  const records = [...getHistory(), record].sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
  set(STORAGE_KEYS.HISTORY, records);
}
export function updateHistoryRecord(id: string, data: Partial<HistoryRecord>) {
  set(STORAGE_KEYS.HISTORY, getHistory().map(r => r.id === id ? { ...r, ...data } : r));
}
export function deleteHistoryRecord(id: string) { set(STORAGE_KEYS.HISTORY, getHistory().filter(r => r.id !== id)); }

// Coordination Queue
export function getCoordinationQueue(): CoordinationItem[] { return get(STORAGE_KEYS.COORDINATION, []); }
export function addCoordinationItem(item: CoordinationItem) { set(STORAGE_KEYS.COORDINATION, [...getCoordinationQueue(), item]); }
export function removeCoordinationItem(id: string) { set(STORAGE_KEYS.COORDINATION, getCoordinationQueue().filter(i => i.id !== id)); }

// Library Queue
export function getLibraryQueue(): LibraryItem[] { return get(STORAGE_KEYS.LIBRARY, []); }
export function addLibraryItem(item: LibraryItem) { set(STORAGE_KEYS.LIBRARY, [...getLibraryQueue(), item]); }
export function removeLibraryItem(id: string) { set(STORAGE_KEYS.LIBRARY, getLibraryQueue().filter(i => i.id !== id)); }

// Suspensions
export function getSuspensions(): Suspension[] { return get(STORAGE_KEYS.SUSPENSIONS, []); }
export function addSuspension(s: Suspension) { set(STORAGE_KEYS.SUSPENSIONS, [...getSuspensions(), s]); }
export function removeSuspension(id: string) { set(STORAGE_KEYS.SUSPENSIONS, getSuspensions().filter(s => s.id !== id)); }

// Avisos
export function getAvisos(): Aviso[] { return get(STORAGE_KEYS.AVISOS, []); }
export function addAviso(a: Aviso) {
  set(STORAGE_KEYS.AVISOS, [...getAvisos(), a].sort((x, y) => y.rawTimestamp - x.rawTimestamp));
}
export function removeAviso(id: string) { set(STORAGE_KEYS.AVISOS, getAvisos().filter(a => a.id !== id)); }

// Auth
export function getSavedAuth() { return get<{ role: string; name: string } | null>(STORAGE_KEYS.AUTH, null); }
export function saveAuth(role: string, name: string) { set(STORAGE_KEYS.AUTH, { role, name }); }
export function clearAuth() { try { localStorage.removeItem(STORAGE_KEYS.AUTH); } catch {} }
