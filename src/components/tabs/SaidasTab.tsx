import React, { useState } from 'react';
import { UserCheck, Lock, ArrowRight, Clock, User, Check, AlertTriangle, Megaphone, Trash2, AlertOctagon, Gavel } from 'lucide-react';
import LiveTimer from '@/components/LiveTimer';
import * as store from '@/lib/store';
import { ActiveExit, Aluno, AppConfig, Aviso, Suspension, UserRole } from '@/types';

interface SaidasTabProps {
  alunos: Aluno[];
  activeExits: ActiveExit[];
  config: AppConfig;
  suspensions: Suspension[];
  avisos: Aviso[];
  turmasExistentes: string[];
  userRole: UserRole;
  username: string;
  activeBlock: { start: string; end: string; label: string } | null;
  getTodayExitsCount: (id: string) => number;
  notify: (msg: string) => void;
  refreshData: () => void;
}

const SaidasTab: React.FC<SaidasTabProps> = ({
  alunos, activeExits, config, suspensions, avisos, turmasExistentes,
  userRole, username, activeBlock, getTodayExitsCount, notify, refreshData
}) => {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [destinoSaida, setDestinoSaida] = useState('Banheiro');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [novoAvisoTexto, setNovoAvisoTexto] = useState('');
  const [overtimeModal, setOvertimeModal] = useState<{ exit: ActiveExit; elapsedMinutes: number } | null>(null);
  const [authReturnModal, setAuthReturnModal] = useState<{ exit: ActiveExit; isDemorou: boolean } | null>(null);
  const [authReturnPassword, setAuthReturnPassword] = useState('');

  const locaisSaida = ["Banheiro", "Bebedouro", "Secretaria", "Coordenação", "Biblioteca", "Enfermaria"];
  const suspendedInTurma = suspensions.filter(s => s.turma === selectedTurma);

  const finalizeExit = (exit: ActiveExit, registerOccurrence: boolean, elapsedMins = 0) => {
    const dur = elapsedMins > 0 ? elapsedMins : Math.floor((Date.now() - exit.startTime) / 60000);
    const now = new Date();
    const ts = now.toLocaleString('pt-PT');
    const raw = now.getTime();

    store.addHistoryRecord({
      id: store.generateId(), alunoId: exit.alunoId, alunoNome: exit.alunoNome, turma: exit.turma,
      categoria: 'saida', detalhe: `${exit.destino} (${dur} min)${exit.isEmergency ? ' [EMERGÊNCIA]' : ''}`,
      timestamp: ts, rawTimestamp: raw, professor: exit.professor || username, autorRole: exit.autorRole || userRole
    });

    if (registerOccurrence) {
      store.addHistoryRecord({
        id: store.generateId(), alunoId: exit.alunoId, alunoNome: exit.alunoNome, turma: exit.turma,
        categoria: 'ocorrencia', detalhe: `Demora na saída (${dur} min) - Destino: ${exit.destino}`,
        timestamp: ts, rawTimestamp: raw + 1, professor: exit.professor || username, autorRole: exit.autorRole || userRole
      });
    }

    store.removeActiveExit(exit.id);
    setOvertimeModal(null);
    refreshData();
    notify("Retorno registado.");
  };

  const handleReturnClick = (exit: ActiveExit) => {
    const elapsedSecs = Math.floor((Date.now() - exit.startTime) / 1000);
    const limitSecs = Number(config.exitLimitMinutes) * 60;
    const elapsedMins = Math.floor(elapsedSecs / 60);
    if (elapsedSecs > limitSecs) setOvertimeModal({ exit, elapsedMinutes: elapsedMins });
    else finalizeExit(exit, false);
  };

  const attemptReturn = (exit: ActiveExit, isDemorou: boolean) => {
    const elapsedSecs = Math.floor((Date.now() - exit.startTime) / 1000);
    const limitSecs = Number(config.exitLimitMinutes) * 60;
    if (userRole === 'aluno' && elapsedSecs > limitSecs && !isDemorou) {
      notify("Acesso Negado: O tempo esgotou.");
      return;
    }
    if (exit.professor === username || userRole === 'admin') {
      if (isDemorou) finalizeExit(exit, true);
      else handleReturnClick(exit);
    } else {
      setAuthReturnModal({ exit, isDemorou });
      setAuthReturnPassword('');
    }
  };

  const confirmAuthReturn = () => {
    if (!authReturnModal) return;
    if (authReturnPassword.toLowerCase() === 'ok') {
      if (authReturnModal.isDemorou) finalizeExit(authReturnModal.exit, true);
      else handleReturnClick(authReturnModal.exit);
      setAuthReturnModal(null);
    } else {
      notify("Senha incorreta!");
    }
  };

  const handleNewExit = () => {
    const a = alunos.find(x => x.id === selectedAlunoId);
    if (!a) return notify("Selecione um aluno.");
    store.addActiveExit({
      id: store.generateId(), alunoId: a.id, alunoNome: a.nome, turma: a.turma,
      destino: destinoSaida, startTime: Date.now(), professor: username,
      autorRole: userRole, isEmergency: !!activeBlock && isEmergencyMode
    });
    setSelectedAlunoId('');
    setIsEmergencyMode(false);
    refreshData();
    notify(activeBlock && isEmergencyMode ? "Emergência Registada!" : "Saída Autorizada!");
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Overtime Modal */}
      {overtimeModal && (
        <div className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-destructive/30 animate-scale-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
            <AlertTriangle size={48} className="text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-black mb-2 tracking-tight text-foreground">Tempo Excedido!</h2>
            <div className="inline-block bg-destructive/10 px-4 py-2 rounded-xl border border-destructive/20 mb-8">
              <p className="font-bold text-destructive text-lg">{overtimeModal.elapsedMinutes} min fora da sala</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => finalizeExit(overtimeModal.exit, true, overtimeModal.elapsedMinutes)}
                className="w-full py-4 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all">
                Registar Ocorrência
              </button>
              {userRole !== 'aluno' && (
                <button onClick={() => finalizeExit(overtimeModal.exit, false, overtimeModal.elapsedMinutes)}
                  className="w-full py-4 bg-secondary hover:bg-muted rounded-2xl font-bold text-foreground transition-colors">
                  Apenas Retornar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Return Modal */}
      {authReturnModal && (
        <div className="fixed inset-0 z-[120] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
            <Lock size={32} className="text-primary mx-auto mb-4" />
            <h3 className="font-black text-xl mb-2 text-foreground tracking-tight">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground mb-6 font-medium">
              Esta saída foi autorizada por <span className="font-bold text-foreground">{authReturnModal.exit.professor}</span>. Digite "ok" para confirmar.
            </p>
            <input type="password" value={authReturnPassword} onChange={e => setAuthReturnPassword(e.target.value)} placeholder='Digite "ok"'
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none mb-6 text-center font-extrabold tracking-widest text-lg focus:ring-2 focus:ring-primary/20 transition-all text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAuthReturnModal(null)} className="py-3.5 bg-secondary hover:bg-muted rounded-2xl font-bold text-muted-foreground transition-colors">Cancelar</button>
              <button onClick={confirmAuthReturn} className="py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Authorize Exit Form */}
      <div className={`glass rounded-3xl p-6 shadow-lg space-y-5 transition-colors ${activeBlock ? 'border-destructive/30 bg-destructive/5' : ''}`}>
        <h3 className="text-sm font-black flex items-center gap-2 text-primary tracking-tight"><UserCheck size={18} strokeWidth={2.5} /> Autorizar Saída</h3>

        {activeBlock && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-destructive font-extrabold tracking-tight text-sm">
              <Lock size={18} strokeWidth={2.5} /> Bloqueio Ativo: {activeBlock.label}
            </div>
            <p className="text-xs text-destructive/80 font-medium">Saídas normais bloqueadas. Apenas emergências permitidas.</p>
            <label className="flex items-center gap-3 cursor-pointer mt-2 bg-card/60 p-3 rounded-xl border border-destructive/10 hover:bg-card/80 transition-colors">
              <input type="checkbox" checked={isEmergencyMode} onChange={e => setIsEmergencyMode(e.target.checked)} className="w-5 h-5 accent-destructive rounded" />
              <span className="text-sm font-bold text-destructive">Forçar Saída de Emergência</span>
            </label>
          </div>
        )}

        <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-foreground appearance-none"
          onChange={e => { setSelectedTurma(e.target.value); setSelectedAlunoId(''); }} value={selectedTurma}>
          <option value="">Escolher Turma...</option>
          {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {selectedTurma && suspendedInTurma.length > 0 && (
          <div className="p-4 bg-destructive/5 border border-destructive/15 rounded-2xl">
            <p className="text-xs font-extrabold text-destructive flex items-center gap-2 mb-2"><AlertOctagon size={16} /> Alunos Suspensos:</p>
            <div className="flex flex-wrap gap-1.5">
              {suspendedInTurma.map(s => (
                <span key={s.id} className="text-[11px] text-destructive font-bold bg-card px-2 py-1 rounded-md">• {s.alunoNome}</span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-foreground appearance-none disabled:opacity-60"
            onChange={e => setSelectedAlunoId(e.target.value)} value={selectedAlunoId} disabled={!selectedTurma}>
            <option value="">Selecionar Aluno...</option>
            {alunos.filter(a => a.turma === selectedTurma).map(a => {
              const isSuspended = suspendedInTurma.some(s => s.alunoId === a.id);
              return <option key={a.id} value={a.id} disabled={isSuspended}>{a.nome}{isSuspended ? ' (SUSPENSO)' : ''}</option>;
            })}
          </select>
          {selectedAlunoId && (
            <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl animate-scale-in">
              <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><Clock size={20} strokeWidth={2.5} /></div>
              <p className="text-sm font-medium text-foreground">Este aluno já saiu <span className="font-extrabold text-lg text-primary">{getTodayExitsCount(selectedAlunoId)}</span> vezes hoje.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {locaisSaida.map(l => (
            <button key={l} onClick={() => setDestinoSaida(l)}
              className={`py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition-all active:scale-95
              ${destinoSaida === l ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground border-border hover:bg-muted'}`}>
              {l}
            </button>
          ))}
        </div>

        <button onClick={handleNewExit}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
          ${activeBlock && isEmergencyMode ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
          disabled={!selectedAlunoId || (!!activeBlock && !isEmergencyMode)}>
          {activeBlock && isEmergencyMode ? 'CONFIRMAR EMERGÊNCIA' : 'CONFIRMAR SAÍDA'} <ArrowRight size={18} />
        </button>
      </div>

      {/* Active Exits List */}
      <div className="space-y-3">
        {activeExits.map(e => (
          <div key={e.id} className="glass rounded-2xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <User size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm leading-tight text-foreground tracking-tight">{e.alunoNome}</h4>
                <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-md">{e.turma}</span> • {e.destino}
                  <span className="text-primary">{e.autorRole === 'aluno' ? 'Aluno(a)' : 'Prof.'} {e.professor}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              <LiveTimer startTime={e.startTime} limitSeconds={config.exitLimitMinutes * 60} />
              <div className="flex gap-1.5">
                <button onClick={() => attemptReturn(e, false)}
                  className="bg-foreground text-background px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1">
                  <Check size={12} strokeWidth={3} /> Voltou
                </button>
                <button onClick={() => attemptReturn(e, true)}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-destructive/20 active:scale-95 transition-all">
                  Demorou
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Avisos Section */}
      {userRole !== 'aluno' && (
        <div className="pt-6 border-t border-border/40 mt-8 space-y-5">
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="bg-primary/10 p-2 rounded-xl text-primary"><Megaphone size={18} strokeWidth={2.5} /></div>
            <h3 className="font-extrabold text-sm text-foreground tracking-tight">Mural de Avisos da Gestão</h3>
          </div>

          {userRole === 'admin' && (
            <div className="glass rounded-3xl p-5 shadow-lg space-y-3">
              <textarea className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none font-medium text-sm resize-none h-24 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                placeholder="Escreva um aviso para os professores e gestão..." value={novoAvisoTexto} onChange={e => setNovoAvisoTexto(e.target.value)} />
              <button onClick={() => {
                if (!novoAvisoTexto.trim()) return notify("Escreva uma mensagem.");
                store.addAviso({ id: store.generateId(), texto: novoAvisoTexto, autor: username, timestamp: new Date().toLocaleString('pt-PT'), rawTimestamp: Date.now() });
                setNovoAvisoTexto('');
                refreshData();
                notify("Aviso publicado!");
              }} className="w-full py-3.5 bg-foreground text-background rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all text-xs">
                PUBLICAR AVISO
              </button>
            </div>
          )}

          <div className="space-y-3">
            {avisos.length === 0 && suspensions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground font-bold bg-secondary/50 rounded-3xl border-2 border-dashed border-border text-xs">
                Nenhum aviso importante no momento.
              </div>
            ) : (
              <>
                {suspensions.map(s => (
                  <div key={`susp-${s.id}`} className="bg-destructive/5 p-5 rounded-2xl border border-destructive/15 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-destructive" />
                    <div className="flex justify-between items-start mb-2.5 ml-2">
                      <span className="font-extrabold text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-md flex items-center gap-1.5"><Gavel size={12} /> ALUNO SUSPENSO</span>
                      <span className="text-[10px] font-bold text-destructive/70">{s.returnDate.split('-').reverse().join('/')}</span>
                    </div>
                    <p className="text-sm text-foreground ml-2 font-bold">{s.alunoNome} <span className="text-xs font-semibold text-muted-foreground bg-card px-1.5 py-0.5 rounded shadow-sm">{s.turma}</span></p>
                  </div>
                ))}
                {avisos.map(aviso => (
                  <div key={aviso.id} className="glass p-5 rounded-2xl shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                    <div className="flex justify-between items-start mb-3 ml-2">
                      <span className="font-extrabold text-xs text-primary bg-primary/10 px-2 py-1 rounded-md">Gestão: {aviso.autor}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{aviso.timestamp}</span>
                    </div>
                    <p className="text-sm text-foreground ml-2 font-medium whitespace-pre-wrap">{aviso.texto}</p>
                    {userRole === 'admin' && (
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => { store.removeAviso(aviso.id); refreshData(); notify("Aviso removido."); }}
                          className="text-destructive/60 hover:text-destructive flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 bg-destructive/5 hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 size={12} strokeWidth={2.5} /> Apagar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SaidasTab;
