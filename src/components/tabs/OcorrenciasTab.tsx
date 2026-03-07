import React, { useState, useRef } from 'react';
import { AlertCircle, Star, CheckCircle2, Camera, Trash2 } from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, UserRole } from '@/types';

interface OcorrenciasTabProps {
  alunos: Aluno[];
  turmasExistentes: string[];
  userRole: UserRole;
  username: string;
  notify: (msg: string) => void;
  refreshData: () => void;
}

const botoesOcorrencia = ['Passear no corredor', 'Saída sem autorização', 'Não faz a atividade', 'Sem material', 'Uso de Telemóvel', 'Entrou em sala atrasado', 'Conflito verbal', 'Atrapalhando a aula'];
const botoesMerito = ['Excelente Participação', 'Ajudou o Colega', 'Superação de Dificuldade', 'Liderança Positiva'];

const OcorrenciasTab: React.FC<OcorrenciasTabProps> = ({ alunos, turmasExistentes, userRole, username, notify, refreshData }) => {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAlunosIds, setSelectedAlunosIds] = useState<string[]>([]);
  const [registoSubTab, setRegistoSubTab] = useState<'disciplina' | 'merito'>('disciplina');
  const [ocorenciasSelecionadas, setOcorenciasSelecionadas] = useState<string[]>([]);
  const [meritosSelecionados, setMeritosSelecionados] = useState<string[]>([]);
  const [customTexto, setCustomTexto] = useState('');
  const [permanenciaStatus, setPermanenciaStatus] = useState('Continuará em sala');
  const [fotoOcorrencia, setFotoOcorrencia] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width, height = img.height;
        if (width > MAX_WIDTH) { height = height * (MAX_WIDTH / width); width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setFotoOcorrencia(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const ts = new Date().toLocaleString('pt-PT');
    const raw = Date.now();
    for (const id of selectedAlunosIds) {
      const al = alunos.find(a => a.id === id);
      if (!al) continue;
      const items = registoSubTab === 'disciplina' ? ocorenciasSelecionadas : meritosSelecionados;

      for (let i = 0; i < items.length; i++) {
        store.addHistoryRecord({
          id: store.generateId(), alunoId: al.id, alunoNome: al.nome, turma: al.turma,
          categoria: registoSubTab === 'disciplina' ? 'ocorrencia' : 'merito',
          detalhe: `${items[i]} [${permanenciaStatus}]`, timestamp: ts, rawTimestamp: raw + i,
          professor: username, autorRole: userRole, fotoUrl: fotoOcorrencia
        });
      }

      if (customTexto) {
        store.addHistoryRecord({
          id: store.generateId(), alunoId: al.id, alunoNome: al.nome, turma: al.turma,
          categoria: registoSubTab === 'disciplina' ? 'ocorrencia' : 'merito',
          detalhe: `${customTexto} [${permanenciaStatus}]`, timestamp: ts, rawTimestamp: raw + items.length,
          professor: username, autorRole: userRole, fotoUrl: fotoOcorrencia
        });
      }

      if (items.length === 0 && !customTexto) {
        store.addHistoryRecord({
          id: store.generateId(), alunoId: al.id, alunoNome: al.nome, turma: al.turma,
          categoria: registoSubTab === 'disciplina' ? 'ocorrencia' : 'merito',
          detalhe: `Registo s/ detalhe [${permanenciaStatus}]`, timestamp: ts, rawTimestamp: raw,
          professor: username, autorRole: userRole, fotoUrl: fotoOcorrencia
        });
      }

      if (registoSubTab === 'disciplina' && permanenciaStatus === 'Retirado de sala') {
        const motivos = [...items]; if (customTexto) motivos.push(customTexto);
        store.addCoordinationItem({
          id: store.generateId(), alunoId: al.id, alunoNome: al.nome, turma: al.turma,
          motivo: motivos.join(', ') || 'Retirado de sala', timestamp: ts, professor: username,
          fotoUrl: fotoOcorrencia
        });
      }
    }
    setSelectedAlunosIds([]); setOcorenciasSelecionadas([]); setMeritosSelecionados([]);
    setCustomTexto(''); setFotoOcorrencia(null);
    refreshData();
    notify(`${registoSubTab === 'disciplina' ? 'Ocorrência' : 'Mérito'} registado!`);
  };

  const isDisciplina = registoSubTab === 'disciplina';
  const buttons = isDisciplina ? botoesOcorrencia : botoesMerito;
  const selected = isDisciplina ? ocorenciasSelecionadas : meritosSelecionados;
  const setSelected = isDisciplina ? setOcorenciasSelecionadas : setMeritosSelecionados;

  return (
    <div className="glass rounded-3xl p-6 shadow-lg space-y-6 animate-slide-up">
      <div className="flex bg-secondary p-1.5 rounded-2xl gap-1">
        <button onClick={() => setRegistoSubTab('disciplina')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all
          ${isDisciplina ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>
          <AlertCircle size={16} strokeWidth={2.5} /> Disciplina
        </button>
        <button onClick={() => setRegistoSubTab('merito')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all
          ${!isDisciplina ? 'bg-card text-accent shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>
          <Star size={16} strokeWidth={2.5} /> Mérito
        </button>
      </div>

      <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-foreground appearance-none"
        onChange={e => { setSelectedTurma(e.target.value); setSelectedAlunosIds([]); }} value={selectedTurma}>
        <option value="">Filtrar Turma...</option>
        {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-2.5 max-h-52 overflow-y-auto no-scrollbar pr-1">
        {alunos.filter(a => a.turma === selectedTurma).map(a => (
          <button key={a.id} onClick={() => setSelectedAlunosIds(p => p.includes(a.id) ? p.filter(x => x !== a.id) : [...p, a.id])}
            className={`p-3.5 rounded-2xl text-xs font-bold border text-left transition-all active:scale-95 flex justify-between items-center
            ${selectedAlunosIds.includes(a.id) ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-secondary hover:bg-muted text-foreground border-border'}`}>
            <span className="truncate pr-2">{a.nome}</span>
            {selectedAlunosIds.includes(a.id) && <CheckCircle2 size={16} className="shrink-0 opacity-70" />}
          </button>
        ))}
      </div>

      {isDisciplina && selectedAlunosIds.length > 0 && (
        <div className="flex gap-2 p-1.5 bg-secondary rounded-2xl border border-border">
          <button onClick={() => setPermanenciaStatus('Retirado de sala')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${permanenciaStatus === 'Retirado de sala' ? 'bg-destructive text-destructive-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'}`}>
            Foi Retirado
          </button>
          <button onClick={() => setPermanenciaStatus('Continuará em sala')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${permanenciaStatus === 'Continuará em sala' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'}`}>
            Mantido em Sala
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {buttons.map(b => {
          const isActive = selected.includes(b);
          const activeBg = isDisciplina ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-accent/10 border-accent/30 text-accent';
          return (
            <button key={b} onClick={() => setSelected(prev => prev.includes(b) ? prev.filter(i => i !== b) : [...prev, b])}
              className={`p-3.5 rounded-2xl text-[11px] font-bold border text-left transition-all active:scale-95 leading-tight
              ${isActive ? activeBg : 'bg-card hover:bg-secondary text-foreground border-border'}`}>
              {b}
            </button>
          );
        })}
      </div>

      <textarea placeholder="Observações adicionais (opcional)..."
        className="w-full p-4 bg-secondary rounded-2xl border border-border h-24 outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium text-sm text-foreground"
        value={customTexto} onChange={e => setCustomTexto(e.target.value)} />

      <div className="pt-4 border-t border-border/40">
        {!fotoOcorrencia ? (
          <button onClick={() => fotoInputRef.current?.click()}
            className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground bg-secondary hover:bg-muted border border-border px-4 py-4 rounded-2xl transition-all w-full justify-center active:scale-[0.98]">
            <Camera size={18} strokeWidth={2.5} /> Anexar Evidência Fotográfica (Opcional)
          </button>
        ) : (
          <div className="relative inline-block w-full rounded-2xl border-2 border-primary/20 bg-primary/5 overflow-hidden group">
            <img src={fotoOcorrencia} className="w-full object-contain max-h-56 rounded-xl" alt="Evidência" />
            <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => setFotoOcorrencia(null)} className="bg-destructive text-destructive-foreground rounded-full p-3 shadow-lg hover:scale-110 transition-all">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}
        <input type="file" accept="image/*" capture="environment" ref={fotoInputRef} onChange={handleFotoUpload} className="hidden" />
      </div>

      <button onClick={handleSubmit}
        className={`w-full py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all text-sm tracking-wide
        ${isDisciplina ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'}`}>
        {isDisciplina ? 'REGISTAR OCORRÊNCIA' : 'REGISTAR MÉRITO'}
      </button>
    </div>
  );
};

export default OcorrenciasTab;
