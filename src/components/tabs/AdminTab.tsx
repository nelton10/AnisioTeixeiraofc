import React, { useRef, useState } from 'react';
import {
  Download,
  RotateCcw,
  ShieldAlert,
  Database,
  Plus,
  Trash2,
  Save,
  Key,
  Clock,
  Timer,
  ShieldCheck
} from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, HistoryRecord, AppConfig } from '@/types';

interface AdminTabProps {
  alunos: Aluno[];
  history: HistoryRecord[];
  config: AppConfig;
  saveConfig: (data: Partial<AppConfig>) => Promise<void>;
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
}

const AdminTab: React.FC<AdminTabProps> = ({ alunos, history, config, saveConfig, notify, refreshData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwords, setPasswords] = useState(config.passwords);
  const [exitLimit, setExitLimit] = useState(config.exitLimitMinutes);
  const [autoBlocks, setAutoBlocks] = useState(config.autoBlocks || []);

  const [newBlock, setNewBlock] = useState({ start: '', end: '', label: '' });

  const handleSavePasswords = async () => {
    await saveConfig({ passwords });
  };

  const handleSaveExitLimit = async () => {
    await saveConfig({ exitLimitMinutes: exitLimit });
  };

  const handleAddBlock = async () => {
    if (!newBlock.start || !newBlock.end || !newBlock.label) return notify("Preencha todos os campos do bloqueio.");
    const updated = [...autoBlocks, newBlock];
    setAutoBlocks(updated);
    await saveConfig({ autoBlocks: updated });
    setNewBlock({ start: '', end: '', label: '' });
  };

  const handleRemoveBlock = async (index: number) => {
    const updated = autoBlocks.filter((_, i) => i !== index);
    setAutoBlocks(updated);
    await saveConfig({ autoBlocks: updated });
  };

  // Backup Geral (JSON)
  const handleFullBackup = () => {
    try {
      const backupData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        alunos: alunos,
        history: history,
        config: config
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `backup_completo_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("Backup exportado com sucesso!");
    } catch (error: any) {
      console.error("Erro no backup:", error);
      notify(`Erro ao gerar backup: ${error.message}`);
    }
  };

  const handleFullRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ ATENÇÃO: Isso irá APAGAR todos os dados atuais e substituir pelo backup. Deseja continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    notify("Iniciando restauração... Não saia desta página.");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);

        if (!data.alunos || !data.history) {
          throw new Error("Formato de backup inválido.");
        }

        if (alunos.length > 0) {
          notify("Limpando base de alunos...");
          await store.deleteAlunos(alunos.map(a => a.id));
        }

        if (data.alunos.length > 0) {
          notify(`Importando ${data.alunos.length} alunos...`);
          for (const aluno of data.alunos) {
            await store.addAluno(aluno);
          }
        }

        if (data.history.length > 0) {
          notify(`Restaurando ${data.history.length} registros...`);
          for (const record of data.history) {
            await store.addHistoryRecord(record);
          }
        }

        if (data.config) {
          await store.saveConfig(data.config);
        }

        await refreshData();
        notify("✅ Restauração concluída!");
      } catch (error: any) {
        console.error("Erro na restauração:", error);
        notify(`❌ ERRO: ${error.message}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Configurações de Senhas */}
      <div className="glass rounded-3xl p-8 shadow-xl border border-white/10 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Key className="text-primary" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">Acessos e Senhas</h3>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Controlo de Segurança</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Admin / Gestão</label>
            <input
              type="text"
              value={passwords.admin}
              onChange={e => setPasswords({ ...passwords, admin: e.target.value })}
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Professor</label>
            <input
              type="text"
              value={passwords.professor}
              onChange={e => setPasswords({ ...passwords, professor: e.target.value })}
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Apoio / Porteiro</label>
            <input
              type="text"
              value={passwords.apoio}
              onChange={e => setPasswords({ ...passwords, apoio: e.target.value })}
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Pais / Encarregados</label>
            <input
              type="text"
              value={passwords.parent || ''}
              onChange={e => setPasswords({ ...passwords, parent: e.target.value })}
              className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold text-foreground"
            />
          </div>
        </div>

        <button
          onClick={handleSavePasswords}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Save size={18} /> GUARDAR SENHAS
        </button>
      </div>

      {/* Configurações de Limites */}
      <div className="glass rounded-3xl p-8 shadow-xl border border-white/10 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
            <Timer className="text-accent" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">Limites de Tempo</h3>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Gestão de Saídas</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Tempo Máximo de Saída (minutos)</label>
            <span className="text-2xl font-black text-accent">{exitLimit}m</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={exitLimit}
            onChange={e => setExitLimit(Number(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
          />
          <button
            onClick={handleSaveExitLimit}
            className="w-full py-4 bg-accent text-accent-foreground rounded-2xl font-black shadow-lg hover:shadow-accent/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Save size={18} /> GUARDAR LIMITE
          </button>
        </div>
      </div>

      {/* Bloqueios Automáticos */}
      <div className="glass rounded-3xl p-8 shadow-xl border border-white/10 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="text-destructive" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">Bloqueios Automáticos</h3>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Saco e Refeitório</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Adicionar Novo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Nome (ex: Refeitório)"
              value={newBlock.label}
              onChange={e => setNewBlock({ ...newBlock, label: e.target.value })}
              className="p-3 bg-secondary rounded-xl border border-border text-xs font-bold"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={newBlock.start}
                onChange={e => setNewBlock({ ...newBlock, start: e.target.value })}
                className="flex-1 p-3 bg-secondary rounded-xl border border-border text-xs font-bold"
              />
              <input
                type="time"
                value={newBlock.end}
                onChange={e => setNewBlock({ ...newBlock, end: e.target.value })}
                className="flex-1 p-3 bg-secondary rounded-xl border border-border text-xs font-bold"
              />
            </div>
            <button
              onClick={handleAddBlock}
              className="p-3 bg-foreground text-background rounded-xl font-black text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> ADICIONAR
            </button>
          </div>

          {/* Listagem */}
          <div className="space-y-2 pt-4">
            {autoBlocks.map((block, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/50 group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{block.label}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">{block.start} - {block.end}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveBlock(index)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {autoBlocks.length === 0 && (
              <p className="text-center py-8 text-xs text-muted-foreground font-bold uppercase tracking-widest border-2 border-dashed border-border rounded-2xl">
                Nenhum bloqueio configurado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Manutenção e Backup */}
      <div className="glass rounded-3xl p-8 shadow-xl border border-white/10 space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <Database className="text-primary" size={32} />
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Manutenção do Sistema</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Gerencie a segurança dos seus dados através de backups periódicos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleFullBackup}
            className="group relative flex flex-col items-center justify-center p-8 bg-secondary/50 hover:bg-secondary rounded-3xl border border-border transition-all hover:scale-[1.02] active:scale-95 space-y-4"
          >
            <div className="p-4 bg-primary/20 rounded-full text-primary group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <div className="text-center">
              <span className="block font-black text-foreground">Fazer Backup Geral</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Salvar todos os dados</span>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center p-8 bg-destructive/5 hover:bg-destructive/10 rounded-3xl border border-destructive/20 transition-all hover:scale-[1.02] active:scale-95 space-y-4"
          >
            <div className="p-4 bg-destructive/20 rounded-full text-destructive group-hover:scale-110 transition-transform">
              <RotateCcw size={24} />
            </div>
            <div className="text-center">
              <span className="block font-black text-destructive">Restaurar Backup</span>
              <span className="text-[10px] text-destructive/60 uppercase font-bold tracking-widest">Substituir dados atuais</span>
            </div>
          </button>
        </div>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFullRestore}
          className="hidden"
        />

        <div className="bg-warning/10 p-4 rounded-2xl border border-warning/20 flex items-start gap-4">
          <ShieldAlert className="text-warning shrink-0 mt-1" size={20} />
          <div className="space-y-1">
            <p className="text-xs font-bold text-warning uppercase tracking-wider">Atenção</p>
            <p className="text-[11px] text-foreground leading-relaxed">
              Use a restauração apenas se tiver certeza. Este processo substituirá todos os alunos e registros de histórico atuais pelos dados contidos no arquivo de backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTab;
