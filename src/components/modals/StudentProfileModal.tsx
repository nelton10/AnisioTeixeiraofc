import React, { useMemo } from 'react';
import { Aluno, HistoryRecord, LibraryItem } from '@/types';
import { X, AlertTriangle, CheckCircle, Clock, BookOpen, User, Phone, MessageCircleHeart } from 'lucide-react';

interface StudentProfileModalProps {
    aluno: Aluno;
    records: HistoryRecord[];
    libraryQueue: LibraryItem[];
    onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ aluno, records, libraryQueue, onClose }) => {
    const studentRecords = useMemo(() => records.filter(r => r.alunoId === aluno.id || r.alunoNome === aluno.nome).sort((a, b) => b.rawTimestamp - a.rawTimestamp), [records, aluno]);
    const studentLib = useMemo(() => libraryQueue.filter(l => l.alunoId === aluno.id || l.alunoNome === aluno.nome), [libraryQueue, aluno]);

    const stats = useMemo(() => {
        let ocorrencias = 0;
        let meritos = 0;
        let atrasos = 0;
        let saidas = 0;

        studentRecords.forEach(r => {
            if (r.categoria === 'ocorrencia') ocorrencias++;
            if (r.categoria === 'merito') meritos++;
            if (r.categoria === 'atraso') atrasos++;
            if (r.categoria === 'saida') saidas++;
        });

        return { ocorrencias, meritos, atrasos, saidas };
    }, [studentRecords]);

    // Determine color status
    let statusColor = "bg-primary text-primary-foreground";
    let statusText = "Excelente";
    let StatusIcon = CheckCircle;

    if (stats.ocorrencias >= 3 || stats.atrasos >= 5) {
        statusColor = "bg-destructive text-destructive-foreground";
        statusText = "Preocupante";
        StatusIcon = AlertTriangle;
    } else if (stats.ocorrencias > 0 || stats.atrasos > 2 || studentLib.length > 0) {
        statusColor = "bg-warning text-warning-foreground";
        statusText = "Atenção";
        StatusIcon = Clock;
    }

    const handleWhatsAppMessage = () => {
        if (!aluno.responsavel_telefone) return;
        const phone = aluno.responsavel_telefone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá, sou da coordenação da Escola Anísio Teixeira. Gostaríamos de informar que o/a aluno(a) ${aluno.nome} recebeu um mérito hoje pelo seu bom comportamento/desempenho! Parabéns!`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in custom-scrollbar">
            <div className="glass-strong rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-white/10 animate-scale-in overflow-hidden">

                {/* Header Profile */}
                <div className="p-6 md:p-8 bg-card flex flex-col md:flex-row items-center md:items-start gap-6 relative border-b border-border">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-all">
                        <X size={20} />
                    </button>

                    <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg shrink-0 ${statusColor}`}>
                        <User size={40} />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-black text-foreground">{aluno.nome}</h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                            <span className="px-3 py-1 bg-secondary text-foreground text-xs font-black uppercase rounded-lg border border-border">{aluno.turma}</span>
                            <span className={`px-3 py-1 text-xs font-black uppercase rounded-lg shadow-sm flex items-center gap-1.5 ${statusColor}`}>
                                <StatusIcon size={14} /> Status: {statusText}
                            </span>
                        </div>

                        {(aluno.responsavel_nome || aluno.responsavel_telefone) && (
                            <div className="mt-4 p-3 bg-secondary/50 rounded-xl border border-white/5 flex flex-wrap gap-2 items-center justify-between">
                                <div className="text-left text-xs">
                                    <p className="font-bold text-muted-foreground mb-0.5 uppercase tracking-wider text-[9px]">Contato do Responsável</p>
                                    <p className="font-semibold text-foreground">{aluno.responsavel_nome || 'Nome não informado'}</p>
                                    {aluno.responsavel_telefone && <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><Phone size={10} /> {aluno.responsavel_telefone}</p>}
                                </div>
                                {aluno.responsavel_telefone && (
                                    <button onClick={handleWhatsAppMessage} className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/20 py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors text-xs font-black">
                                        <MessageCircleHeart size={14} /> Reforço Positivo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
                    <div className="bg-card p-4 text-center">
                        <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Ocorrências</p>
                        <p className="text-2xl font-black text-destructive">{stats.ocorrencias}</p>
                    </div>
                    <div className="bg-card p-4 text-center">
                        <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Atrasos</p>
                        <p className="text-2xl font-black text-warning">{stats.atrasos}</p>
                    </div>
                    <div className="bg-card p-4 text-center">
                        <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Méritos</p>
                        <p className="text-2xl font-black text-accent">{stats.meritos}</p>
                    </div>
                    <div className="bg-card p-4 text-center">
                        <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1 flex justify-center items-center gap-1"><BookOpen size={10} /> Livros Pend.</p>
                        <p className="text-2xl font-black text-primary">{studentLib.length}</p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 bg-background">
                    <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground mb-4">Linha do Tempo Recente</h3>

                    {studentRecords.length === 0 && studentLib.length === 0 ? (
                        <div className="text-center p-8 bg-secondary/50 rounded-2xl border border-dashed border-border">
                            <p className="text-muted-foreground font-semibold text-sm">Nenhum evento registado para este aluno.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {studentLib.map(lib => (
                                <div key={lib.id} className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex gap-4 items-start">
                                    <div className="mt-1 bg-primary text-primary-foreground p-1.5 rounded flex-shrink-0"><BookOpen size={16} /></div>
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Livro Pendente - {lib.timestamp.split(' - ')[0]}</p>
                                        <p className="text-sm font-semibold text-foreground">Retirado com Coord. {lib.professorCoord}</p>
                                    </div>
                                </div>
                            ))}
                            {studentRecords.map(r => {
                                const colors = {
                                    ocorrencia: 'text-destructive border-destructive/20 bg-destructive/5',
                                    merito: 'text-accent border-accent/20 bg-accent/5',
                                    atraso: 'text-warning border-warning/20 bg-warning/5',
                                    saida: 'text-primary border-primary/20 bg-primary/5',
                                    coordenação: 'text-purple-500 border-purple-500/20 bg-purple-500/5',
                                    medida: 'text-orange-500 border-orange-500/20 bg-orange-500/5',
                                    avaliacao_aula: 'text-blue-500 border-blue-500/20 bg-blue-500/5'
                                };
                                const bgClass = colors[r.categoria] || colors.saida;

                                return (
                                    <div key={r.id} className={`p-4 rounded-xl border flex gap-4 items-start ${bgClass}`}>
                                        <div className="mt-1 opacity-80"><Clock size={16} /></div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{r.categoria}</p>
                                                <span className="text-[10px] bg-background/50 px-2 py-0.5 rounded-full mt-0.5 font-bold">{r.timestamp.split(' - ')[0]}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground mb-1">{r.detalhe}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">Por: {r.professor}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
