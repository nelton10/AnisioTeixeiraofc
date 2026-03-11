import React, { useState, useMemo } from 'react';
import { History, Trash2, Edit, Camera, X, CheckSquare, Square } from 'lucide-react';
import * as store from '@/lib/store';
import { HistoryRecord, LibraryItem, UserRole } from '@/types';

interface HistoricoTabProps {
  records: HistoryRecord[];
  libraryQueue: LibraryItem[];
  turmasExistentes: string[];
  userRole: UserRole;
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
}

const categoriaColors: Record<string, string> = {
  saida: 'bg-primary/10 text-primary border-primary/20 bg-primary/5',
  ocorrencia: 'bg-destructive/10 text-destructive border-destructive/20 bg-destructive/5',
  merito: 'bg-accent/10 text-accent border-accent/20 bg-accent/5',
  atraso: 'bg-warning/10 text-warning border-warning/20 bg-warning/5',
  'coordenação': 'bg-purple-500/10 text-purple-500 border-purple-500/20 bg-purple-500/5',
  medida: 'bg-orange-500/10 text-orange-500 border-orange-500/20 bg-orange-500/5',
};

const HistoricoTab: React.FC<HistoricoTabProps> = ({ records, libraryQueue, turmasExistentes, userRole, notify, refreshData }) => {
  const [filtroCategoria, setFiltroCategoria] = useState('ocorrencia');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroBuscaNome, setFiltroBuscaNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, nome: string, type: 'history' | 'library' } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editModal, setEditModal] = useState<HistoryRecord | null>(null);
  const [editText, setEditText] = useState('');
  const [fotoViewer, setFotoViewer] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<{ id: string, type: 'history' | 'library' }[]>([]);

  // Merge History with Library
  const allMergedRecords = useMemo(() => {
    const r: any[] = records.map(rec => ({ ...rec, _type: 'history' }));
    const l: any[] = libraryQueue.map(lib => ({
      id: lib.id,
      alunoId: lib.alunoId,
      alunoNome: lib.alunoNome,
      turma: lib.turma,
      categoria: 'medida', // Biblioteca = Medida
      detalhe: `Livro Pendente • Coord.: ${lib.professorCoord} • Obs: ${lib.obsCoord || 'N/A'}`,
      timestamp: lib.timestamp,
      rawTimestamp: new Date(lib.timestamp.split(' - ').reverse().join(' ')).getTime(), // approximate sorting
      professor: lib.professorCoord,
      fotoUrl: lib.fotoUrl,
      _type: 'library'
    }));
    return [...r, ...l].sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
  }, [records, libraryQueue]);

  const parseDateString = (dateStr: string) => {
    if (!dateStr) return 0;
    const str = dateStr.split(' - ')[0] || dateStr.split(' ')[0] || dateStr;
    const parts = str.split('/');
    if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).getTime();
    const dObj = new Date(str);
    return isNaN(dObj.getTime()) ? 0 : dObj.getTime();
  };

  const formatHoraFortaleza = (tsString: string) => {
    if (!tsString) return '';
    try {
      const match = tsString.match(/(\d{2}):(\d{2})/);
      if (!tsString.includes('T') && match) return `${match[1]}:${match[2]}`;
      const d = new Date(tsString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' });
      }
      if (match) return `${match[1]}:${match[2]}`;
    } catch (e) { }
    return '';
  };

  const formatDataLista = (tsString: string) => {
    if (!tsString) return '';
    try {
      if (tsString.includes(' - ')) return tsString.split(' - ')[0];
      const d = new Date(tsString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
      }
    } catch (e) { }
    return tsString.split('T')[0] || tsString;
  };

  const filtered = useMemo(() => {
    return allMergedRecords.filter(r => {
      if (filtroCategoria && r.categoria !== filtroCategoria) return false;
      if (filtroTurma && r.turma !== filtroTurma) return false;
      if (filtroBuscaNome && !r.alunoNome?.toLowerCase().includes(filtroBuscaNome.toLowerCase())) return false;

      const recordTime = parseDateString(r.timestamp);
      if (dataInicio && recordTime > 0) {
        const start = new Date(`${dataInicio}T00:00:00`).getTime();
        if (recordTime < start) return false;
      }
      if (dataFim && recordTime > 0) {
        const end = new Date(`${dataFim}T23:59:59`).getTime();
        if (recordTime > end) return false;
      }

      return true;
    });
  }, [allMergedRecords, filtroCategoria, filtroTurma, filtroBuscaNome, dataInicio, dataFim]);

  const toggleSelect = (id: string, type: 'history' | 'library') => {
    setSelectedIds(prev => {
      const exists = prev.find(p => p.id === id);
      if (exists) return prev.filter(p => p.id !== id);
      return [...prev, { id, type }];
    });
  };

  const executeBulkDelete = async () => {
    if (!selectedIds.length) return;

    try {
      notify("A apagar registos...");
      const historyIds = selectedIds.filter(s => s.type === 'history').map(s => s.id);
      const libraryIds = selectedIds.filter(s => s.type === 'library').map(s => s.id);

      if (historyIds.length) {
        await store.deleteMultipleHistoryRecords(historyIds);
      }
      if (libraryIds.length) {
        for (const lid of libraryIds) {
          await store.removeLibraryItem(lid);
        }
      }

      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      await refreshData();
      notify("Registos apagados com sucesso.");
    } catch (e) {
      notify("Erro ao apagar registos multi.");
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Foto Viewer */}
      {fotoViewer && (
        <div className="fixed inset-0 z-[130] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFotoViewer(null)}>
          <div className="relative max-w-lg w-full">
            <button onClick={() => setFotoViewer(null)} className="absolute -top-3 -right-3 bg-card text-foreground rounded-full p-2 shadow-lg z-10"><X size={20} /></button>
            <img src={fotoViewer} className="w-full rounded-2xl shadow-2xl" alt="Evidência" />
          </div>
        </div>
      )}

      {/* Delete Confirm (Single) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[120] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <Trash2 size={32} className="text-destructive mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Eliminar registo?</h3>
            <p className="text-sm text-muted-foreground mb-6">{deleteConfirm.nome}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={async () => {
                if (deleteConfirm.type === 'library') await store.removeLibraryItem(deleteConfirm.id);
                else await store.deleteHistoryRecord(deleteConfirm.id);
                setDeleteConfirm(null);
                await refreshData();
                notify("Removido.");
              }}
                className="py-3.5 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98]">Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-[120] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <Trash2 size={32} className="text-destructive mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Eliminar {selectedIds.length} registos?</h3>
            <p className="text-sm text-muted-foreground mb-6">Esta ação não pode ser revertida.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setBulkDeleteConfirm(false)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={executeBulkDelete}
                className="py-3.5 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98]">Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Only for History) */}
      {editModal && (
        <div className="fixed inset-0 z-[140] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <Edit size={32} className="text-primary mx-auto mb-4" />
            <h3 className="font-black text-xl mb-2 text-foreground">Editar Registo</h3>
            <textarea value={editText} onChange={e => setEditText(e.target.value)}
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none mb-6 text-sm font-medium focus:bg-card focus:ring-2 focus:ring-primary/20 resize-none h-28 text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setEditModal(null)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={async () => {
                if (!editText.trim()) return notify("Texto vazio!");
                await store.updateHistoryRecord(editModal.id, { detalhe: editText });
                setEditModal(null); await refreshData(); notify("Atualizado!");
              }} className="py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98]">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Action Bar */}
      {selectedIds.length > 0 && userRole === 'admin' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-destructive/90 backdrop-blur-md text-destructive-foreground px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-4 animate-slide-up border border-white/20">
          <span className="font-black whitespace-nowrap">{selectedIds.length} selecionados</span>
          <button onClick={() => setBulkDeleteConfirm(true)} className="bg-background text-foreground px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-muted transition-all active:scale-95 flex items-center gap-2">
            <Trash2 size={16} /> Apagar Seleção
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="text-sm font-black flex items-center gap-2 text-foreground"><History size={18} className="text-primary" /> Histórico de Registos</h3>
        <div className="flex flex-wrap gap-2">
          {['ocorrencia', 'medida', 'merito', 'saida', 'atraso', 'coordenação'].map(c => (
            <button key={c} onClick={() => setFiltroCategoria(filtroCategoria === c ? '' : c)}
              className={`px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border transition-all
              ${filtroCategoria === c ? categoriaColors[c] + ' shadow-sm' : 'bg-secondary text-muted-foreground border-border hover:bg-muted'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="bg-secondary border border-border rounded-2xl p-3 text-xs font-bold outline-none text-foreground appearance-none"
            value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)}>
            <option value="">Todas Turmas</option>
            {turmasExistentes.map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="text" placeholder="Buscar nome..." className="bg-secondary border border-border rounded-2xl p-3 text-xs font-medium outline-none text-foreground"
            value={filtroBuscaNome} onChange={e => setFiltroBuscaNome(e.target.value)} />
          <input type="date" title="Data Inicial" className="bg-secondary border border-border rounded-2xl p-3 text-xs font-bold outline-none text-foreground"
            value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          <input type="date" title="Data Final" className="bg-secondary border border-border rounded-2xl p-3 text-xs font-bold outline-none text-foreground"
            value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-bold bg-secondary/50 rounded-3xl border-2 border-dashed border-border text-sm">Sem registos.</div>
        ) : filtered.slice(0, 50).map(r => {
          const isSelected = selectedIds.find(s => s.id === r.id);
          return (
            <div key={`${r._type}-${r.id}`} className={`glass rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group flex gap-4 ${isSelected ? 'ring-2 ring-destructive bg-destructive/5' : ''}`}>

              {userRole === 'admin' && (
                <button onClick={() => toggleSelect(r.id, r._type)} className="mt-1 text-muted-foreground hover:text-foreground">
                  {isSelected ? <CheckSquare className="text-destructive" size={20} /> : <Square size={20} />}
                </button>
              )}

              <div className="flex-1 w-full min-w-0">
                <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                  <div className="truncate shrink">
                    <span className="font-extrabold text-sm text-foreground truncate pr-2">{r.alunoNome}</span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{r.turma}</span>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg border shrink-0 ${categoriaColors[r.categoria] || 'bg-secondary text-foreground border-border'}`}>{r.categoria}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-2 leading-relaxed whitespace-pre-wrap">{r.detalhe}</p>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-[10px] text-muted-foreground">{formatDataLista(r.timestamp)} • {formatHoraFortaleza(r.timestamp)}h • {r.professor}</span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {r.fotoUrl && <button onClick={() => setFotoViewer(r.fotoUrl!)} className="text-primary p-1"><Camera size={14} /></button>}
                    {userRole === 'admin' && (
                      <>
                        {r._type === 'history' && <button onClick={() => { setEditModal(r); setEditText(r.detalhe); }} className="text-primary p-1"><Edit size={14} /></button>}
                        <button onClick={() => setDeleteConfirm({ id: r.id, nome: r.alunoNome, type: r._type })} className="text-destructive p-1"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  );
};

export default HistoricoTab;
