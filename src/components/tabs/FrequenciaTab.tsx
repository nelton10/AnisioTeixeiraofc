import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { CheckSquare, Search, AlertTriangle, Save, UserCheck, Users, Sun, Moon, Download, FileSpreadsheet } from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, HistoryRecord, UserRole } from '@/types';

interface FrequenciaTabProps {
  alunos: Aluno[];
  records: HistoryRecord[];
  turmasExistentes: string[];
  username: string;
  userRole: UserRole;
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
  refreshHistory?: () => Promise<void>;
}

type Period = '8h' | '14h';

interface AttendanceState {
  status: 'P' | 'A' | null;
  justification: string;
}

const FrequenciaTab: React.FC<FrequenciaTabProps> = ({ 
  alunos, 
  records, 
  turmasExistentes, 
  username, 
  userRole, 
  notify, 
  refreshData,
  refreshHistory
}) => {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [localAttendance, setLocalAttendance] = useState<Record<string, Record<Period, AttendanceState>>>({});
  const [dbFrequencias, setDbFrequencias] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  const isToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today;
  }, [selectedDate]);

  const isProfessor = userRole === 'professor';
  const canEdit = isToday && !isProfessor;

  const loadFrequencias = async () => {
    setIsLoading(true);
    try {
      const data = await store.getFrequenciasByDate(selectedDate);
      setDbFrequencias(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadFrequencias(), refreshData(), refreshHistory?.()]);
    notify("Dados atualizados.");
  };

  useEffect(() => {
    loadFrequencias();
  }, [selectedDate]);

  const filteredAlunos = useMemo(() => {
    if (!selectedTurma) return [];
    return alunos.filter(a => 
      a.turma === selectedTurma && 
      a.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [alunos, selectedTurma, searchTerm]);

  const faltosos = useMemo(() => {
    return filteredAlunos.filter(a => {
      const state = localAttendance[a.id];
      return state?.['8h']?.status === 'A' || state?.['14h']?.status === 'A';
    });
  }, [filteredAlunos, localAttendance]);

  // Load existing records into local state
  useEffect(() => {
    const newState: Record<string, Record<Period, AttendanceState>> = {};
    
    // Initialize for all alunos in selected turma
    filteredAlunos.forEach(a => {
      newState[a.id] = {
        '8h': { status: null, justification: '' },
        '14h': { status: null, justification: '' }
      };
    });

    dbFrequencias.forEach(f => {
      if (newState[f.alunoId]) {
        newState[f.alunoId][f.period as Period] = {
          status: f.status as 'P' | 'A' | null,
          justification: f.justificativa || ''
        };
      }
    });
    setLocalAttendance(newState);
  }, [dbFrequencias, selectedTurma, filteredAlunos]);

  const stats = useMemo(() => {
    const total = filteredAlunos.length;
    let marked8h = 0;
    let marked14h = 0;
    filteredAlunos.forEach(a => {
      if (localAttendance[a.id]?.['8h']?.status) marked8h++;
      if (localAttendance[a.id]?.['14h']?.status) marked14h++;
    });

    const isDirty = filteredAlunos.some(a => {
      const current = localAttendance[a.id];
      if (!current) return false;

      // Check 8h
      const db8 = dbFrequencias.find(f => f.alunoId === a.id && f.period === '8h');
      const db8Status = db8?.status || null;
      const db8Just = db8?.justificativa || '';
      if (current['8h'].status !== db8Status || current['8h'].justification !== db8Just) return true;

      // Check 14h
      const db14 = dbFrequencias.find(f => f.alunoId === a.id && f.period === '14h');
      const db14Status = db14?.status || null;
      const db14Just = db14?.justificativa || '';
      if (current['14h'].status !== db14Status || current['14h'].justification !== db14Just) return true;

      return false;
    });

    return { total, marked8h, marked14h, isDirty, hasHistory: dbFrequencias.length > 0 };
  }, [filteredAlunos, localAttendance, dbFrequencias, selectedDate]);

  const handleStatusChange = (alunoId: string, period: Period, status: 'P' | 'A') => {
    setLocalAttendance(prev => {
      const alunoState = prev[alunoId] || { '8h': { status: null, justification: '' }, '14h': { status: null, justification: '' } };
      const current = alunoState[period];
      return {
        ...prev,
        [alunoId]: { 
          ...alunoState, 
          [period]: { ...current, status: current.status === status ? null : status } 
        }
      };
    });
  };

  const handleJustificationChange = (alunoId: string, period: Period, text: string) => {
    setLocalAttendance(prev => {
      const alunoState = prev[alunoId] || { '8h': { status: null, justification: '' }, '14h': { status: null, justification: '' } };
      const current = alunoState[period];
      return {
        ...prev,
        [alunoId]: { 
          ...alunoState, 
          [period]: { ...current, justification: text } 
        }
      };
    });
  };

  const markAllPresent = () => {
    const newState = { ...localAttendance };
    filteredAlunos.forEach(a => {
      if (!newState[a.id]) {
        newState[a.id] = { 
          '8h': { status: 'P', justification: '' }, 
          '14h': { status: 'P', justification: '' } 
        };
      } else {
        newState[a.id] = { 
          '8h': { ...newState[a.id]['8h'], status: 'P' }, 
          '14h': { ...newState[a.id]['14h'], status: 'P' } 
        };
      }
    });
    setLocalAttendance(newState);
  };

  const saveBulk = async () => {
    const toSave: { aluno: Aluno, period: Period, state: AttendanceState }[] = [];

    filteredAlunos.forEach(a => {
      const state = localAttendance[a.id];
      if (!state) return;

      ['8h', '14h'].forEach((p: any) => {
        const period = p as Period;
        const s = state[period];
        if (!s.status) return;

        // Check if modified compared to DB
        const dbId = `freq_${a.id}_${selectedDate}_${period}`;
        const dbRec = dbFrequencias.find(f => f.id === dbId);
        const dbStatus = dbRec?.status || null;
        const dbJust = dbRec?.justificativa || '';

        if (s.status !== dbStatus || s.justification !== dbJust) {
          // Validate justification for 14h mismatches
          if (period === '14h') {
            const s8 = state['8h'].status;
            if (s8 && s8 !== s.status && !s.justification.trim()) {
              throw new Error(`Justificativa obrigatória para ${a.nome} às 14h`);
            }
          }
          toSave.push({ aluno: a, period, state: s });
        }
      });
    });

    if (toSave.length === 0) return notify("Nenhuma alteração para salvar.");

    setIsSaving(true);
    try {
      notify("Salvando frequência...");
      
      for (const item of toSave) {
        const { aluno, period, state } = item;
        const recordId = `freq_${aluno.id}_${selectedDate}_${period}`;

        await store.upsertFrequencia({
          id: recordId,
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          turma: aluno.turma,
          data: selectedDate,
          period: period,
          status: state.status,
          justificativa: state.justification,
          professor: username,
          timestamp: new Date().toISOString(),
          rawTimestamp: Date.now()
        });

        // Also add to history for general logging (optional but good for tracking)
        await store.addHistoryRecord({
          id: store.generateId(),
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          turma: aluno.turma,
          categoria: 'frequencia',
          detalhe: `${period.toUpperCase()}: ${state.status === 'P' ? 'Presente' : 'Ausente'}${state.justification ? ' - Obs: ' + state.justification : ''}`,
          timestamp: new Date().toISOString(),
          rawTimestamp: Date.now(),
          professor: username,
          autorRole: userRole
        });
      }

      await Promise.all([loadFrequencias(), refreshData()]);
      notify(`Frequências atualizadas com sucesso!`);
    } catch (e: any) {
      notify(e.message || "Erro ao salvar frequência.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateExcel = async () => {
    if (!selectedTurma) return notify("Selecione uma turma para exportar.");
    setIsExporting(true);
    notify("Gerando Excel por período...");

    try {
      // 1. Fetch data for the range
      const rangeData = await store.getFrequenciasByRange(exportStartDate, exportEndDate, selectedTurma);
      
      // 2. Filter for 8h and group by student and date
      // We want a list of dates in the range
      const dates = [...new Set(rangeData.map(f => f.data))].sort();
      
      // Group by student
      const studentMap: Record<string, Record<string, string>> = {};
      
      rangeData.forEach(f => {
        if (f.period === '8h') {
          if (!studentMap[f.alunoNome]) studentMap[f.alunoNome] = {};
          studentMap[f.alunoNome][f.data] = f.status === 'P' ? 'P' : f.status === 'A' ? 'F' : '-';
        }
      });

      // 3. Create JSON data for XLSX
      const exportData = filteredAlunos.map(aluno => {
        const row: any = {
          'Aluno': aluno.nome,
          'Turma': aluno.turma,
        };
        
        dates.forEach(date => {
          row[date] = studentMap[aluno.nome]?.[date] || '-';
        });
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Frequência 8h");
      XLSX.writeFile(wb, `Frequencia_8h_${selectedTurma}_${exportStartDate}_${exportEndDate}.xlsx`);
      notify("Excel baixado com sucesso!");
    } catch (error) {
      console.error(error);
      notify("Erro ao gerar Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-20">
      <div className="glass rounded-3xl p-6 shadow-lg border border-white/10 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
              <CheckSquare size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground leading-none">Frequência por Lote</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{selectedTurma || 'Selecione a Turma'}</p>
                {selectedTurma && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${dbFrequencias.length > 0 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                    {dbFrequencias.length > 0 ? 'Registrado' : 'Pendente'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(userRole === 'admin' || userRole === 'professor') && (
            <div className="flex flex-wrap items-center gap-3">
               <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-xl border border-border">
                 <span className="text-[9px] font-black uppercase text-muted-foreground ml-1">De:</span>
                 <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} 
                   className="bg-transparent text-[10px] font-bold outline-none w-28" title="Data Inicial para Exportação" />
                 <span className="text-[9px] font-black uppercase text-muted-foreground">Até:</span>
                 <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} 
                   className="bg-transparent text-[10px] font-bold outline-none w-28" title="Data Final para Exportação" />
               </div>
               <button 
                 onClick={generateExcel}
                 disabled={!selectedTurma || isExporting}
                 className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
               >
                 {isExporting ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet size={14} />}
                 EXPORTAR 8H (PERÍODO)
               </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-foreground mb-1 md:mb-0"
          />

          <select 
            className="p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
            value={selectedTurma}
            onChange={e => setSelectedTurma(e.target.value)}
          >
            <option value="">Selecione a Turma</option>
            {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Pesquisar aluno..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-secondary/50 rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
            />
          </div>
        </div>

        {selectedTurma && canEdit && (
          <button 
            onClick={markAllPresent}
            className="w-full py-3 bg-primary/10 text-primary rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
          >
            <Users size={16} /> Marcar todos como Presente
          </button>
        )}

        {selectedTurma && faltosos.length > 0 && (
          <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-destructive rounded-full" />
              <p className="text-[10px] font-black text-destructive uppercase tracking-widest leading-none">Alunos Faltosos ({faltosos.length})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {faltosos.map(f => (
                <div key={f.id} className="px-3 py-1.5 bg-destructive/10 rounded-lg text-[11px] font-bold text-destructive">
                  {f.nome}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTurma && filteredAlunos.length > 0 && (
          <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
            <div className="flex gap-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                Marcados 8h: <span className="text-foreground">{stats.marked8h} de {stats.total}</span>
              </p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                Marcados 14h: <span className="text-foreground">{stats.marked14h} de {stats.total}</span>
              </p>
            </div>
            {stats.marked8h === stats.total && stats.marked14h === stats.total && (
              <p className="text-[10px] font-black text-green-500 uppercase tracking-wider flex items-center gap-1">
                <UserCheck size={12} /> Completo
              </p>
            )}
          </div>
        )}
      </div>

      {!selectedTurma ? (
        <div className="glass p-20 rounded-3xl text-center border-2 border-dashed border-border flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-2">
            <Search size={32} className="text-primary/20" />
          </div>
          <p className="font-black text-muted-foreground text-sm uppercase tracking-widest">Aguardando Turma</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlunos.length === 0 ? (
            <div className="glass p-10 rounded-3xl text-center border-2 border-dashed border-border font-bold text-muted-foreground">Nenhum aluno encontrado nesta turma.</div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1fr,150px,150px] gap-4 px-6 mb-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aluno</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Manhã (8h)</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Tarde (14h)</p>
              </div>
              
              {filteredAlunos.map(aluno => {
                const state = localAttendance[aluno.id] || { 
                  '8h': { status: null, justification: '' }, 
                  '14h': { status: null, justification: '' } 
                };

                const needsJustification = state['14h'].status && state['8h'].status && state['14h'].status !== state['8h'].status;

                return (
                  <div key={aluno.id} className={`glass rounded-2xl p-4 shadow-sm border border-white/5 transition-all hover:shadow-md ${needsJustification ? 'ring-2 ring-orange-500/30' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,150px,150px] items-center gap-4">
                      {/* Aluno Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center font-black text-primary text-xs shrink-0">
                          {aluno.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-foreground">{aluno.nome}</p>
                          {needsJustification && (
                            <p className="text-[9px] font-black text-orange-500 uppercase flex items-center gap-1">
                              <AlertTriangle size={10} /> Divergência detectada
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 8h Buttons */}
                      <div className="flex flex-col gap-1">
                        <p className="md:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Manhã (8h)</p>
                        <div className="flex bg-secondary p-1 rounded-xl gap-1 h-fit">
                          <button 
                            onClick={() => canEdit && handleStatusChange(aluno.id, '8h', 'P')}
                            disabled={!canEdit}
                            className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${state['8h'].status === 'P' ? 'bg-green-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'} disabled:opacity-60`}
                          >
                            P
                          </button>
                          <button 
                            onClick={() => canEdit && handleStatusChange(aluno.id, '8h', 'A')}
                            disabled={!canEdit}
                            className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${state['8h'].status === 'A' ? 'bg-destructive text-white shadow-md' : 'text-muted-foreground hover:bg-muted'} disabled:opacity-60`}
                          >
                            A
                          </button>
                        </div>
                      </div>

                      {/* 14h Buttons */}
                      <div className="flex flex-col gap-1">
                        <p className="md:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Tarde (14h)</p>
                        <div className="flex bg-secondary p-1 rounded-xl gap-1 h-fit">
                          <button 
                            onClick={() => canEdit && handleStatusChange(aluno.id, '14h', 'P')}
                            disabled={!canEdit}
                            className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${state['14h'].status === 'P' ? 'bg-green-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'} disabled:opacity-60`}
                          >
                            P
                          </button>
                          <button 
                            onClick={() => canEdit && handleStatusChange(aluno.id, '14h', 'A')}
                            disabled={!canEdit}
                            className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${state['14h'].status === 'A' ? 'bg-destructive text-white shadow-md' : 'text-muted-foreground hover:bg-muted'} disabled:opacity-60`}
                          >
                            A
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Justifications */}
                    {(state['8h'].justification || state['14h'].justification || needsJustification) && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {/* 8h Justification (usually not needed but supported) */}
                        {state['8h'].justification && (
                          <div className="animate-scale-in flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                              Justificativa 8h
                            </label>
                            <p className="text-xs font-semibold text-foreground bg-secondary/30 p-2 rounded-lg italic">
                              "{state['8h'].justification}"
                            </p>
                          </div>
                        )}

                        {/* 14h Justification */}
                        {(needsJustification || state['14h'].justification) && (
                          <div className="animate-scale-in flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-orange-500 flex items-center gap-1">
                              <AlertTriangle size={10} /> Justificativa da Diferença (14h)
                            </label>
                            {canEdit ? (
                              <input 
                                type="text" 
                                value={state['14h'].justification}
                                onChange={e => handleJustificationChange(aluno.id, '14h', e.target.value)}
                                placeholder="Descreva o motivo da divergência..."
                                className="w-full p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-foreground"
                              />
                            ) : (
                              <p className="text-xs font-semibold text-foreground bg-orange-500/5 p-3 rounded-xl border border-orange-500/10 italic">
                                "{state['14h'].justification || 'Sem justificativa registrada.'}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {selectedTurma && filteredAlunos.length > 0 && canEdit && stats.isDirty && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
          <button 
            onClick={saveBulk}
            disabled={isSaving}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20"
          >
            <Save size={20} /> {isSaving ? 'SALVANDO...' : stats.hasHistory ? 'ATUALIZAR REGISTROS' : 'SALVAR FREQUÊNCIAS'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FrequenciaTab;
