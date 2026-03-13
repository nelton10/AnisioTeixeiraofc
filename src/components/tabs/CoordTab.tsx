import React, { useState, useMemo } from 'react';
import { GraduationCap, ArrowRight, Library, Gavel, AlertOctagon, CheckCircle2, Camera, X, Bell, ShieldAlert, CalendarClock, Send } from 'lucide-react';
import * as store from '@/lib/store';
import { CoordinationItem, Suspension, UserRole, Aviso, HistoryRecord, Aluno } from '@/types';

interface CoordTabProps {
  coordinationQueue: CoordinationItem[];
  suspensions: Suspension[];
  avisos: Aviso[];
  records: HistoryRecord[];
  alunos: Aluno[];
  userRole: UserRole;
  username: string;
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
}

const CoordTab: React.FC<CoordTabProps> = ({ coordinationQueue, suspensions, avisos, records, alunos, username, notify, refreshData }) => {
  const [coordObs, setCoordObs] = useState('');
  const [suspensionModal, setSuspensionModal] = useState<CoordinationItem | null>(null);
  const [suspensionReturnDate, setSuspensionReturnDate] = useState('');
  const [endSuspensionModal, setEndSuspensionModal] = useState<Suspension | null>(null);
  const [endSuspensionObs, setEndSuspensionObs] = useState('');
  const [fotoViewer, setFotoViewer] = useState<string | null>(null);
  const [novoAviso, setNovoAviso] = useState('');

  // Early Warning System Logic
  const warnings = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentRecords = records.filter(r => r.rawTimestamp >= oneWeekAgo.getTime());

    const countMap: Record<string, { atrasos: number, ocorrencias: number, nome: string, turma: string }> = {};

    recentRecords.forEach(r => {
      if (r.categoria !== 'atraso' && r.categoria !== 'ocorrencia') return;
      if (!countMap[r.alunoId]) {
        countMap[r.alunoId] = { atrasos: 0, ocorrencias: 0, nome: r.alunoNome, turma: r.turma };
      }
      if (r.categoria === 'atraso') countMap[r.alunoId].atrasos++;
      if (r.categoria === 'ocorrencia') countMap[r.alunoId].ocorrencias++;
    });

    const activeWarnings = Object.values(countMap).filter(c => c.atrasos >= 3 || c.ocorrencias >= 3);
    return activeWarnings;
  }, [records]);

  const handlePostAviso = async () => {
    if (!novoAviso.trim()) return;
    const now = new Date();
    await store.addAviso({
      id: store.generateId(),
      texto: novoAviso,
      autor: username,
      // A CORREÇÃO ESTÁ AQUI
      timestamp: now.toISOString(),
      rawTimestamp: now.getTime()
    });
    setNovoAviso('');
    await refreshData();
    notify("Aviso postado com sucesso!");
  };

  const handleDeleteAviso = async (id: string) => {
    await store.removeAviso(id);
    await refreshData();
    notify("Aviso removido!");
  };

  const handleAction = async (item: CoordinationItem, type: string) => {
    // A CORREÇÃO ESTÁ AQUI
    const now = new Date(); const ts = now.toISOString(); const raw = now.getTime();
    
    // Fetch full item to get photo if it exists (for history persistence)
    let photo = item.fotoUrl;
    if (!photo) {
      const full = await store.getCoordinationItemWithPhoto(item.id);
      photo = full?.fotoUrl || null;
    }

    await store.addHistoryRecord({
      id: store.generateId(), alunoId: item.alunoId, alunoNome: item.alunoNome, turma: item.turma,
      categoria: 'coordenação', detalhe: `Ação de Coordenação: ${type.toUpperCase()}. OBS: ${coordObs || 'Nenhuma'}`,
      timestamp: ts, rawTimestamp: raw, professor: username, fotoUrl: photo
    });
    if (type === 'biblioteca') {
      await store.addLibraryItem({
        id: store.generateId(), alunoId: item.alunoId, alunoNome: item.alunoNome, turma: item.turma,
        timestamp: ts, professorCoord: username, obsCoord: coordObs, fotoUrl: photo
      });
    }
    await store.removeCoordinationItem(item.id);
    setCoordObs(''); await refreshData(); notify(`Ação registada: ${type.toUpperCase()}!`);
  };

  const handleSuspend = async () => {
    if (!suspensionModal || !suspensionReturnDate) return notify("Insira a data de retorno!");
    // A CORREÇÃO ESTÁ AQUI
    const now = new Date(); const ts = now.toISOString(); const raw = now.getTime();

    // Fetch full item to get photo
    let photo = suspensionModal.fotoUrl;
    if (!photo) {
      const full = await store.getCoordinationItemWithPhoto(suspensionModal.id);
      photo = full?.fotoUrl || null;
    }

    await store.addHistoryRecord({
      id: store.generateId(), alunoId: suspensionModal.alunoId, alunoNome: suspensionModal.alunoNome, turma: suspensionModal.turma,
      categoria: 'coordenação', detalhe: `SUSPENSÃO. Retorna dia: ${suspensionReturnDate.split('-').reverse().join('/')}. OBS: ${coordObs || 'Nenhuma'}`,
      timestamp: ts, rawTimestamp: raw, professor: username, fotoUrl: photo
    });
    await store.addSuspension({
      id: store.generateId(), alunoId: suspensionModal.alunoId, alunoNome: suspensionModal.alunoNome,
      turma: suspensionModal.turma, returnDate: suspensionReturnDate, timestamp: ts
    });
    await store.removeCoordinationItem(suspensionModal.id);
    setCoordObs(''); setSuspensionModal(null); setSuspensionReturnDate('');
    await refreshData(); notify("Suspensão aplicada!");
  };

  const handleEndSuspension = async () => {
    if (!endSuspensionModal || !endSuspensionObs.trim()) return notify("Registe as observações!");
    // A CORREÇÃO ESTÁ AQUI
    const now = new Date(); const ts = now.toISOString(); const raw = now.getTime();
    await store.addHistoryRecord({
      id: store.generateId(), alunoId: endSuspensionModal.alunoId, alunoNome: endSuspensionModal.alunoNome, turma: endSuspensionModal.turma,
      categoria: 'coordenação', detalhe: `SUSPENSÃO ENCERRADA. OBS: ${endSuspensionObs}`,
      timestamp: ts, rawTimestamp: raw, professor: username
    });
    await store.removeSuspension(endSuspensionModal.id);
    setEndSuspensionModal(null); setEndSuspensionObs(''); await refreshData(); notify("Suspensão encerrada!");
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {fotoViewer && (
        <div className="fixed inset-0 z-[130] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFotoViewer(null)}>
          <div className="relative max-w-lg w-full">
            <button onClick={() => setFotoViewer(null)} className="absolute -top-3 -right-3 bg-card rounded-full p-2 shadow-lg z-10"><X size={20} /></button>
            <img src={fotoViewer} className="w-full rounded-2xl shadow-2xl" alt="Evidência" />
          </div>
        </div>
      )}

      {suspensionModal && (
        <div className="fixed inset-0 z-[120] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-foreground/10 animate-scale-in">
            <Gavel size={32} className="text-foreground mx-auto mb-4" />
            <h3 className="font-black text-xl mb-2 text-foreground">Aplicar Suspensão</h3>
            <p className="text-sm text-muted-foreground mb-6">{suspensionModal.alunoNome}</p>
            <input type="date" value={suspensionReturnDate} onChange={e => setSuspensionReturnDate(e.target.value)}
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none mb-6 text-center font-bold text-lg text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSuspensionModal(null)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={handleSuspend} className="py-3.5 bg-foreground text-background rounded-2xl font-bold shadow-lg active:scale-[0.98]">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {endSuspensionModal && (
        <div className="fixed inset-0 z-[130] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-destructive/30 animate-scale-in">
            <Gavel size={32} className="text-destructive mx-auto mb-4" />
            <h3 className="font-black text-xl mb-2 text-foreground">Encerrar Suspensão</h3>
            <p className="text-sm text-muted-foreground mb-4">{endSuspensionModal.alunoNome}</p>
            <textarea value={endSuspensionObs} onChange={e => setEndSuspensionObs(e.target.value)}
              placeholder="Observações do atendimento (obrigatório)..."
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none mb-6 text-sm font-medium resize-none h-28 text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setEndSuspensionModal(null)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={handleEndSuspension} className="py-3.5 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98]">Encerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-3xl p-6 shadow-lg relative overflow-hidden mb-6">
        <div className="absolute -top-10 -right-10 text-primary/5 pointer-events-none"><GraduationCap size={200} strokeWidth={1} /></div>
        <h3 className="font-black text-lg flex items-center gap-2 mb-6 text-foreground relative z-10">
          <div className="bg-primary/10 text-primary p-2.5 rounded-xl"><GraduationCap size={20} strokeWidth={2.5} /></div> Fila da Coordenação
        </h3>
        <div className="space-y-4 relative z-10">
          {coordinationQueue.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground font-bold bg-secondary/50 rounded-3xl border-2 border-dashed border-border text-sm">Nenhum aluno encaminhado.</p>
          ) : coordinationQueue.map(i => (
            <div key={i.id} className="p-5 rounded-2xl bg-card border border-primary/10 shadow-md animate-scale-in">
              <div className="flex justify-between items-start mb-3">
                <p className="font-extrabold text-foreground text-base">{i.alunoNome}</p>
                <span className="text-[10px] font-extrabold uppercase text-primary bg-primary/10 px-2 py-1 rounded-lg">{i.turma}</span>
              </div>
              {i.fotoUrl !== undefined && (
                <button onClick={async () => {
                  if (i.fotoUrl) { setFotoViewer(i.fotoUrl); return; }
                  notify("A carregar evidência...");
                  const full = await store.getCoordinationItemWithPhoto(i.id);
                  if (full?.fotoUrl) setFotoViewer(full.fotoUrl);
                  else notify("Imagem não encontrada.");
                }}
                  className="text-[10px] flex items-center gap-1.5 text-destructive font-bold bg-destructive/5 w-fit px-3 py-1.5 rounded-xl border border-destructive/10 hover:bg-destructive/10 transition-colors mb-3">
                  <Camera size={14} /> Ver Evidência
                </button>
              )}
              <div className="bg-secondary p-3.5 rounded-2xl border border-border mb-4">
                <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">Motivo:</span> {i.motivo}</p>
              </div>
              <textarea placeholder="Observações da gestão..." className="w-full p-4 text-xs bg-card rounded-2xl border border-border h-20 mb-4 outline-none focus:ring-2 focus:ring-primary/20 resize-none text-foreground"
                value={coordObs} onChange={e => setCoordObs(e.target.value)} />
              <div className="grid grid-cols-3 gap-2.5">
                <button onClick={() => handleAction(i, 'sala')}
                  className="py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-bold active:scale-95 transition-all flex flex-col items-center gap-1.5">
                  <ArrowRight size={16} /> Para Sala
                </button>
                <button onClick={() => handleAction(i, 'biblioteca')}
                  className="py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold shadow-md active:scale-95 transition-all flex flex-col items-center gap-1.5">
                  <Library size={16} /> Biblioteca
                </button>
                <button onClick={() => setSuspensionModal(i)}
                  className="py-3 bg-foreground text-background rounded-xl text-[10px] font-bold shadow-md active:scale-95 transition-all flex flex-col items-center gap-1.5">
                  <Gavel size={16} /> Suspensão
                </button>
              </div>
            </div>
          ))}
        </div>

        {suspensions.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border/40 relative z-10 space-y-4">
            <h4 className="font-extrabold text-sm flex items-center gap-2 text-destructive uppercase"><Gavel size={16} /> Suspensões Vigentes</h4>
            {suspensions.map(s => (
              <div key={s.id} className="p-5 rounded-2xl bg-destructive/5 border border-destructive/10 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <p className="font-extrabold text-foreground text-base">{s.alunoNome}</p>
                  <span className="text-[10px] font-extrabold uppercase text-destructive bg-destructive/10 px-2 py-1 rounded-lg">{s.turma}</span>
                </div>
                <div className="bg-card p-3.5 rounded-2xl border border-destructive/10 mb-4">
                  <p className="text-xs text-destructive font-bold flex items-center gap-1.5 mb-1"><AlertOctagon size={16} /> Responsável ainda não compareceu</p>
                  <p className="text-[11px] text-muted-foreground">Retorno: <span className="font-bold text-foreground">{s.returnDate.split('-').reverse().join('/')}</span></p>
                </div>
                <button onClick={() => setEndSuspensionModal(s)}
                  className="w-full py-3 bg-destructive text-destructive-foreground rounded-xl text-[11px] font-bold shadow-md active:scale-95 transition-all flex justify-center items-center gap-1.5">
                  <CheckCircle2 size={16} /> Finalizar e Libertar Acesso
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Early Warning System */}
      {warnings.length > 0 && (
        <div className="glass rounded-3xl p-6 shadow-lg border-l-4 border-l-destructive mb-6 animate-pulse-slow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ShieldAlert size={100} /></div>
          <h3 className="font-black text-sm text-destructive uppercase tracking-widest flex items-center gap-2 mb-4 relative z-10">
            <AlertOctagon size={18} /> Early Warning System (Últimos 7 dias)
          </h3>
          <div className="space-y-3 relative z-10">
            {warnings.map((w, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-card border border-destructive/20 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-foreground">{w.nome}</p>
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground">{w.turma}</p>
                </div>
                <div className="flex gap-3 text-right">
                  {w.ocorrencias >= 3 && <span className="text-xs font-bold text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-1 rounded-md"><ShieldAlert size={12} /> {w.ocorrencias} Ocorrências</span>}
                  {w.atrasos >= 3 && <span className="text-xs font-bold text-warning flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-md"><CalendarClock size={12} /> {w.atrasos} Atrasos</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avisos Section */}
      <div className="glass rounded-3xl p-6 shadow-lg mb-6 border border-blue-500/20">
        <h3 className="font-black text-lg flex items-center gap-2 mb-4 text-foreground">
          <div className="bg-blue-500/10 text-blue-500 p-2 rounded-xl"><Bell size={20} strokeWidth={2.5} /></div> Mural de Avisos (Para Pais)
        </h3>

        <div className="flex gap-2 mb-6">
          <input type="text" value={novoAviso} onChange={e => setNovoAviso(e.target.value)}
            placeholder="Digite um novo aviso para os pais..."
            className="flex-1 p-3 bg-secondary rounded-xl border border-border outline-none text-sm font-medium" />
          <button onClick={handlePostAviso} className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors shadow-md">
            <Send size={18} />
          </button>
        </div>

        {avisos.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Avisos Ativos</p>
            {avisos.map(aviso => (
              <div key={aviso.id} className="p-3 bg-card border border-border rounded-xl flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{aviso.texto}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Por {aviso.autor} em {aviso.timestamp}</p>
                </div>
                <button onClick={() => handleDeleteAviso(aviso.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordTab;
