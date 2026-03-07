import React, { useState, useMemo } from 'react';
import { History, Trash2, Edit, Camera, X } from 'lucide-react';
import * as store from '@/lib/store';
import { HistoryRecord, UserRole } from '@/types';

interface HistoricoTabProps {
  records: HistoryRecord[];
  turmasExistentes: string[];
  userRole: UserRole;
  notify: (msg: string) => void;
  refreshData: () => void;
}

const categoriaColors: Record<string, string> = {
  saida: 'bg-primary/10 text-primary border-primary/20',
  ocorrencia: 'bg-destructive/10 text-destructive border-destructive/20',
  merito: 'bg-accent/10 text-accent border-accent/20',
  atraso: 'bg-warning/10 text-warning border-warning/20',
  'coordenação': 'bg-secondary text-foreground border-border',
  medida: 'bg-secondary text-foreground border-border',
};

const HistoricoTab: React.FC<HistoricoTabProps> = ({ records, turmasExistentes, userRole, notify, refreshData }) => {
  const [filtroCategoria, setFiltroCategoria] = useState('ocorrencia');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroBuscaNome, setFiltroBuscaNome] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<HistoryRecord | null>(null);
  const [editModal, setEditModal] = useState<HistoryRecord | null>(null);
  const [editText, setEditText] = useState('');
  const [fotoViewer, setFotoViewer] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filtroCategoria && r.categoria !== filtroCategoria) return false;
      if (filtroTurma && r.turma !== filtroTurma) return false;
      if (filtroBuscaNome && !r.alunoNome?.toLowerCase().includes(filtroBuscaNome.toLowerCase())) return false;
      return true;
    });
  }, [records, filtroCategoria, filtroTurma, filtroBuscaNome]);

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

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[120] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <Trash2 size={32} className="text-destructive mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Eliminar registo?</h3>
            <p className="text-sm text-muted-foreground mb-6">{deleteConfirm.alunoNome}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={() => { store.deleteHistoryRecord(deleteConfirm.id); setDeleteConfirm(null); refreshData(); notify("Removido."); }}
                className="py-3.5 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98]">Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-[140] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <Edit size={32} className="text-primary mx-auto mb-4" />
            <h3 className="font-black text-xl mb-2 text-foreground">Editar Registo</h3>
            <textarea value={editText} onChange={e => setEditText(e.target.value)}
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none mb-6 text-sm font-medium focus:bg-card focus:ring-2 focus:ring-primary/20 resize-none h-28 text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setEditModal(null)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={() => {
                if (!editText.trim()) return notify("Texto vazio!");
                store.updateHistoryRecord(editModal.id, { detalhe: editText });
                setEditModal(null); refreshData(); notify("Atualizado!");
              }} className="py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98]">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="text-sm font-black flex items-center gap-2 text-foreground"><History size={18} className="text-primary" /> Histórico de Registos</h3>
        <div className="flex flex-wrap gap-2">
          {['ocorrencia', 'merito', 'saida', 'atraso', 'coordenação'].map(c => (
            <button key={c} onClick={() => setFiltroCategoria(c)}
              className={`px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border transition-all
              ${filtroCategoria === c ? categoriaColors[c] + ' shadow-sm' : 'bg-secondary text-muted-foreground border-border'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select className="bg-secondary border border-border rounded-2xl p-3 text-xs font-bold outline-none text-foreground appearance-none"
            value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)}>
            <option value="">Todas Turmas</option>
            {turmasExistentes.map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="text" placeholder="Buscar nome..." className="bg-secondary border border-border rounded-2xl p-3 text-xs font-medium outline-none text-foreground"
            value={filtroBuscaNome} onChange={e => setFiltroBuscaNome(e.target.value)} />
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-bold bg-secondary/50 rounded-3xl border-2 border-dashed border-border text-sm">Sem registos.</div>
        ) : filtered.slice(0, 50).map(r => (
          <div key={r.id} className="glass rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-extrabold text-sm text-foreground">{r.alunoNome}</span>
                <span className="text-[10px] font-bold text-muted-foreground ml-2 bg-secondary px-1.5 py-0.5 rounded">{r.turma}</span>
              </div>
              <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg border ${categoriaColors[r.categoria] || 'bg-secondary text-foreground border-border'}`}>{r.categoria}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-2 leading-relaxed">{r.detalhe}</p>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">{r.timestamp} • {r.professor}</span>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {r.fotoUrl && <button onClick={() => setFotoViewer(r.fotoUrl!)} className="text-primary p-1"><Camera size={14} /></button>}
                {userRole === 'admin' && (
                  <>
                    <button onClick={() => { setEditModal(r); setEditText(r.detalhe); }} className="text-primary p-1"><Edit size={14} /></button>
                    <button onClick={() => setDeleteConfirm(r)} className="text-destructive p-1"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoricoTab;
