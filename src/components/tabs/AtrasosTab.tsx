import React, { useState, useMemo } from 'react';
import { DoorOpen, Check, Clock, Search, X, AlertCircle } from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, HistoryRecord } from '@/types';

interface AtrasosTabProps {
  alunos: Aluno[];
  records: HistoryRecord[];
  turmasExistentes: string[];
  username: string;
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
}

const AtrasosTab: React.FC<AtrasosTabProps> = ({ alunos, records, username, notify, refreshData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlunosIds, setSelectedAlunosIds] = useState<string[]>([]);

  const filteredAlunos = useMemo(() => {
    if (searchTerm.trim().length === 0) return [];
    const term = searchTerm.toLowerCase();
    return alunos.filter(a => a.nome.toLowerCase().includes(term) || a.turma.toLowerCase().includes(term)).slice(0, 10);
  }, [searchTerm, alunos]);

  const studentsWithFrequentDelays = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const delaysThisMonth = records.filter(r => {
      if (r.categoria !== 'atraso') return false;
      const d = new Date(r.rawTimestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const counts: Record<string, { count: number, name: string, turma: string }> = {};
    delaysThisMonth.forEach(r => {
      if (!counts[r.alunoId]) {
        counts[r.alunoId] = { count: 0, name: r.alunoNome, turma: r.turma };
      }
      counts[r.alunoId].count++;
    });

    return Object.values(counts)
      .filter(c => c.count >= 3)
      .sort((a, b) => b.count - a.count);
  }, [records]);

  const toggleAluno = (id: string) => {
    setSelectedAlunosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSearchTerm('');
  };

  const handleRegistrar = async () => {
    if (!selectedAlunosIds.length) return notify("Selecione alunos.");

    notify("A registar entradas tardias...");
    const ts = new Date().toISOString();
    const raw = Date.now();

    for (const id of selectedAlunosIds) {
      const al = alunos.find(a => a.id === id);
      if (!al) continue;
      await store.addHistoryRecord({
        id: store.generateId(), alunoId: al.id, alunoNome: al.nome, turma: al.turma,
        categoria: 'atraso', detalhe: 'Entrada tardia registada', timestamp: ts, rawTimestamp: raw,
        professor: username
      });
    }

    setSelectedAlunosIds([]);
    await refreshData();
    notify("Entradas tardias registadas com sucesso!");
  };

  const selectedAlunosDetails = useMemo(() => {
    return selectedAlunosIds.map(id => alunos.find(a => a.id === id)).filter(Boolean) as Aluno[];
  }, [selectedAlunosIds, alunos]);

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6 shadow-lg space-y-6 animate-slide-up">
        <h3 className="text-sm font-black flex items-center gap-2 text-foreground"><DoorOpen size={18} className="text-warning" strokeWidth={2.5} /> Registar Entradas Tardias</h3>

        {/* Busca Automática */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Digite o nome do aluno ou turma..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-secondary/50 rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-warning/20 transition-all font-semibold"
          />

          {/* Autocomplete Dropdown */}
          {filteredAlunos.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-20 animate-fade-in max-h-64 overflow-y-auto">
              {filteredAlunos.map(a => {
                const isSelected = selectedAlunosIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAluno(a.id)}
                    className={`w-full text-left p-4 hover:bg-muted transition-all border-b border-border/50 last:border-0 flex justify-between items-center ${isSelected ? 'bg-warning/10' : ''}`}
                  >
                    <div>
                      <p className="font-extrabold text-foreground text-sm">{a.nome}</p>
                    </div>
                    {isSelected && <Check size={18} className="text-warning shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Alunos Selecionados Chips */}
        {selectedAlunosDetails.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-scale-in">
            {selectedAlunosDetails.map(aluno => (
              <div key={aluno.id} className="flex items-center gap-2 bg-warning/20 border border-warning/30 text-warning-foreground px-3 py-2 rounded-xl text-sm font-bold shadow-sm">
                <span>{aluno.nome}</span>
                <button onClick={() => toggleAluno(aluno.id)} className="p-1 hover:bg-warning/30 rounded-full transition-all text-warning-foreground">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedAlunosIds.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-2xl animate-scale-in mt-4">
            <Clock size={20} className="text-warning" />
            <p className="text-sm font-medium text-foreground"><span className="font-extrabold text-warning">{selectedAlunosIds.length}</span> aluno(s) aguardando registo</p>
          </div>
        )}

        <button onClick={handleRegistrar}
          className="w-full py-4 bg-warning text-warning-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all text-sm disabled:opacity-50 mt-2"
          disabled={!selectedAlunosIds.length}>
          REGISTAR ENTRADAS TARDIAS ({selectedAlunosIds.length})
        </button>
      </div>

      {/* Alunos com 3+ atrasos no mês */}
      {studentsWithFrequentDelays.length > 0 && (
        <div className="glass rounded-3xl p-6 shadow-lg space-y-4 animate-slide-up border-l-4 border-destructive">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-2 text-foreground">
              <AlertCircle size={18} className="text-destructive" strokeWidth={2.5} /> 
              Alunos com 3+ Atrasos no Mês Vigente
            </h3>
            <span className="bg-destructive/10 text-destructive text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">Atenção</span>
          </div>

          <div className="grid gap-3">
            {studentsWithFrequentDelays.map(student => (
              <div key={student.name} className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/50">
                <div>
                  <p className="font-extrabold text-sm text-foreground">{student.name}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{student.turma}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-destructive font-black text-lg">{student.count}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Atrasos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AtrasosTab;
