import React, { useState } from 'react';
import { UserCheck, Lock, ArrowRight, Clock, User, Check, AlertTriangle, Megaphone, Trash2, AlertOctagon, Gavel } from 'lucide-react';
import LiveTimer from '@/components/LiveTimer';
import * as store from '@/lib/store';
import { ActiveExit, Aluno, AppConfig, Aviso, Suspension, UserRole, SaidasQueueItem } from '@/types';

interface SaidasTabProps {
  alunos: Aluno[];
  activeExits: ActiveExit[];
  saidasQueue: SaidasQueueItem[];
  addToSaidasQueue: (item: SaidasQueueItem) => void;
  removeFromSaidasQueue: (id: string) => void;
  config: AppConfig;
  suspensions: Suspension[];
  avisos: Aviso[];
  turmasExistentes: string[];
  userRole: UserRole;
  username: string;
  activeBlock: { start: string; end: string; label: string } | null;
  getTodayExitsCount: (id: string) => number;
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
}

const SaidasTab: React.FC<SaidasTabProps> = ({
  alunos, activeExits, saidasQueue, addToSaidasQueue, removeFromSaidasQueue, config, suspensions, avisos, turmasExistentes,
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

  const locaisSaida = ["Banheiro", "Bebedouro", "Secretaria", "Coordenação", "Biblioteca", "outros"];
  const suspendedInTurma = suspensions.filter(s => s.turma === selectedTurma);

  const finalizeExit = async (exit: ActiveExit, registerOccurrence: boolean, elapsedMins = 0) => {
    try {
      const dur = elapsedMins > 0 ? elapsedMins : Math.floor((Date.now() - exit.startTime) / 60000);
      const now = new Date();
      const ts = now.toISOString();
      const raw = now.getTime();

      await store.addHistoryRecord({
        id: store.generateId(), alunoId: exit.alunoId, alunoNome: exit.alunoNome, turma: exit.turma,
        categoria: 'saida', detalhe: `${exit.destino} (${dur} min)${exit.isEmergency ? ' [EMERGÊNCIA]' : ''}`,
        timestamp: ts, rawTimestamp: raw, professor: exit.professor || username, autorRole: exit.autorRole || userRole
      });

      if (registerOccurrence) {
        await store.addHistoryRecord({
          id: store.generateId(), alunoId: exit.alunoId, alunoNome: exit.alunoNome, turma: exit.turma,
          categoria: 'ocorrencia', detalhe: `Demora na saída (${dur} min) - Destino: ${exit.destino}`,
          timestamp: ts, rawTimestamp: raw + 1, professor: exit.professor || username, autorRole: exit.autorRole || userRole
        });
      }

      await store.removeActiveExit(exit.id);
      setOvertimeModal(null);
      await refreshData();
      notify("Retorno registado.");
    } catch (err: any) {
      console.error("FinalizeExit Error:", err);
      notify("Erro ao registar retorno: " + err.message);
    }
  };

  const handleReturnClick = async (exit: ActiveExit) => {
    const elapsedSecs = Math.floor((Date.now() - exit.startTime) / 1000);
    const limitSecs = Number(config.exitLimitMinutes) * 60;
    const elapsedMins = Math.floor(elapsedSecs / 60);
    if (elapsedSecs > limitSecs) setOvertimeModal({ exit, elapsedMinutes: elapsedMins });
    else await finalizeExit(exit, false);
  };

  const attemptReturn = async (exit: ActiveExit, isDemorou: boolean) => {
    const elapsedSecs = Math.floor((Date.now() - exit.startTime) / 1000);
    const limitSecs = Number(config.exitLimitMinutes) * 60;
    if (userRole === 'aluno' && elapsedSecs > limitSecs && !isDemorou) {
      notify("Acesso Negado: O tempo esgotou.");
      return;
    }
    if (exit.professor === username || userRole === 'admin') {
      if (isDemorou) await finalizeExit(exit, true);
      else await handleReturnClick(exit);
    } else {
      setAuthReturnModal({ exit, isDemorou });
      setAuthReturnPassword('');
    }
  };

  const confirmAuthReturn = async () => {
    if (!authReturnModal) return;
    if (authReturnPassword.toLowerCase() === 'ok') {
      if (authReturnModal.isDemorou) await finalizeExit(authReturnModal.exit, true);
      else await handleReturnClick(authReturnModal.exit);
      setAuthReturnModal(null);
    } else {
      notify("Senha incorreta!");
    }
  };

  const handleNewExit = async () => {
    try {
      const a = alunos.find(x => x.id === selectedAlunoId);
      if (!a) return notify("Selecione um aluno.");

      if (a.proibido_saida && !isEmergencyMode) {
        return notify(`⚠️ Aluno ${a.nome} está PROIBIDO de sair!`);
      }

      await store.addActiveExit({
        id: store.generateId(), alunoId: a.id, alunoNome: a.nome, turma: a.turma,
        destino: destinoSaida, startTime: Date.now(), professor: username,
        autorRole: userRole, isEmergency: (!!activeBlock || a.proibido_saida) && isEmergencyMode
      });
      setSelectedAlunoId('');
      setIsEmergencyMode(false);
      await refreshData();
      notify(activeBlock && isEmergencyMode ? "Emergência Registada!" : "Saída Autorizada!");
    } catch (err: any) {
      console.error("HandleNewExit Error:", err);
      notify("Erro ao autorizar saída: " + err.message);
    }
  };

  const handleAddToQueue = () => {
    const a = alunos.find(x => x.id === selectedAlunoId);
    if (!a) return notify("Selecione um aluno.");

    if (a.proibido_saida) {
      return notify(`⚠️ Aluno ${a.nome} está PROIBIDO de sair e não pode entrar na fila.`);
    }

    addToSaidasQueue({
      id: store.generateId(),
      alunoId: a.id,
      alunoNome: a.nome,
      turma: a.turma,
      destino: destinoSaida,
      timestamp: Date.now()
    });
    setSelectedAlunoId('');
    setIsEmergencyMode(false);
    notify("Adicionado à fila de espera!");
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

        {(() => {
          const selectedAluno = alunos.find(a => a.id === selectedAlunoId);
          const isBlockedByConfig = !!activeBlock;
          const isProhibited = selectedAluno?.proibido_saida;

          if (isBlockedByConfig || isProhibited) {
            return (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl space-y-2 animate-scale-in">
                <div className="flex items-center gap-2 text-destructive font-extrabold tracking-tight text-sm">
                  <Lock size={18} strokeWidth={2.5} /> 
                  {isBlockedByConfig ? `Bloqueio Ativo: ${activeBlock.label}` : 'Saída Proibida para este Aluno'}
                </div>
                <p className="text-xs text-destructive/80 font-medium">
                  {isBlockedByConfig 
                    ? 'Saídas normais bloqueadas. Apenas emergências permitidas.' 
                    : 'Este aluno está proibido de saídas normais pela gestão.'}
                </p>
                <label className="flex items-center gap-3 cursor-pointer mt-2 bg-card/60 p-3 rounded-xl border border-destructive/10 hover:bg-card/80 transition-colors">
                  <input type="checkbox" checked={isEmergencyMode} onChange={e => setIsEmergencyMode(e.target.checked)} className="w-5 h-5 accent-destructive rounded" />
                  <span className="text-sm font-bold text-destructive">Forçar Saída de Emergência</span>
                </label>
              </div>
            );
          }
          return null;
        })()}

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
              const isBlocked = a.proibido_saida;
              return (
                <option key={a.id} value={a.id} disabled={isSuspended}>
                  {a.nome}
                  {isSuspended ? ' (SUSPENSO)' : isBlocked ? ' (PROIBIDO)' : ''}
                </option>
              );
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

        <div className="flex gap-2.5 mt-2">
          <button onClick={handleAddToQueue}
            className={`flex-1 py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-600 text-white`}
            disabled={!selectedAlunoId || (!!activeBlock && !isEmergencyMode)}>
            <Clock size={18} /> FILA
          </button>
          <button onClick={handleNewExit}
            className={`flex-[2] py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
            ${activeBlock && isEmergencyMode ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
            disabled={!selectedAlunoId || (!!activeBlock && !isEmergencyMode)}>
            {activeBlock && isEmergencyMode ? 'EMERGÊNCIA' : 'AUTORIZAR'} <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Waitlist Queue */}
      {saidasQueue.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black flex items-center gap-2 text-yellow-600 dark:text-yellow-500 tracking-tight"><Clock size={18} strokeWidth={2.5} /> Fila de Espera ({saidasQueue.length})</h3>
          {saidasQueue.map(q => (
            <div key={q.id} className="glass rounded-2xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all group border-l-4 border-l-yellow-500">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight text-foreground tracking-tight">{q.alunoNome}</h4>
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-md">{q.turma}</span> • {q.destino}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={async () => {
                  try {
                    await store.addActiveExit({
                      id: store.generateId(), alunoId: q.alunoId, alunoNome: q.alunoNome, turma: q.turma,
                      destino: q.destino, startTime: Date.now(), professor: username,
                      autorRole: userRole, isEmergency: false
                    });
                    removeFromSaidasQueue(q.id);
                    await refreshData();
                    notify("Saída Autorizada a partir da fila!");
                  } catch(e: any) {
                    notify("Erro: " + e.message);
                  }
                }}
                  className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-primary/20 active:scale-95 transition-all flex items-center gap-1">
                  <Check size={12} strokeWidth={3} /> Autorizar
                </button>
                <button onClick={() => removeFromSaidasQueue(q.id)}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-destructive/20 active:scale-95 transition-all flex items-center justify-center">
                  <Trash2 size={12} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
              <button onClick={async () => {
                if (!novoAvisoTexto.trim()) return notify("Escreva uma mensagem.");
                await store.addAviso({ id: store.generateId(), texto: novoAvisoTexto, autor: username, timestamp: new Date().toISOString(), rawTimestamp: Date.now() });
                setNovoAvisoTexto('');
                await refreshData();
                notify("Aviso publicado!");
              }} className="w-full py-3.5 bg-foreground text-background rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all text-xs">
                PUBLICAR AVISO
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SaidasTab;
