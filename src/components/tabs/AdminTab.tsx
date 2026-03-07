import React, { useState, useRef } from 'react';
import { UserPlus, PlusCircle, MoveHorizontal, Trash2, XCircle, KeyRound, Lock, FileUp, Download, Clock } from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, AppConfig } from '@/types';

interface AdminTabProps {
  alunos: Aluno[];
  config: AppConfig;
  turmasExistentes: string[];
  notify: (msg: string) => void;
  refreshData: () => void;
}

const AdminTab: React.FC<AdminTabProps> = ({ alunos, config, turmasExistentes, notify, refreshData }) => {
  const [nomeNovoAluno, setNomeNovoAluno] = useState('');
  const [turmaNovoAluno, setTurmaNovoAluno] = useState('');
  const [modoNovaTurma, setModoNovaTurma] = useState(false);
  const [turmaOrigem, setTurmaOrigem] = useState('');
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null);
  const [novaTurmaDestino, setNovaTurmaDestino] = useState('');
  const [adminTurmaFiltro, setAdminTurmaFiltro] = useState('');
  const [selectedAdminAlunos, setSelectedAdminAlunos] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [tempLimit, setTempLimit] = useState(config.exitLimitMinutes);
  const [novoBlockStart, setNovoBlockStart] = useState('');
  const [novoBlockEnd, setNovoBlockEnd] = useState('');
  const [novoBlockLabel, setNovoBlockLabel] = useState('');
  const [editPasswords, setEditPasswords] = useState(config.passwords);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addStudent = () => {
    if (!nomeNovoAluno || !turmaNovoAluno) return notify("Preencha nome e turma.");
    const novo = { id: store.generateId(), nome: nomeNovoAluno.toUpperCase(), turma: turmaNovoAluno.toUpperCase() };
    store.saveConfig({ alunosList: [...alunos, novo] });
    setNomeNovoAluno(''); setTurmaNovoAluno(''); setModoNovaTurma(false);
    refreshData(); notify("Aluno adicionado!");
  };

  const deleteSelected = () => {
    if (!selectedAdminAlunos.length) return;
    store.saveConfig({ alunosList: alunos.filter(a => !selectedAdminAlunos.includes(a.id)) });
    setSelectedAdminAlunos([]); setDeleteModal(false);
    refreshData(); notify("Alunos removidos!");
  };

  const transferStudent = () => {
    if (!alunoEditando || !novaTurmaDestino) return notify("Selecione destino.");
    store.saveConfig({ alunosList: alunos.map(a => a.id === alunoEditando.id ? { ...a, turma: novaTurmaDestino.toUpperCase() } : a) });
    setTurmaOrigem(''); setAlunoEditando(null);
    refreshData(); notify("Transferência concluída!");
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = (evt.target?.result as string).split('\n');
      const newAlunos: Aluno[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().includes('turma')) return;
        const parts = line.split(',');
        if (parts.length >= 2) {
          const t = parts[0].trim().toUpperCase();
          const n = parts[1].trim().toUpperCase();
          if (t && n) newAlunos.push({ id: store.generateId(), nome: n, turma: t });
        }
      });
      if (newAlunos.length) {
        store.saveConfig({ alunosList: [...alunos, ...newAlunos] });
        refreshData(); notify(`${newAlunos.length} alunos importados!`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-[120] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <XCircle size={32} className="text-destructive mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Apagar {selectedAdminAlunos.length} aluno(s)?</h3>
            <p className="text-sm text-muted-foreground mb-6">Esta ação não pode ser desfeita.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteModal(false)} className="py-3.5 bg-secondary rounded-2xl font-bold text-muted-foreground">Cancelar</button>
              <button onClick={deleteSelected} className="py-3.5 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98]">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* New Student */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><UserPlus size={18} className="text-primary" /> Novo Aluno</h3>
        <input type="text" placeholder="Nome Completo" className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-medium text-foreground"
          value={nomeNovoAluno} onChange={e => setNomeNovoAluno(e.target.value)} />
        <div className="flex gap-2.5">
          <select className="flex-1 p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
            value={turmaNovoAluno} onChange={e => setTurmaNovoAluno(e.target.value)}>
            <option value="">Escolher Turma...</option>
            {turmasExistentes.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => setModoNovaTurma(!modoNovaTurma)} className="bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary p-4 rounded-2xl transition-colors">
            <PlusCircle size={20} />
          </button>
        </div>
        {modoNovaTurma && <input type="text" placeholder="Criar Turma (Ex: 9A)" className="w-full p-4 bg-card border-2 border-primary/30 rounded-2xl outline-none font-bold text-foreground"
          value={turmaNovoAluno} onChange={e => setTurmaNovoAluno(e.target.value)} />}
        <button onClick={addStudent} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all text-sm">Adicionar</button>
      </div>

      {/* CSV Import */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><FileUp size={18} className="text-primary" /> Importar CSV</h3>
        <p className="text-xs text-muted-foreground">Formato: TURMA,NOME (uma linha por aluno)</p>
        <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-secondary hover:bg-muted text-foreground rounded-2xl font-bold border border-border transition-colors text-sm flex items-center justify-center gap-2">
          <FileUp size={16} /> Selecionar Ficheiro CSV
        </button>
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" />
      </div>

      {/* Transfer */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><MoveHorizontal size={18} className="text-warning" /> Transferência de Sala</h3>
        <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
          onChange={e => { setTurmaOrigem(e.target.value); setAlunoEditando(null); }} value={turmaOrigem}>
          <option value="">Turma de Origem...</option>
          {turmasExistentes.map(t => <option key={t}>{t}</option>)}
        </select>
        {turmaOrigem && (
          <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
            onChange={e => setAlunoEditando(alunos.find(a => a.id === e.target.value) || null)} value={alunoEditando?.id || ''}>
            <option value="">Selecionar Aluno...</option>
            {alunos.filter(a => a.turma === turmaOrigem).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
        {alunoEditando && (
          <div className="bg-warning/10 p-5 rounded-2xl border border-warning/20 space-y-3 animate-scale-in">
            <p className="text-xs font-bold text-foreground">Transferir <span className="font-black">{alunoEditando.nome}</span> para:</p>
            <div className="flex gap-2">
              <select className="flex-1 p-3.5 border border-warning/20 rounded-xl text-sm font-semibold bg-card text-foreground appearance-none outline-none" onChange={e => setNovaTurmaDestino(e.target.value)}>
                <option value="">Destino...</option>
                {turmasExistentes.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={transferStudent} className="bg-warning text-warning-foreground px-5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all">Confirmar</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Students */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5 border-destructive/10">
        <h3 className="font-black text-sm text-destructive flex items-center gap-2"><Trash2 size={18} /> Limpeza de Registos</h3>
        <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
          value={adminTurmaFiltro} onChange={e => { setAdminTurmaFiltro(e.target.value); setSelectedAdminAlunos([]); }}>
          <option value="">Filtrar Turma...</option>
          {turmasExistentes.map(t => <option key={t}>{t}</option>)}
        </select>
        {adminTurmaFiltro && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar">
            {alunos.filter(a => a.turma === adminTurmaFiltro).map(a => (
              <button key={a.id} onClick={() => setSelectedAdminAlunos(p => p.includes(a.id) ? p.filter(x => x !== a.id) : [...p, a.id])}
                className={`p-3 rounded-xl text-xs font-bold border text-left transition-all active:scale-95
                ${selectedAdminAlunos.includes(a.id) ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-secondary text-foreground border-border'}`}>
                {a.nome}
              </button>
            ))}
          </div>
        )}
        {selectedAdminAlunos.length > 0 && (
          <button onClick={() => setDeleteModal(true)} className="w-full py-4 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all text-sm">
            Apagar {selectedAdminAlunos.length} Aluno(s)
          </button>
        )}
      </div>

      {/* Settings */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><Clock size={18} className="text-primary" /> Limite de Saída</h3>
        <div className="flex items-center gap-3">
          <input type="number" value={tempLimit} onChange={e => setTempLimit(Number(e.target.value))}
            className="w-24 p-4 bg-secondary rounded-2xl border border-border outline-none text-center font-bold text-lg text-foreground" />
          <span className="text-sm font-medium text-muted-foreground">minutos</span>
          <button onClick={() => { store.saveConfig({ exitLimitMinutes: tempLimit }); refreshData(); notify("Limite atualizado!"); }}
            className="ml-auto bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-bold shadow-md active:scale-95">Salvar</button>
        </div>
      </div>

      {/* Auto Blocks */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><Lock size={18} className="text-destructive" /> Bloqueios Automáticos</h3>
        {config.autoBlocks.map((block, idx) => (
          <div key={idx} className="flex items-center justify-between bg-secondary p-3 rounded-xl">
            <span className="text-xs font-bold text-foreground">{block.label}: {block.start} - {block.end}</span>
            <button onClick={() => {
              const blocks = config.autoBlocks.filter((_, i) => i !== idx);
              store.saveConfig({ autoBlocks: blocks }); refreshData();
            }} className="text-destructive p-1"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          <input type="time" value={novoBlockStart} onChange={e => setNovoBlockStart(e.target.value)}
            className="p-3 bg-secondary rounded-xl border border-border text-xs font-bold text-foreground outline-none" />
          <input type="time" value={novoBlockEnd} onChange={e => setNovoBlockEnd(e.target.value)}
            className="p-3 bg-secondary rounded-xl border border-border text-xs font-bold text-foreground outline-none" />
          <input type="text" placeholder="Nome" value={novoBlockLabel} onChange={e => setNovoBlockLabel(e.target.value)}
            className="p-3 bg-secondary rounded-xl border border-border text-xs font-bold text-foreground outline-none" />
        </div>
        <button onClick={() => {
          if (!novoBlockStart || !novoBlockEnd || !novoBlockLabel) return notify("Preencha todos os campos.");
          store.saveConfig({ autoBlocks: [...config.autoBlocks, { start: novoBlockStart, end: novoBlockEnd, label: novoBlockLabel }] });
          setNovoBlockStart(''); setNovoBlockEnd(''); setNovoBlockLabel('');
          refreshData(); notify("Bloqueio adicionado!");
        }} className="w-full py-3 bg-destructive/10 text-destructive rounded-2xl font-bold border border-destructive/20 active:scale-[0.98] transition-all text-sm">
          Adicionar Bloqueio
        </button>
      </div>

      {/* Passwords */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><KeyRound size={18} className="text-warning" /> PINs de Acesso</h3>
        {(['admin', 'professor', 'apoio'] as const).map(role => (
          <div key={role} className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase w-20">{role}</span>
            <input type="text" value={editPasswords[role]} onChange={e => setEditPasswords(p => ({ ...p, [role]: e.target.value }))}
              className="flex-1 p-3 bg-secondary rounded-xl border border-border text-sm font-bold outline-none text-foreground" />
          </div>
        ))}
        <button onClick={() => { store.saveConfig({ passwords: editPasswords }); refreshData(); notify("PINs atualizados!"); }}
          className="w-full py-3 bg-warning text-warning-foreground rounded-2xl font-bold shadow-md active:scale-[0.98] transition-all text-sm">
          Salvar PINs
        </button>
      </div>
    </div>
  );
};

export default AdminTab;
