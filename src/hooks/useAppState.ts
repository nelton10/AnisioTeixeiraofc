import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Aluno, ActiveExit, HistoryRecord, CoordinationItem, LibraryItem,
  Suspension, Aviso, AppConfig, UserRole, AuthState, SaidasQueueItem
} from '@/types';
import * as store from '@/lib/store';
import { toast } from 'sonner';

const playDing = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) { }
};

const sendNativeNotification = (title: string, body: string) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    });
  }
};

export function useAppState() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, username: '', role: 'professor' });
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [activeExits, setActiveExits] = useState<ActiveExit[]>([]);
  const [saidasQueue, setSaidasQueue] = useState<SaidasQueueItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('anisio_saidas_queue') || '[]');
    } catch {
      return [];
    }
  });
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [coordinationQueue, setCoordinationQueue] = useState<CoordinationItem[]>([]);
  const [libraryQueue, setLibraryQueue] = useState<LibraryItem[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    autoBlocks: [], exitLimitMinutes: 15,
    passwords: { admin: 'gestao', professor: 'prof', apoio: 'apoio', parent: 'pais' }
  });
  const [activeTab, setActiveTab] = useState('saidas');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refreshHistory = useCallback(async (start?: number, end?: number) => {
    try {
      const hist = await store.getHistory(start, end);
      setRecords(hist);
    } catch (e) { console.error(e); }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const cfg = await store.getConfig();
      if (cfg) {
        setAlunos(cfg.alunosList || []);
        setConfig({
          autoBlocks: cfg.autoBlocks || [],
          exitLimitMinutes: cfg.exitLimitMinutes || 15,
          passwords: { ...{ admin: 'gestao', professor: 'prof', apoio: 'apoio', parent: 'pais' }, ...(cfg.passwords || {}) }
        });
      }

      const [exits, hist, coord, lib, susp, avs] = await Promise.all([
        store.getActiveExits(),
        store.getHistory(), // Will default to 12h
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
      setAuthState({ isAuthenticated: true, username: saved.name, role: saved.role as UserRole, linkedStudentName: saved.linkedStudentName });
    }
    refreshData();
  }, [refreshData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any;
          const newRecord: HistoryRecord = {
            id: row.id, alunoId: row.aluno_id, alunoNome: row.aluno_nome, turma: row.turma, categoria: row.categoria,
            detalhe: row.detalhe, timestamp: row.timestamp, rawTimestamp: row.raw_timestamp, professor: row.professor,
            autorRole: row.autor_role, fotoUrl: null // No photo in real-time payload anyway
          };
          setRecords(prev => [newRecord, ...prev].sort((a, b) => b.rawTimestamp - a.rawTimestamp));

          if (newRecord.categoria === 'ocorrencia' || newRecord.categoria === 'atraso' || newRecord.categoria === 'merito' || newRecord.categoria === 'coordenação') {
            playDing();
            toast(`Novo registro: ${newRecord.categoria.toUpperCase()}`, {
              description: `${newRecord.alunoNome || 'Aluno'} - ${newRecord.detalhe}`,
              duration: 5000,
            });
            sendNativeNotification(`Novo registro: ${newRecord.categoria.toUpperCase()}`, `${newRecord.alunoNome || 'Aluno'} - ${newRecord.detalhe}`);
          }
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          setRecords(prev => prev.map(r => r.id === row.id ? { ...r, detalhe: row.detalhe, alunoNome: row.aluno_nome, turma: row.turma } : r));
        } else if (payload.eventType === 'DELETE') {
          setRecords(prev => prev.filter(r => r.id === payload.old.id));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'avisos' }, (payload) => {
        const row = payload.new as any;
        const newAviso: Aviso = { id: row.id, texto: row.texto, autor: row.autor, timestamp: row.timestamp, rawTimestamp: row.raw_timestamp };
        setAvisos(prev => [newAviso, ...prev].sort((a, b) => b.rawTimestamp - a.rawTimestamp));
        playDing();
        toast('📣 NOVO AVISO DA GESTÃO', {
          description: row.texto,
          duration: 8000,
        });
        sendNativeNotification('📣 NOVO AVISO DA GESTÃO', row.texto);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_exits' }, () => store.getActiveExits().then(setActiveExits))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coordination_queue' }, () => store.getCoordinationQueue().then(setCoordinationQueue))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library_queue' }, () => store.getLibraryQueue().then(setLibraryQueue))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suspensions' }, () => store.getSuspensions().then(setSuspensions))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alumnos' }, () => store.getConfig().then(cfg => cfg && setAlunos(cfg.alunosList)))
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

  useEffect(() => {
    localStorage.setItem('anisio_saidas_queue', JSON.stringify(saidasQueue));
  }, [saidasQueue]);

  const notify = useCallback((msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  }, []);

  const login = useCallback((username: string, password: string, rememberMe: boolean) => {
    if (!username) { notify("Introduza o seu nome (ou do Aluno)."); return false; }
    const pass = password.trim().toLowerCase();
    const p = config.passwords;
    let role: UserRole | '' = '';
    let linkedStudentName: string | undefined = undefined;

    if (pass === p.admin.toLowerCase() || pass === 'gestão') role = 'admin';
    else if (pass === p.professor.toLowerCase()) role = 'professor';
    else if (pass === p.apoio.toLowerCase()) role = 'aluno';
    else if (p.parent && pass === p.parent.toLowerCase()) {
      role = 'parent';
      linkedStudentName = username.trim();
    }
    else { notify("PIN incorreto."); return false; }

    setAuthState({ isAuthenticated: true, username, role, linkedStudentName });
    if (rememberMe) store.saveAuth(role, username, linkedStudentName);

    // Solicitar permissão de notificação no login se ainda for a padrão
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

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
      totalAvaliacoes: todayRecs.filter(r => r.categoria === 'avaliacao_aula').length,
    };
  }, [records]);

  const addToSaidasQueue = useCallback((item: SaidasQueueItem) => {
    setSaidasQueue(prev => [...prev, item]);
  }, []);

  const removeFromSaidasQueue = useCallback((id: string) => {
    setSaidasQueue(prev => prev.filter(q => q.id !== id));
  }, []);

  return {
    authState, alunos, activeExits, saidasQueue, records, coordinationQueue, libraryQueue,
    suspensions, avisos, config, activeTab, showToast, currentTimeStr, isLoading,
    turmasExistentes, activeBlock, statsSummary,
    setActiveTab, notify, login, logout, refreshData, getTodayExitsCount, saveConfig,
    addToSaidasQueue, removeFromSaidasQueue,
  };
}
