import React, { useMemo, useState } from 'react';
import { HistoryRecord, Aluno, LibraryItem, Aviso } from '@/types';
import { ShieldAlert, Star, Clock, Library, History, Bell, CalendarClock, Download, FileText, UserCog, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { updateAluno } from '@/lib/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ParentDashboardTabProps {
    studentName: string;
    records: HistoryRecord[];
    libraryQueue: LibraryItem[];
    avisos: Aviso[];
    alunosList: Aluno[];
    refreshData: () => Promise<void>;
}

const ParentDashboardTab: React.FC<ParentDashboardTabProps> = ({ studentName, records, libraryQueue, avisos, alunosList, refreshData }) => {
    const studentData = useMemo(() => alunosList.find(a => a.nome.toLowerCase() === studentName.toLowerCase()), [alunosList, studentName]);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [parentForm, setParentForm] = useState({
        responsavel_nome: studentData?.responsavel_nome || '',
        responsavel_telefone: studentData?.responsavel_telefone || '',
        responsavel_email: studentData?.responsavel_email || ''
    });

    const childRecords = useMemo(() => {
        return records.filter(r => r.alunoNome?.toLowerCase() === studentName.toLowerCase());
    }, [records, studentName]);

    const childLibraryInfo = useMemo(() => {
        return libraryQueue.filter(l => l.alunoNome?.toLowerCase() === studentName.toLowerCase());
    }, [libraryQueue, studentName]);

    const activeAvisos = useMemo(() => {
        return avisos.slice(0, 5); // Show top 5 latest
    }, [avisos]);

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

    const handleUpdateParentInfo = async () => {
        if (!studentData) return;
        try {
            await updateAluno(studentData.id, parentForm);
            await refreshData();
            setIsEditingProfile(false);
            toast.success("Dados de contato atualizados com sucesso!");
        } catch (error) {
            toast.error("Erro ao atualizar dados.");
            console.error(error);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(34, 197, 94); // Primary green color
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Escola Anísio Teixeira', 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Boletim de Atitude e Frequência', 105, 30, { align: 'center' });

        // Student Info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(12);
        doc.text(`Aluno: ${studentName}`, 14, 50);
        doc.text(`Turma: ${studentData?.turma || 'N/A'}`, 14, 58);
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}`, 14, 66);

        // Summary box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(14, 75, 182, 30, 3, 3, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.text(`Total de Méritos: ${stats.meritos}`, 20, 85);
        doc.text(`Total de Ocorrências: ${stats.ocorrencias}`, 20, 95);
        doc.text(`Total de Atrasos: ${stats.atrasos}`, 110, 85);
        doc.text(`Total de Saídas: ${stats.saidas}`, 110, 95);

        // Table Data
        const tableBody = childRecords.map(r => [
            r.timestamp,
            r.categoria.toUpperCase(),
            r.detalhe,
            r.professor
        ]);

        autoTable(doc, {
            startY: 115,
            head: [['Data/Hora', 'Categoria', 'Descrição', 'Registrado Por']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 30 },
                2: { cellWidth: 85 },
                3: { cellWidth: 32 }
            }
        });

        doc.save(`boletim_atitude_${studentName.replace(/\\s+/g, '_')}.pdf`);
        toast.success("Boletim PDF gerado com sucesso!");
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="glass-strong rounded-3xl p-6 shadow-xl relative overflow-hidden text-center mb-8">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl shadow-primary"></div>
                <div className="absolute top-4 right-4">
                    <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="p-2 bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground rounded-full transition-colors" title="Editar Contato">
                        <UserCog size={20} />
                    </button>
                </div>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Área dos Pais</h2>
                <h1 className="text-2xl font-black text-foreground">{studentName}</h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">Bem-vindo(a) ao acompanhamento escolar em tempo real.</p>

                <button onClick={generatePDF} className="mt-4 mx-auto flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-bold py-2 px-6 rounded-full transition-all text-sm">
                    <FileText size={16} /> Gerar Boletim (PDF)
                </button>
            </div>

            {isEditingProfile && (
                <div className="glass rounded-3xl p-6 shadow-lg mb-8 border border-primary/20 animate-slide-down">
                    <h3 className="text-sm font-black flex items-center gap-2 mb-4 text-foreground">
                        <UserCog className="text-primary" size={18} /> Dados do Responsável
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1 block">Nome do Responsável</label>
                            <input type="text" value={parentForm.responsavel_nome} onChange={e => setParentForm({ ...parentForm, responsavel_nome: e.target.value })} className="w-full p-3 bg-secondary rounded-xl border border-border outline-none text-sm font-bold" placeholder="Ex: Maria Silva" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1 block">Telefone (WahtsApp)</label>
                            <input type="text" value={parentForm.responsavel_telefone} onChange={e => setParentForm({ ...parentForm, responsavel_telefone: e.target.value })} className="w-full p-3 bg-secondary rounded-xl border border-border outline-none text-sm font-bold" placeholder="Ex: 912345678" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1 block">E-mail</label>
                            <input type="email" value={parentForm.responsavel_email} onChange={e => setParentForm({ ...parentForm, responsavel_email: e.target.value })} className="w-full p-3 bg-secondary rounded-xl border border-border outline-none text-sm font-bold" placeholder="Ex: maria@email.com" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsEditingProfile(false)} className="px-5 py-2 rounded-xl bg-secondary font-bold text-sm">Cancelar</button>
                        <button onClick={handleUpdateParentInfo} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Salvar Dados</button>
                    </div>
                </div>
            )}

            {activeAvisos.length > 0 && (
                <div className="glass rounded-3xl p-6 shadow-lg border-l-4 border-l-blue-500 mb-8">
                    <h3 className="text-sm font-black flex items-center gap-2 mb-4 text-foreground">
                        <Bell className="text-blue-500" size={18} /> Mural de Avisos da Coordenação
                    </h3>
                    <div className="space-y-3">
                        {activeAvisos.map(aviso => (
                            <div key={aviso.id} className="p-4 bg-secondary/30 rounded-2xl border border-blue-500/10">
                                <p className="text-sm font-medium text-foreground">{aviso.texto}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-[10px] text-muted-foreground font-bold">{aviso.timestamp}</span>
                                    <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded uppercase font-black">{aviso.autor}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
