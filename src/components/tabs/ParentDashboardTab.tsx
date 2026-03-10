import React, { useMemo } from 'react';
import { HistoryRecord, Aluno, LibraryItem } from '@/types';
import { ShieldAlert, Star, Clock, Library, History, Bell, CalendarClock } from 'lucide-react';

interface ParentDashboardTabProps {
    studentName: string;
    records: HistoryRecord[];
    libraryQueue: LibraryItem[];
}

const ParentDashboardTab: React.FC<ParentDashboardTabProps> = ({ studentName, records, libraryQueue }) => {
    const childRecords = useMemo(() => {
        return records.filter(r => r.alunoNome?.toLowerCase() === studentName.toLowerCase());
    }, [records, studentName]);

    const childLibraryInfo = useMemo(() => {
        return libraryQueue.filter(l => l.alunoNome?.toLowerCase() === studentName.toLowerCase());
    }, [libraryQueue, studentName]);

    const stats = useMemo(() => {
        let saidas = 0, ocorrencias = 0, meritos = 0, atrasos = 0;
        childRecords.forEach(r => {
            if (r.categoria === 'saida') saidas++;
            if (r.categoria === 'ocorrencia') ocorrencias++;
            if (r.categoria === 'merito') meritos++;
            if (r.categoria === 'atraso') atrasos++;
        });
        return { saidas, ocorrencias, meritos, atrasos };
    }, [childRecords]);

    const recentEvents = childRecords.slice(0, 10);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="glass-strong rounded-3xl p-6 shadow-xl relative overflow-hidden text-center mb-8">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl shadow-primary"></div>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Área dos Pais</h2>
                <h1 className="text-2xl font-black text-foreground">{studentName}</h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">Bem-vindo(a) ao acompanhamento escolar em tempo real.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Merits */}
                <div className="glass rounded-3xl p-5 shadow-lg border-t-4 border-t-accent hover:-translate-y-1 transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-accent/10 rounded-xl"><Star className="text-accent" size={20} /></div>
                        <span className="text-3xl font-black text-accent">{stats.meritos}</span>
                    </div>
                    <p className="text-xs font-bold text-foreground">Méritos</p>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Comportamentos Positivos</p>
                </div>

                {/* Occurrences */}
                <div className="glass rounded-3xl p-5 shadow-lg border-t-4 border-t-destructive hover:-translate-y-1 transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-destructive/10 rounded-xl"><ShieldAlert className="text-destructive" size={20} /></div>
                        <span className="text-3xl font-black text-destructive">{stats.ocorrencias}</span>
                    </div>
                    <p className="text-xs font-bold text-foreground">Deveres Incorretos</p>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Ocorrências Discplinares</p>
                </div>

                {/* Delays */}
                <div className="glass rounded-3xl p-5 shadow-lg border-t-4 border-t-warning hover:-translate-y-1 transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-warning/10 rounded-xl"><CalendarClock className="text-warning" size={20} /></div>
                        <span className="text-3xl font-black text-warning">{stats.atrasos}</span>
                    </div>
                    <p className="text-xs font-bold text-foreground">Entradas Tardias</p>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Atrasos na Portaria</p>
                </div>

                {/* Library pending */}
                <div className="glass rounded-3xl p-5 shadow-lg border-t-4 border-t-blue-500 hover:-translate-y-1 transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-xl"><Library className="text-blue-500" size={20} /></div>
                        <span className="text-3xl font-black text-blue-500">{childLibraryInfo.length}</span>
                    </div>
                    <p className="text-xs font-bold text-foreground">Livros Pendentes</p>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Devoluções na Biblioteca</p>
                </div>
            </div>

            <div className="glass rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-black flex items-center gap-2 mb-4 text-foreground">
                    <History className="text-primary" size={18} /> Últimos Eventos
                </h3>

                {recentEvents.length === 0 ? (
                    <div className="text-center py-8">
                        <Bell className="mx-auto text-muted-foreground mb-3 opacity-20" size={32} />
                        <p className="text-sm font-bold text-muted-foreground">Nenhum registo recente encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentEvents.map(r => (
                            <div key={r.id} className="p-4 bg-secondary/50 rounded-2xl border border-white/5 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md
                    ${r.categoria === 'merito' ? 'bg-accent/20 text-accent' :
                                            r.categoria === 'ocorrencia' || r.categoria === 'medida' ? 'bg-destructive/20 text-destructive' :
                                                r.categoria === 'atraso' ? 'bg-warning/20 text-warning' :
                                                    'bg-primary/20 text-primary'}`}>
                                        {r.categoria}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground">{r.timestamp}</span>
                                </div>
                                <p className="text-sm font-bold text-foreground leading-snug">{r.detalhe}</p>
                                <div className="flex justify-between items-end mt-1">
                                    <p className="text-xs text-muted-foreground">Prof: <b>{r.professor}</b></p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentDashboardTab;
