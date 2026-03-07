import React, { useState } from 'react';
import { DoorOpen, Check, Clock } from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno } from '@/types';

interface AtrasosTabProps {
  alunos: Aluno[];
  turmasExistentes: string[];
  username: string;
  notify: (msg: string) => void;
  refreshData: () => void;
}

const AtrasosTab: React.FC<AtrasosTabProps> = ({ alunos, turmasExistentes, username, notify, refreshData }) => {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAlunosIds, setSelectedAlunosIds] = useState<string[]>([]);

  const handleRegistrar = () => {
    if (!selectedAlunosIds.length) return notify("Selecione alunos.");
    const ts = new Date().toLocaleString('pt-PT');
    const raw = Date.now();
    for (const id of selectedAlunosIds) {
      const al = alunos.find(a => a.id === id);
      if (!al) continue;
      store.addHistoryRecord({
        id: store.generateId(), alunoId: al.id, alunoNome: al.nome, turma: al.turma,
        categoria: 'atraso', detalhe: 'Entrada tardia registada', timestamp: ts, rawTimestamp: raw,
        professor: username
      });
    }
    setSelectedAlunosIds([]);
    refreshData();
    notify("Entradas tardias registadas!");
  };

  return (
    <div className="glass rounded-3xl p-6 shadow-lg space-y-6 animate-slide-up">
      <h3 className="text-sm font-black flex items-center gap-2 text-foreground"><DoorOpen size={18} className="text-warning" strokeWidth={2.5} /> Registar Entradas Tardias</h3>
      <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-warning/20 transition-all font-semibold text-foreground appearance-none"
        onChange={e => { setSelectedTurma(e.target.value); setSelectedAlunosIds([]); }} value={selectedTurma}>
        <option value="">Escolher Turma...</option>
        {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto no-scrollbar">
        {alunos.filter(a => a.turma === selectedTurma).map(a => (
          <button key={a.id} onClick={() => setSelectedAlunosIds(p => p.includes(a.id) ? p.filter(x => x !== a.id) : [...p, a.id])}
            className={`p-3.5 rounded-2xl text-xs font-bold border text-left transition-all active:scale-95 flex justify-between items-center
            ${selectedAlunosIds.includes(a.id) ? 'bg-warning border-warning text-warning-foreground shadow-md' : 'bg-secondary text-foreground border-border hover:bg-muted'}`}>
            <span className="truncate pr-2">{a.nome}</span>
            {selectedAlunosIds.includes(a.id) && <Check size={16} className="shrink-0" />}
          </button>
        ))}
      </div>

      {selectedAlunosIds.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-2xl animate-scale-in">
          <Clock size={20} className="text-warning" />
          <p className="text-sm font-medium text-foreground"><span className="font-extrabold text-warning">{selectedAlunosIds.length}</span> aluno(s) selecionado(s)</p>
        </div>
      )}

      <button onClick={handleRegistrar}
        className="w-full py-4 bg-warning text-warning-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all text-sm disabled:opacity-50"
        disabled={!selectedAlunosIds.length}>
        REGISTAR ENTRADAS TARDIAS
      </button>
    </div>
  );
};

export default AtrasosTab;
