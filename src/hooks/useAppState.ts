import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Aluno, ActiveExit, HistoryRecord, CoordinationItem, LibraryItem,
  Suspension, Aviso, AppConfig, UserRole, AuthState
} from '@/types';
import * as store from '@/lib/store';

export function useAppState() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, username: '', role: 'professor' });
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [activeExits, setActiveExits] = useState<ActiveExit[]>([]);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [coordinationQueue, setCoordinationQueue] = useState<CoordinationItem[]>([]);
  const [libraryQueue, setLibraryQueue] = useState<LibraryItem[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    autoBlocks: [], exitLimitMinutes: 15,
    passwords: { admin: 'gestao', professor: 'prof', apoio: 'apoio' }
  });
  const [activeTab, setActiveTab] = useState('saidas');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      const cfg = await store.getConfig();
      if (cfg) {
        setAlunos(cfg.alunosList || []);
        setConfig({
          autoBlocks: cfg.autoBlocks || [],
          exitLimitMinutes: cfg.exitLimitMinutes || 15,
          passwords: cfg.passwords || { admin: 'gestao', professor: 'prof', apoio: 'apoio' }
        });
      }


      const [exits, hist, coord, lib, susp, avs] = await Promise.all([
        store.getActiveExits(),
        store.getHistory(),
        store.getCoordinationQueue(),
        store.getLibraryQueue(),
        store.getSuspensions(),
        store.getAvisos()
      ]);

      setActiveExits(exits);
      setRecords(hist);
      setCoordinationQueue(coord);
      setLibraryQueue(lib);
      setSuspensions(susp);
      setAvisos(avs);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = store.getSavedAuth();
    if (saved) {
      setAuthState({ isAuthenticated: true, username: saved.name, role: saved.role as UserRole });
    }
    refreshData();
  }, [refreshData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.isAuthenticated, refreshData]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    update();
    const int = setInterval(update, 10000);
    return () => clearInterval(int);
  }, []);

  const notify = useCallback((msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  }, []);

  const login = useCallback((username: string, password: string, rememberMe: boolean) => {
    if (!username) { notify("Introduza o seu nome."); return false; }
    const pass = password.trim().toLowerCase();
    const p = config.passwords;
    let role: UserRole | '' = '';
    if (pass === p.admin.toLowerCase() || pass === 'gestão') role = 'admin';
    else if (pass === p.professor.toLowerCase()) role = 'professor';
    else if (pass === p.apoio.toLowerCase()) { role = 'aluno'; }
    else { notify("PIN incorreto."); return false; }
    setAuthState({ isAuthenticated: true, username, role });
    if (rememberMe) store.saveAuth(role, username);
    return true;
  }, [config.passwords, notify]);

  const logout = useCallback(() => {
    store.clearAuth();
    setAuthState({ isAuthenticated: false, username: '', role: 'professor' });
  }, []);

  const turmasExistentes = useMemo(() => {
    return [...new Set(alunos.map(a => a.turma))].sort();
  }, [alunos]);

  const activeBlock = useMemo(() => {
    if (!config.autoBlocks?.length) return null;
    return config.autoBlocks.find(block => currentTimeStr >= block.start && currentTimeStr <= block.end) || null;
  }, [config.autoBlocks, currentTimeStr]);

  const getTodayExitsCount = useCallback((alunoId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return records.filter(r =>
      r.alunoId === alunoId && r.categoria === 'saida' && (r.rawTimestamp || 0) >= today.getTime()
    ).length;
  }, [records]);

  const saveConfig = useCallback(async (data: Partial<AppConfig>) => {
    try {
      await store.saveConfig(data);
      await refreshData();
      notify("Configurações guardadas!");
    } catch (e) {
      notify("Erro ao guardar configurações.");
    }
  }, [refreshData, notify]);

  const statsSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecs = records.filter(r => (r.rawTimestamp || 0) >= today.getTime());
    return {
      totalSaidas: todayRecs.filter(r => r.categoria === 'saida').length,
      totalOcors: todayRecs.filter(r => r.categoria === 'ocorrencia').length,
      totalAtrasos: todayRecs.filter(r => r.categoria === 'atraso').length,
      totalMeritos: todayRecs.filter(r => r.categoria === 'merito').length,
    };
  }, [records]);

  return {
    authState, alunos, activeExits, records, coordinationQueue, libraryQueue,
    suspensions, avisos, config, activeTab, showToast, currentTimeStr, isLoading,
    turmasExistentes, activeBlock, statsSummary,
    setActiveTab, notify, login, logout, refreshData, getTodayExitsCount, saveConfig,
  };
}
