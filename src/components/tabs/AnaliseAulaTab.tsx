import React, { useState, useMemo } from 'react';
import { Star, MessageSquareText, Save, History, Search } from 'lucide-react';
import * as store from '@/lib/store';
import { HistoryRecord } from '@/types';

interface AnaliseAulaTabProps {
    records: HistoryRecord[];
    turmasExistentes: string[];
    username: string;
    userRole: string;
    notify: (msg: string) => void;
    refreshData: () => Promise<void>;
}

const AnaliseAulaTab: React.FC<AnaliseAulaTabProps> = ({ records, turmasExistentes, username, userRole, notify, refreshData }) => {
    const [activeSubTab, setActiveSubTab] = useState<'avaliar' | 'historico'>('avaliar');
    const [selectedTurma, setSelectedTurma] = useState('');
    const [stars, setStars] = useState(0);
    const [comment, setComment] = useState('');

    // Histórico
    const [filtroTurma, setFiltroTurma] = useState('');
    const [filtroProfessor, setFiltroProfessor] = useState(userRole === 'professor' ? username : '');

    const availableProfessors = useMemo(() => {
        const profs = new Set(records.filter(r => r.categoria === 'avaliacao_aula').map(r => r.professor));
        if (userRole === 'professor') profs.add(username);
        return Array.from(profs).sort();
    }, [records, userRole, username]);

    const avaliacoes = useMemo(() => {
        return records.filter(r => {
            if (r.categoria !== 'avaliacao_aula') return false;
            if (filtroTurma && r.turma !== filtroTurma) return false;
            if (filtroProfessor && r.professor !== filtroProfessor) return false;
            return true;
        });
    }, [records, filtroTurma, filtroProfessor]);

    const handleSave = async () => {
        if (!selectedTurma) { notify("Selecione uma turma para avaliar."); return; }
        if (stars === 0) { notify("Selecione uma nota (1 a 5 estrelas)."); return; }
        if (!comment.trim()) { notify("Adicione um breve comentário sobre a aula."); return; }

        try {
            const now = new Date();
            await store.addHistoryRecord({
                id: store.generateId(),
                alunoId: "TURMA",
                alunoNome: "[Avaliação de Turma]",
                turma: selectedTurma,
                categoria: 'avaliacao_aula',
                detalhe: JSON.stringify({ stars, comment }),
                timestamp: now.toLocaleString('pt-PT'),
                rawTimestamp: now.getTime(),
                professor: username,
                autorRole: userRole
            });
            await refreshData();
            notify("Avaliação da aula salva com sucesso!");
            setSelectedTurma('');
            setStars(0);
            setComment('');
            setActiveSubTab('historico');
        } catch (e: any) {
            notify("Erro ao salvar avaliação.");
        }
    };

    const renderStars = (rating: number, interactive = false) => {
        return (
            <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => interactive && setStars(star)}
                        className={`${interactive ? 'hover:scale-110 active:scale-95 cursor-pointer transition-all' : 'cursor-default'} ${star <= rating ? 'text-warning drop-shadow-sm' : 'text-muted-foreground/30'}`}
                    >
                        <Star fill={star <= rating ? 'currentColor' : 'none'} size={interactive ? 36 : 16} strokeWidth={interactive ? 2 : 2.5} />
                    </button>
                ))}
            </div>
        );
    };

    const parseAvaliacaoDetalhe = (detalhe: string) => {
        try {
            return JSON.parse(detalhe);
        } catch {
            return { stars: 0, comment: detalhe };
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex p-1.5 bg-secondary rounded-2xl gap-1">
                <button onClick={() => setActiveSubTab('avaliar')}
                    className={`flex-1 py-3 font-extrabold text-xs rounded-xl transition-all ${activeSubTab === 'avaliar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}>
                    Avaliar Turma
                </button>
                <button onClick={() => setActiveSubTab('historico')}
                    className={`flex-1 py-3 font-extrabold text-xs rounded-xl transition-all ${activeSubTab === 'historico' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}>
                    Histórico
                </button>
            </div>

            {activeSubTab === 'avaliar' && (
                <div className="glass rounded-3xl p-6 shadow-lg space-y-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 text-primary/5 pointer-events-none"><Star size={200} fill="currentColor" /></div>
                    <h3 className="font-black text-lg text-foreground flex items-center gap-2 relative z-10"><Star className="text-primary" fill="currentColor" size={24} /> Nova Avaliação da Aula</h3>

                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block ml-1">Turma Mencionada</label>
                            <select className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm font-semibold outline-none text-foreground appearance-none"
                                value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}>
                                <option value="">Selecione a turma...</option>
                                {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="bg-secondary/50 p-6 rounded-3xl border border-border flex flex-col items-center justify-center space-y-4">
                            <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider text-center">Como foi o desempenho geral da turma?</label>
                            {renderStars(stars, true)}
                        </div>

                        <div>
                            <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block ml-1">Observações da Aula</label>
                            <textarea
                                className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm outline-none text-foreground resize-none min-h-[120px]"
                                placeholder="Escreva comentários sobre o comportamento, engajamento, etc..."
                                value={comment} onChange={e => setComment(e.target.value)}
                            />
                        </div>

                        <button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all">
                            <Save size={18} /> Salvar Avaliação
                        </button>
                    </div>
                </div>
            )}

            {activeSubTab === 'historico' && (
                <div className="space-y-5">
                    <div className="glass rounded-3xl p-5 shadow-sm space-y-4">
                        <h3 className="font-black text-sm text-foreground flex items-center gap-2"><Search size={16} className="text-primary" /> Filtros</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <select className="bg-secondary border border-border rounded-xl p-3 text-xs font-semibold outline-none text-foreground appearance-none"
                                value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)}>
                                <option value="">Todas as Turmas</option>
                                {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            <select className="bg-secondary border border-border rounded-xl p-3 text-xs font-semibold outline-none text-foreground appearance-none"
                                value={filtroProfessor} onChange={e => setFiltroProfessor(e.target.value)}
                                disabled={userRole === 'professor'}>
                                <option value="">Todos os Professores</option>
                                {availableProfessors.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {avaliacoes.length === 0 ? (
                            <p className="text-center py-10 text-muted-foreground text-sm font-bold bg-secondary/50 rounded-3xl border border-dashed border-border">Nenhuma avaliação encontrada.</p>
                        ) : (
                            avaliacoes.map(av => {
                                const details = parseAvaliacaoDetalhe(av.detalhe);
                                return (
                                    <div key={av.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm animate-scale-in">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg mr-2 uppercase">{av.turma}</span>
                                                <span className="text-[10px] font-extrabold text-muted-foreground uppercase">{av.timestamp.split(',')[0]}</span>
                                            </div>
                                            {renderStars(details.stars)}
                                        </div>
                                        <p className="text-xs text-foreground mb-4">"{details.comment}"</p>
                                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-secondary/80 w-fit px-3 py-1.5 rounded-lg">
                                            <History size={12} className="text-primary" /> {av.professor}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnaliseAulaTab;
