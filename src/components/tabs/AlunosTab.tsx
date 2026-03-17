import React, { useState, useRef } from 'react';
import {
    Users,
    UserPlus,
    Upload,
    Download,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    ArrowRightLeft,
    FileSpreadsheet,
    User,
    AlertTriangle,
    Lock
} from 'lucide-react';
import * as store from '@/lib/store';
import { HistoryRecord, LibraryItem, Aluno, UserRole } from '@/types';
import { StudentProfileModal } from '@/components/modals/StudentProfileModal';

interface AlunosTabProps {
    alunos: Aluno[];
    turmasExistentes: string[];
    records: HistoryRecord[];
    libraryQueue: LibraryItem[];
    userRole: UserRole;
    notify: (msg: string) => void;
    refreshData: () => Promise<void>;
}

const AlunosTab: React.FC<AlunosTabProps> = ({ alunos, turmasExistentes, records, libraryQueue, userRole, notify, refreshData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTurma, setSelectedTurma] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
    const [viewingAluno, setViewingAluno] = useState<Aluno | null>(null);
    const [suspendAlunoModal, setSuspendAlunoModal] = useState<Aluno | null>(null);
    const [suspendReturnDate, setSuspendReturnDate] = useState('');

    const [formData, setFormData] = useState({ nome: '', turma: '', proibido_saida: false });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredAlunos = alunos.filter(a => {
        const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTurma = selectedTurma === 'Todas' || a.turma === selectedTurma;
        return matchesSearch && matchesTurma;
    });

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nome || !formData.turma) return notify("Preencha todos os campos.");
        try {
            await store.addAluno({ nome: formData.nome, turma: formData.turma, proibido_saida: formData.proibido_saida });
            setFormData({ nome: '', turma: '', proibido_saida: false });
            setIsAddModalOpen(false);
            await refreshData();
            notify("Aluno adicionado com sucesso!");
        } catch (err) {
            notify("Erro ao adicionar aluno.");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAluno) return;
        try {
            await store.updateAluno(editingAluno.id, { 
                nome: editingAluno.nome, 
                turma: editingAluno.turma,
                proibido_saida: editingAluno.proibido_saida
            });
            setEditingAluno(null);
            await refreshData();
            notify("Dados atualizados!");
        } catch (err) {
            notify("Erro ao atualizar.");
        }
    };

    const handleSuspendSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!suspendAlunoModal || !suspendReturnDate.trim()) {
            return notify("Preencha a data de retorno.");
        }
        try {
            await store.addSuspension({
                id: store.generateId(),
                alunoId: suspendAlunoModal.id,
                alunoNome: suspendAlunoModal.nome,
                turma: suspendAlunoModal.turma,
                returnDate: suspendReturnDate,
                timestamp: new Date().toISOString()
            });
            setSuspendAlunoModal(null);
            setSuspendReturnDate('');
            await refreshData();
            notify("Aluno suspenso com sucesso!");
        } catch (err) {
            notify("Erro ao aplicar suspensão.");
        }
    };

    const handleDelete = async (id: string, nome: string) => {
        if (!confirm(`Tem certeza que deseja remover ${nome}?`)) return;
        try {
            await store.deleteAlunos([id]);
            await refreshData();
            notify("Aluno removido.");
        } catch (err) {
            notify("Erro ao remover.");
        }
    };

    const handleExportCSV = () => {
        const headers = ['id', 'nome', 'turma'];
        const rows = alunos.map(a => [a.id, a.nome, a.turma].join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `alunos_anisio_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteAll = async () => {
        if (alunos.length === 0) return notify("Não há alunos para apagar.");
        if (!confirm(`⚠️ ATENÇÃO: Esta ação irá apagar TODOS os ${alunos.length} alunos. Um backup CSV será feito automaticamente antes. Deseja continuar?`)) return;

        // 1. Fazer backup automático primeiro
        handleExportCSV();

        // 2. Apagar todos
        try {
            notify("A apagar todos os alunos...");
            await store.deleteAlunos(alunos.map(a => a.id));
            await refreshData();
            notify(`✅ ${alunos.length} alunos apagados. Backup foi descarregado.`);
        } catch (err) {
            notify("❌ Erro ao apagar alunos. Tente novamente.");
        }
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n');
            const newAlunos = [];

            notify("Processando ficheiro...");

            // Formato esperado: turma,nome
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const [turma, nome] = line.split(',').map(s => s.trim());
                if (nome && turma) {
                    newAlunos.push({ nome, turma });
                }
            }

            if (newAlunos.length === 0) return notify("Nenhum dado válido encontrado.");

            try {
                for (const al of newAlunos) {
                    await store.addAluno(al);
                }
                await refreshData();
                notify(`Importados ${newAlunos.length} alunos com sucesso!`);
            } catch (err) {
                notify("Erro parcial na importação.");
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 pb-10 animate-fade-in">
            {/* Header e Ações Principais */}
            <div className="glass rounded-3xl p-6 shadow-lg border border-white/10 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-foreground leading-none">Gestão de Alunos</h3>
                            <p className="text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-widest">{alunos.length} Alunos Registados</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportCSV} className="p-3 bg-secondary hover:bg-muted text-foreground rounded-xl transition-all shadow-sm active:scale-95" title="Exportar CSV">
                            <Download size={20} />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-secondary hover:bg-muted text-foreground rounded-xl transition-all shadow-sm active:scale-95" title="Importar CSV">
                            <Upload size={20} />
                        </button>
                        <button onClick={handleDeleteAll} className="p-3 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-all shadow-sm active:scale-95" title="Apagar todos os alunos (faz backup automático)">
                            <Trash2 size={20} />
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-black text-xs shadow-md active:scale-95 transition-all">
                            <UserPlus size={18} /> NOVO ALUNO
                        </button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                </div>

                {/* Filtros */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar por nome..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-secondary/50 rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                        />
                    </div>
                    <select
                        className="p-4 bg-secondary/50 rounded-2xl border border-border outline-none focus:bg-card min-w-[140px] font-bold text-sm"
                        value={selectedTurma}
                        onChange={e => setSelectedTurma(e.target.value)}
                    >
                        <option value="">Selecione a Turma</option>
                        {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {(!selectedTurma && !searchTerm) ? (
                <div className="glass p-20 rounded-3xl text-center border-2 border-dashed border-border space-y-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-primary/20" />
                    </div>
                    <p className="font-black text-muted-foreground text-sm uppercase tracking-widest">Aguardando Seleção</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">Escolha uma turma ou pesquise por nome para listar os alunos.</p>
                </div>
            ) : (
                /* Lista de Alunos */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAlunos.length === 0 ? (
                    <div className="col-span-2 glass p-10 rounded-3xl text-center border-2 border-dashed border-border space-y-4">
                        <div className="text-5xl">🎓</div>
                        {alunos.length === 0 ? (
                            <div className="space-y-2">
                                <p className="font-black text-foreground text-lg">Nenhum aluno registado</p>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    A base de dados pode estar vazia. Adicione alunos manualmente ou importe um CSV no formato <span className="font-mono bg-secondary px-1 rounded">nome,turma</span>.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="font-black text-foreground text-lg">Nenhum aluno coincide com o filtro</p>
                                <p className="text-sm text-muted-foreground">Tente limpar o termo de busca ou mudar a turma selecionada.</p>
                            </div>
                        )}
                    </div>
                ) : filteredAlunos.map(a => (
                    <div key={a.id} className="glass group p-5 rounded-2xl border border-white/5 hover:border-primary/20 shadow-sm hover:shadow-md transition-all flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center font-black text-primary text-lg">
                                {a.nome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-extrabold text-foreground text-sm leading-tight">{a.nome}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded shadow-sm">{a.turma}</span>
                                    {a.proibido_saida && (
                                        <span className="text-[10px] font-black uppercase text-destructive bg-destructive/10 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                            <Lock size={10} /> BLOQUEADO
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewingAluno(a)}
                                className="px-3 py-1.5 bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase rounded-lg transition-all opacity-0 group-hover:opacity-100 hidden sm:block"
                            >
                                Perfil 360
                            </button>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setViewingAluno(a)}
                                    className="sm:hidden p-2.5 text-primary hover:bg-primary/20 hover:text-primary rounded-lg transition-all"
                                >
                                    <User size={16} />
                                </button>
                                <button
                                    onClick={() => setEditingAluno(a)}
                                    className="p-2.5 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(a.id, a.nome)}
                                    className="p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                                    title="Remover Aluno"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {userRole === 'admin' && (
                                    <button
                                        onClick={() => setSuspendAlunoModal(a)}
                                        className="p-2.5 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all"
                                        title="Suspender Aluno (Medida Disciplinar)"
                                    >
                                        <AlertTriangle size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {/* Modal Adicionar */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[200] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleAddSubmit} className="glass-strong rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-foreground">Novo Aluno</h3>
                            <button type="button" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome Completo</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Turma</label>
                                <input
                                    type="text"
                                    placeholder="Ex: 10ºA"
                                    value={formData.turma}
                                    onChange={e => setFormData({ ...formData, turma: e.target.value })}
                                    className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer p-4 bg-secondary/50 rounded-2xl border border-border hover:bg-secondary transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={formData.proibido_saida} 
                                    onChange={e => setFormData({ ...formData, proibido_saida: e.target.checked })}
                                    className="w-5 h-5 accent-destructive rounded"
                                />
                                <div className="flex items-center gap-2">
                                    <Lock size={16} className={formData.proibido_saida ? "text-destructive" : "text-muted-foreground"} />
                                    <span className={`text-sm font-bold ${formData.proibido_saida ? "text-destructive" : "text-foreground"}`}>
                                        Proibir Saídas (exceto emergência)
                                    </span>
                                </div>
                            </label>
                        </div>
                        <button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                            GUARDAR ALUNO
                        </button>
                    </form>
                </div>
            )}

            {/* Modal Editar / Mudar Sala */}
            {editingAluno && (
                <div className="fixed inset-0 z-[200] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleEditSubmit} className="glass-strong rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-foreground">Editar Aluno</h3>
                                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Atualizar ou Mudar de Sala</p>
                            </div>
                            <button type="button" onClick={() => setEditingAluno(null)}><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome</label>
                                <input
                                    type="text"
                                    value={editingAluno.nome}
                                    onChange={e => setEditingAluno({ ...editingAluno, nome: e.target.value })}
                                    className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><ArrowRightLeft size={10} /> Mudar Turma</label>
                                <input
                                    type="text"
                                    value={editingAluno.turma}
                                    onChange={e => setEditingAluno({ ...editingAluno, turma: e.target.value })}
                                    className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer p-4 bg-secondary/50 rounded-2xl border border-border hover:bg-secondary transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={editingAluno.proibido_saida || false} 
                                    onChange={e => setEditingAluno({ ...editingAluno, proibido_saida: e.target.checked })}
                                    className="w-5 h-5 accent-destructive rounded"
                                />
                                <div className="flex items-center gap-2">
                                    <Lock size={16} className={editingAluno.proibido_saida ? "text-destructive" : "text-muted-foreground"} />
                                    <span className={`text-sm font-bold ${editingAluno.proibido_saida ? "text-destructive" : "text-foreground"}`}>
                                        Proibir Saídas (exceto emergência)
                                    </span>
                                </div>
                            </label>
                        </div>
                        <button type="submit" className="w-full py-4 bg-foreground text-background rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                            ATUALIZAR DADOS
                        </button>
                    </form>
                </div>
            )}

            {/* Modal Perfil 360 */}
            {viewingAluno && (
                <StudentProfileModal
                    aluno={viewingAluno}
                    records={records}
                    libraryQueue={libraryQueue}
                    onClose={() => setViewingAluno(null)}
                />
            )}

            {/* Modal Suspender Aluno */}
            {suspendAlunoModal && (
                <div className="fixed inset-0 z-[200] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSuspendSubmit} className="glass-strong rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-scale-in border-t-4 border-t-orange-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-foreground flex items-center gap-2"><AlertTriangle className="text-orange-500" /> Suspender Aluno</h3>
                                <p className="text-[10px] text-muted-foreground font-bold tracking-widest mt-1 uppercase">{suspendAlunoModal.nome}</p>
                            </div>
                            <button type="button" onClick={() => setSuspendAlunoModal(null)}><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data de Retorno Prevista</label>
                                <input
                                    type="date"
                                    value={suspendReturnDate}
                                    onChange={e => setSuspendReturnDate(e.target.value)}
                                    className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-foreground"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                            APLICAR SUSPENSÃO
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AlunosTab;
