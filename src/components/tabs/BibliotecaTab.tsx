import React from 'react';
import { Library, UserX, UserMinus, Check } from 'lucide-react';
import * as store from '@/lib/store';
import { LibraryItem } from '@/types';

interface BibliotecaTabProps {
  libraryQueue: LibraryItem[];
  username: string;
  notify: (msg: string) => void;
  refreshData: () => void;
}

const BibliotecaTab: React.FC<BibliotecaTabProps> = ({ libraryQueue, username, notify, refreshData }) => {
  const handleAction = (item: LibraryItem, actionType: string) => {
    const now = new Date(); const ts = now.toLocaleString('pt-PT'); const raw = now.getTime();
    if (actionType === 'nao_apareceu') {
      store.addHistoryRecord({
        id: store.generateId(), alunoId: item.alunoId, alunoNome: item.alunoNome, turma: item.turma,
        categoria: 'ocorrencia', detalhe: 'Faltou à biblioteca após encaminhamento.',
        timestamp: ts, rawTimestamp: raw, professor: username
      });
      store.addCoordinationItem({
        id: store.generateId(), alunoId: item.alunoId, alunoNome: item.alunoNome, turma: item.turma,
        motivo: "NÃO APARECEU NA BIBLIOTECA (REINCIDENTE)", timestamp: ts, professor: username
      });
    } else if (actionType === 'negativo') {
      store.addHistoryRecord({
        id: store.generateId(), alunoId: item.alunoId, alunoNome: item.alunoNome, turma: item.turma,
        categoria: 'ocorrencia', detalhe: 'Comportamento negativo na biblioteca.',
        timestamp: ts, rawTimestamp: raw, professor: username
      });
    }
    store.addHistoryRecord({
      id: store.generateId(), alunoId: item.alunoId, alunoNome: item.alunoNome, turma: item.turma,
      categoria: 'medida', detalhe: `BIBLIOTECA: Resultado ${actionType.toUpperCase()}`,
      timestamp: ts, rawTimestamp: raw + 10, professor: username
    });
    store.removeLibraryItem(item.id);
    refreshData(); notify("Avaliação concluída!");
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="glass rounded-3xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 text-accent/5 pointer-events-none"><Library size={200} strokeWidth={1} /></div>
        <h3 className="font-black text-lg flex items-center gap-2 mb-6 text-foreground relative z-10">
          <div className="bg-accent/10 text-accent p-2.5 rounded-xl"><Library size={20} strokeWidth={2.5} /></div> Avaliação da Biblioteca
        </h3>
        <div className="space-y-4 relative z-10">
          {libraryQueue.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground font-bold bg-secondary/50 rounded-3xl border-2 border-dashed border-border text-sm">Nenhum aluno em cumprimento de medida.</p>
          ) : libraryQueue.map(i => (
            <div key={i.id} className="p-5 rounded-2xl bg-card border border-accent/10 shadow-md animate-scale-in">
              <div className="flex justify-between items-start mb-2">
                <p className="font-extrabold text-foreground text-base">{i.alunoNome}</p>
                <span className="text-[10px] font-extrabold uppercase text-accent bg-accent/10 px-2 py-1 rounded-lg">{i.turma}</span>
              </div>
              <div className="bg-secondary p-3.5 rounded-2xl border border-border mb-5">
                <p className="text-[11px] font-medium text-muted-foreground italic">"{i.obsCoord || "Sem observações da gestão."}"</p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <button onClick={() => handleAction(i, 'nao_apareceu')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl border border-destructive/10 active:scale-95 transition-all">
                  <UserX size={18} /><span className="text-[9px] font-extrabold uppercase">Faltou</span>
                </button>
                <button onClick={() => handleAction(i, 'negativo')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 bg-warning/10 hover:bg-warning/20 text-warning rounded-xl border border-warning/10 active:scale-95 transition-all">
                  <UserMinus size={18} /><span className="text-[9px] font-extrabold uppercase">Negativo</span>
                </button>
                <button onClick={() => handleAction(i, 'positivo')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 bg-accent text-accent-foreground rounded-xl shadow-md active:scale-95 transition-all">
                  <Check size={18} strokeWidth={3} /><span className="text-[9px] font-extrabold uppercase">Positivo</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BibliotecaTab;
