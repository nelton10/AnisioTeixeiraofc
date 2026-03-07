import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Aluno, HistoryRecord } from '@/types';

interface PesquisaTabProps {
  alunos: Aluno[];
  records: HistoryRecord[];
  turmasExistentes: string[];
}

const PesquisaTab: React.FC<PesquisaTabProps> = ({ alunos, records, turmasExistentes }) => {
  const [filtroBuscaNome, setFiltroBuscaNome] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [filtroAlunoId, setFiltroAlunoId] = useState('');

  const studentSummary = useMemo(() => {
    const map: Record<string, { id: string; nome: string; turma: string; saidas: number; ocorrencias: number; meritos: number; atrasos: number }> = {};
    records.forEach(r => {
      if (!r.alunoId) return;
      if (!map[r.alunoId]) map[r.alunoId] = { id: r.alunoId, nome: r.alunoNome || "?", turma: r.turma, saidas: 0, ocorrencias: 0, meritos: 0, atrasos: 0 };
      if (r.categoria === 'saida') map[r.alunoId].saidas++;
      if (r.categoria === 'ocorrencia') map[r.alunoId].ocorrencias++;
      if (r.categoria === 'merito') map[r.alunoId].meritos++;
      if (r.categoria === 'atraso') map[r.alunoId].atrasos++;
    });
    return Object.values(map).sort((a, b) => b.ocorrencias - a.ocorrencias || a.nome.localeCompare(b.nome));
  }, [records]);

  const filtered = studentSummary.filter(s =>
    (!selectedTurma || s.turma === selectedTurma) &&
    (!filtroAlunoId || s.id === filtroAlunoId) &&
    (!filtroBuscaNome || s.nome.toLowerCase().includes(filtroBuscaNome.toLowerCase()))
  );

  const singleStudent = filtered.length === 1 && (filtroBuscaNome || filtroAlunoId);

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="glass rounded-3xl shadow-lg overflow-hidden">
        <div className="bg-secondary/50 p-6 border-b border-border space-y-5">
          <h3 className="font-black text-sm text-foreground flex items-center gap-2"><Search size={18} className="text-primary" /> Diretório de Alunos</h3>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="Pesquisar por nome..." value={filtroBuscaNome} onChange={e => setFiltroBuscaNome(e.target.value)}
              className="w-full pl-11 pr-4 py-4 rounded-2xl border border-border bg-card outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-foreground shadow-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-card border border-border rounded-2xl p-4 text-xs font-bold outline-none text-foreground appearance-none"
              value={selectedTurma} onChange={e => { setSelectedTurma(e.target.value); setFiltroAlunoId(''); }}>
              <option value="">Todas as Turmas</option>
              {turmasExistentes.map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="bg-card border border-border rounded-2xl p-4 text-xs font-bold outline-none text-foreground appearance-none"
              value={filtroAlunoId} onChange={e => setFiltroAlunoId(e.target.value)}>
              <option value="">Todos os Alunos</option>
              {alunos.filter(a => !selectedTurma || a.turma === selectedTurma).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
        </div>

        {singleStudent && (
          <div className="bg-primary/5 border-b border-primary/10 p-5 mx-0 flex items-center gap-4 animate-scale-in">
            <div className="bg-primary text-primary-foreground w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-md shrink-0">
              {filtered[0].nome.charAt(0)}
            </div>
            <div>
              <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2.5 mb-1">
                {filtered[0].nome}
                <span className="text-[10px] bg-card border border-primary/20 px-2 py-0.5 rounded-lg text-primary font-extrabold">{filtered[0].turma}</span>
              </h4>
              <p className="text-xs text-muted-foreground font-medium">
                <span className="font-bold text-destructive">{filtered[0].ocorrencias} ocorrências</span>,{' '}
                <span className="font-bold text-primary">{filtered[0].saidas} saídas</span>,{' '}
                <span className="font-bold text-warning">{filtered[0].atrasos} entradas</span> e{' '}
                <span className="font-bold text-accent">{filtered[0].meritos} méritos</span>.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto no-scrollbar p-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider border-b border-border">
                <th className="px-5 py-4">Aluno</th>
                <th className="px-2 py-4 text-center">S</th>
                <th className="px-2 py-4 text-center text-destructive/60">O</th>
                <th className="px-2 py-4 text-center text-accent/60">M</th>
                <th className="px-2 py-4 text-center text-warning/60">E</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.map((s, idx) => (
                <tr key={idx} className="hover:bg-secondary/50 transition-colors group border-b border-border/30 last:border-0">
                  <td className="px-5 py-4">
                    <span className="font-extrabold text-foreground block">{s.nome}</span>
                    <span className="font-bold text-muted-foreground text-[10px] uppercase mt-0.5 inline-block">{s.turma}</span>
                  </td>
                  <td className="px-2 py-4 text-center font-bold text-muted-foreground">{s.saidas || '-'}</td>
                  <td className="px-2 py-4 text-center font-bold text-destructive">{s.ocorrencias || '-'}</td>
                  <td className="px-2 py-4 text-center font-bold text-accent">{s.meritos || '-'}</td>
                  <td className="px-2 py-4 text-center font-bold text-warning">{s.atrasos || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PesquisaTab;
