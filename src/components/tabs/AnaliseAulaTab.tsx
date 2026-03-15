import React, { useState, useMemo } from 'react';
import { Star, MessageSquareText, Save, History, Search, Clock, Trophy, BarChart3, Users } from 'lucide-react';
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
    const [activeSubTab, setActiveSubTab] = useState<'avaliar' | 'historico' | 'ranking'>('avaliar');
    const [selectedTurma, setSelectedTurma] = useState('');
    const [stars, setStars] = useState(0);
    const [starsOrg, setStarsOrg] = useState(0);
    const [starsPart, setStarsPart] = useState(0);
    const [starsResp, setStarsResp] = useState(0);
    const [comment, setComment] = useState('');

    // Histórico
    const [filtroTurma, setFiltroTurma] = useState('');
    const [filtroDataInicio, setFiltroDataInicio] = useState('');
    const [filtroDataFim, setFiltroDataFim] = useState('');
    const [verTodoPeriodo, setVerTodoPeriodo] = useState(false);
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
            
            if (!verTodoPeriodo) {
                if (filtroDataInicio || filtroDataFim) {
                    if (!r.rawTimestamp) return false;
                    const rDate = new Date(r.rawTimestamp); rDate.setHours(0, 0, 0, 0);
                    if (filtroDataInicio) { const d = new Date(filtroDataInicio); d.setHours(0, 0, 0, 0); if (rDate < d) return false; }
                    if (filtroDataFim) { const d = new Date(filtroDataFim); d.setHours(23, 59, 59, 999); if (rDate > d) return false; }
                }
            }
            return true;
        });
    }, [records, filtroTurma, filtroProfessor, filtroDataInicio, filtroDataFim, verTodoPeriodo]);

    const handleSave = async () => {
        if (!selectedTurma) { notify("Selecione uma turma para avaliar."); return; }
        if (stars === 0 || starsOrg === 0 || starsPart === 0 || starsResp === 0) { 
            notify("Por favor, preencha todas as avaliações de estrelas."); return; 
        }

        try {
            const now = new Date();
            await store.addHistoryRecord({
                id: store.generateId(),
                alunoId: "TURMA",
                alunoNome: "[Avaliação de Turma]",
                turma: selectedTurma,
                categoria: 'avaliacao_aula',
                detalhe: JSON.stringify({ 
                    stars, 
                    starsOrg, 
                    starsPart, 
                    starsResp, 
                    comment 
                }),
                timestamp: now.toISOString(),
                rawTimestamp: now.getTime(),
                professor: username,
                autorRole: userRole
            });
            await refreshData();
            notify("Avaliação da aula salva com sucesso!");
            setSelectedTurma('');
            setStars(0);
            setStarsOrg(0);
            setStarsPart(0);
            setStarsResp(0);
            setComment('');
            setActiveSubTab('historico');
        } catch (e: any) {
    console.error("Falha detalhada:", e);
    notify("Erro: " + e.message);
}
    };

    const renderStars = (rating: number, interactive = false, onSelect?: (val: number) => void, size = 16) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => interactive && onSelect && onSelect(star)}
                        className={`${interactive ? 'hover:scale-110 active:scale-95 cursor-pointer transition-all' : 'cursor-default transition-transform'} ${star <= rating ? 'text-warning drop-shadow-sm' : 'text-muted-foreground/30'}`}
                    >
                        <Star fill={star <= rating ? 'currentColor' : 'none'} size={size} strokeWidth={interactive ? 2 : 2.5} />
                    </button>
                ))}
            </div>
        );
    };

    const parseAvaliacaoDetalhe = (detalhe: string) => {
        try {
            const d = JSON.parse(detalhe);
            return {
                stars: d.stars || 0,
                starsOrg: d.starsOrg || 0,
                starsPart: d.starsPart || 0,
                starsResp: d.starsResp || 0,
                comment: d.comment || ""
            };
        } catch {
            return { stars: 0, starsOrg: 0, starsPart: 0, starsResp: 0, comment: detalhe };
        }
    };

    const rankingTurmas = useMemo(() => {
        const stats: Record<string, { total: number, count: number }> = {};
        
        records.forEach(r => {
            if (r.categoria !== 'avaliacao_aula') return;
            const d = parseAvaliacaoDetalhe(r.detalhe);
            if (!stats[r.turma]) stats[r.turma] = { total: 0, count: 0 };
            
            // Média apenas das notas preenchidas (evita erro com avaliações antigas)
            const ratings = [d.stars, d.starsOrg, d.starsPart, d.starsResp].filter(r => r > 0);
            if (ratings.length === 0) return;

            const mediaAvaliacao = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            stats[r.turma].total += mediaAvaliacao;
            stats[r.turma].count += 1;
        });

        return Object.entries(stats)
            .map(([turma, data]) => ({
                turma,
                media: data.total / data.count,
                avaliacoes: data.count
            }))
            .sort((a, b) => b.media - a.media);
    }, [records]);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex p-1.5 bg-secondary rounded-2xl gap-1">
                <button onClick={() => setActiveSubTab('avaliar')}
                    className={`flex-1 py-3 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all ${activeSubTab === 'avaliar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}>
                    Avaliar
                </button>
                <button onClick={() => setActiveSubTab('historico')}
                    className={`flex-1 py-3 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all ${activeSubTab === 'historico' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}>
                    Histórico
                </button>
                <button onClick={() => setActiveSubTab('ranking')}
                    className={`flex-1 py-3 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all ${activeSubTab === 'ranking' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}>
                    Ranking
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-secondary/50 p-4 rounded-3xl border border-border flex flex-col items-center justify-center space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Geral da Aula</label>
                                {renderStars(stars, true, setStars, 36)}
                            </div>
                            
                            <div className="bg-secondary/50 p-4 rounded-3xl border border-border flex flex-col items-center justify-center space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Organização</label>
                                {renderStars(starsOrg, true, setStarsOrg, 28)}
                            </div>
                            
                            <div className="bg-secondary/50 p-4 rounded-3xl border border-border flex flex-col items-center justify-center space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Participação</label>
                                {renderStars(starsPart, true, setStarsPart, 28)}
                            </div>
                            
                            <div className="bg-secondary/50 p-4 rounded-3xl border border-border flex flex-col items-center justify-center space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Respeito Normas</label>
                                {renderStars(starsResp, true, setStarsResp, 28)}
                            </div>
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

            {activeSubTab === 'ranking' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="glass rounded-3xl p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 text-primary/10"><Trophy size={80} /></div>
                        <h3 className="font-black text-lg text-foreground flex items-center gap-2 mb-6">
                            <Trophy className="text-warning" fill="currentColor" size={24} /> 
                            Ranking Geral de Turmas
                        </h3>

                        <div className="space-y-3">
                            {rankingTurmas.length === 0 ? (
                                <p className="text-center py-10 text-muted-foreground text-sm font-bold bg-secondary/50 rounded-3xl border border-dashed border-border">Nenhuma avaliação registrada ainda.</p>
                            ) : (
                                rankingTurmas.map((item, index) => (
                                    <div key={item.turma} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
                                                index === 0 ? 'bg-warning/20 text-warning border border-warning/30' : 
                                                index === 1 ? 'bg-slate-400/20 text-slate-500 border border-slate-400/30' :
                                                index === 2 ? 'bg-orange-700/20 text-orange-800 border border-orange-700/30' :
                                                'bg-secondary text-muted-foreground'
                                            }`}>
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-foreground">{item.turma}</h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.avaliacoes} avaliações</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1.5 text-warning mb-1 justify-end">
                                                <Star fill="currentColor" size={14} />
                                                <span className="font-black text-lg">{item.media.toFixed(1)}</span>
                                            </div>
                                            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-warning transition-all" 
                                                    style={{ width: `${(item.media / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            {activeSubTab === 'historico' && (
                <div className="space-y-5">
                    <div className="glass rounded-3xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-sm text-foreground flex items-center gap-2"><Search size={16} className="text-primary" /> Filtros</h3>
                            <button 
                                onClick={() => setVerTodoPeriodo(!verTodoPeriodo)}
                                className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all ${verTodoPeriodo ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                            >
                                {verTodoPeriodo ? 'Todo o Período: ON' : 'Todo o Período: OFF'}
                            </button>
                        </div>
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
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
                            <div>
                                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block ml-1">De</label>
                                <input type="date" disabled={verTodoPeriodo} value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} 
                                    className="w-full bg-secondary border border-border rounded-xl p-2.5 text-[11px] font-bold outline-none text-foreground disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block ml-1">Até</label>
                                <input type="date" disabled={verTodoPeriodo} value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} 
                                    className="w-full bg-secondary border border-border rounded-xl p-2.5 text-[11px] font-bold outline-none text-foreground disabled:opacity-50" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {(!filtroDataInicio || !filtroDataFim) && !verTodoPeriodo ? (
                            <div className="p-10 text-center space-y-3 bg-secondary/30 rounded-3xl border border-dashed border-border/50">
                                <Clock size={24} className="mx-auto text-muted-foreground/40" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Escolha um Período</p>
                                <p className="text-[11px] text-muted-foreground/60">Selecione as datas ou ative "Todo o Período" para visualizar as avaliações.</p>
                            </div>
                        ) : avaliacoes.length === 0 ? (
                            <p className="text-center py-10 text-muted-foreground text-sm font-bold bg-secondary/50 rounded-3xl border border-dashed border-border">Nenhuma avaliação encontrada.</p>
                        ) : (
                            avaliacoes.map(av => {
                                const details = parseAvaliacaoDetalhe(av.detalhe);
                                return (
                                    <div key={av.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm animate-scale-in">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg mr-2 uppercase">{av.turma}</span>
                                                {/* CORREÇÃO 2: Convertendo a string ISO de volta para o formato de data humano na exibição */}
                                                <span className="text-[10px] font-extrabold text-muted-foreground uppercase">
                                                    {new Date(av.timestamp).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            {renderStars(details.stars)}
                                        </div>
                                        <p className="text-xs text-foreground mb-4">"{details.comment}"</p>
                                            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/30">
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">Org: {renderStars(details.starsOrg)}</div>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">Part: {renderStars(details.starsPart)}</div>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">Resp: {renderStars(details.starsResp)}</div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-secondary/80 w-fit px-3 py-1.5 rounded-lg mt-3">
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
