import React, { useState, useMemo } from 'react';
import { Search, FileSpreadsheet, Download, Clock, AlertCircle, Gavel, Star } from 'lucide-react';
import { Aluno, HistoryRecord } from '@/types';

interface PesquisaTabProps {
  alunos: Aluno[];
  records: HistoryRecord[];
  turmasExistentes: string[];
}

const PesquisaTab: React.FC<PesquisaTabProps> = ({ alunos, records, turmasExistentes }) => {
  const [filtroBuscaNome, setFiltroBuscaNome] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [filtroAlunoId, setFiltroAlunoId] = useState('');

  const studentSummary = useMemo(() => {
    const map: Record<string, {
      id: string; nome: string; turma: string; saidas: number; ocorrencias: number;
      meritos: number; atrasos: number; suspensoes: number; tempoForaTotal: number
    }> = {};

    records.forEach(r => {
      if (!r.alunoId || r.alunoId === 'TURMA') return;
      if (!map[r.alunoId]) {
        map[r.alunoId] = {
          id: r.alunoId, nome: r.alunoNome || "?", turma: r.turma || "?",
          saidas: 0, ocorrencias: 0, meritos: 0, atrasos: 0, suspensoes: 0, tempoForaTotal: 0
        };
      }

      const entry = map[r.alunoId];
      if (r.categoria === 'saida') {
        entry.saidas++;
        const match = r.detalhe.match(/\((\d+) min\)/);
        if (match) entry.tempoForaTotal += parseInt(match[1]);
      }
      if (r.categoria === 'ocorrencia') entry.ocorrencias++;
      if (r.categoria === 'merito') entry.meritos++;
      if (r.categoria === 'atraso') entry.atrasos++;
      if (r.categoria === 'coordenação' && r.detalhe.toUpperCase().includes('SUSPENSÃO')) entry.suspensoes++;
    });

    return Object.values(map).sort((a, b) => b.ocorrencias - a.ocorrencias || a.nome.localeCompare(b.nome));
  }, [records]);

  const filtered = studentSummary.filter(s =>
    (!selectedTurma || s.turma === selectedTurma) &&
    (!filtroAlunoId || s.id === filtroAlunoId) &&
    (!filtroBuscaNome || s.nome.toLowerCase().includes(filtroBuscaNome.toLowerCase()))
  );

  const singleStudent = filtered.length === 1 && (filtroBuscaNome || filtroAlunoId);

  const downloadStudentReport = (student: any) => {
    const studentRecords = records.filter(r => r.alunoId === student.id).sort((a, b) => b.rawTimestamp - a.rawTimestamp);

    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>`;

    // Summary Sheet
    xml += `<Worksheet ss:Name="RESUMO"><Table><Row ss:StyleID="h"><Cell><Data ss:Type="String">CAMPO</Data></Cell><Cell><Data ss:Type="String">VALOR</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Nome</Data></Cell><Cell><Data ss:Type="String">${student.nome}</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Turma</Data></Cell><Cell><Data ss:Type="String">${student.turma}</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Ocorrências</Data></Cell><Cell><Data ss:Type="Number">${student.ocorrencias}</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Suspensões</Data></Cell><Cell><Data ss:Type="Number">${student.suspensoes}</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Média de Tempo Fora (min)</Data></Cell><Cell><Data ss:Type="Number">${student.saidas > 0 ? (student.tempoForaTotal / student.saidas).toFixed(1) : 0}</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Méritos</Data></Cell><Cell><Data ss:Type="Number">${student.meritos}</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Total de Saídas</Data></Cell><Cell><Data ss:Type="Number">${student.saidas}</Data></Cell></Row>`;
    xml += `</Table></Worksheet>`;

    // History Sheet
    xml += `<Worksheet ss:Name="HISTORICO"><Table><Row ss:StyleID="h"><Cell><Data ss:Type="String">DATA</Data></Cell><Cell><Data ss:Type="String">CATEGORIA</Data></Cell><Cell><Data ss:Type="String">DETALHE</Data></Cell><Cell><Data ss:Type="String">PROFESSOR</Data></Cell></Row>`;
    studentRecords.forEach(r => {
      xml += `<Row><Cell><Data ss:Type="String">${r.timestamp}</Data></Cell><Cell><Data ss:Type="String">${r.categoria.toUpperCase()}</Data></Cell><Cell><Data ss:Type="String">${r.detalhe}</Data></Cell><Cell><Data ss:Type="String">${r.professor}</Data></Cell></Row>`;
    });
    xml += `</Table></Worksheet></Workbook>`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
    link.download = `Relatorio_${student.nome.replace(/\s+/g, '_')}.xls`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="glass rounded-3xl shadow-lg overflow-hidden">
        <div className="bg-secondary/50 p-6 border-b border-border space-y-5">
          <h3 className="font-black text-sm text-foreground flex items-center gap-2"><Search size={18} className="text-primary" /> Diretório de Alunos</h3>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="Pesquisar por nome..." value={filtroBuscaNome} onChange={e => setFiltroBuscaNome(e.target.value)}
              className="w-full pl-11 pr-4 py-4 rounded-2xl border border-border bg-card outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-foreground shadow-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-card border border-border rounded-2xl p-4 text-xs font-bold outline-none text-foreground appearance-none"
              value={selectedTurma} onChange={e => { setSelectedTurma(e.target.value); setFiltroAlunoId(''); }}>
              <option value="">Todas as Turmas</option>
              {turmasExistentes.map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="bg-card border border-border rounded-2xl p-4 text-xs font-bold outline-none text-foreground appearance-none"
              value={filtroAlunoId} onChange={e => setFiltroAlunoId(e.target.value)}>
              <option value="">Todos os Alunos</option>
              {alunos.filter(a => !selectedTurma || a.turma === selectedTurma).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
        </div>

        {singleStudent && (
          <div className="bg-primary/5 border-b border-primary/10 p-6 animate-scale-in space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary text-primary-foreground w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-md shrink-0">
                  {filtered[0].nome.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground text-base flex items-center gap-2.5 mb-1">
                    {filtered[0].nome}
                    <span className="text-[10px] bg-card border border-primary/20 px-2 py-0.5 rounded-lg text-primary font-extrabold">{filtered[0].turma}</span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Perfil Consolidado do Aluno</p>
                </div>
              </div>
              <button onClick={() => downloadStudentReport(filtered[0])}
                className="bg-card hover:bg-secondary text-foreground p-3 rounded-xl border border-border shadow-sm transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase">
                <FileSpreadsheet size={16} className="text-accent" /> Exportar XLS
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Ocorrências', val: filtered[0].ocorrencias, icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
                { label: 'Suspensões', val: filtered[0].suspensoes, icon: Gavel, color: 'text-foreground', bg: 'bg-foreground/5' },
                { label: 'Tempo Médio', val: `${filtered[0].saidas > 0 ? (filtered[0].tempoForaTotal / filtered[0].saidas).toFixed(1) : 0}m`, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Méritos', val: filtered[0].meritos, icon: Star, color: 'text-accent', bg: 'bg-accent/10' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} p-3 rounded-2xl text-center border border-border/50`}>
                  <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${stat.color} bg-card/40`}>
                    <stat.icon size={14} strokeWidth={3} />
                  </div>
                  <p className="text-[18px] font-black text-foreground leading-none">{stat.val}</p>
                  <p className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-tighter mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto no-scrollbar p-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider border-b border-border">
                <th className="px-5 py-4">Aluno</th>
                <th className="px-2 py-4 text-center">Saídas</th>
                <th className="px-2 py-4 text-center text-destructive/60">Ocor.</th>
                <th className="px-2 py-4 text-center">Susp.</th>
                <th className="px-2 py-4 text-center text-accent/60">Méritos</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.map((s, idx) => (
                <tr key={idx} className="hover:bg-secondary/50 transition-colors group border-b border-border/30 last:border-0"
                  onClick={() => { setFiltroBuscaNome(s.nome); setFiltroAlunoId(s.id); }}>
                  <td className="px-5 py-4 cursor-pointer">
                    <span className="font-extrabold text-foreground block">{s.nome}</span>
                    <span className="font-bold text-muted-foreground text-[10px] uppercase mt-0.5 inline-block">{s.turma}</span>
                  </td>
                  <td className="px-2 py-4 text-center font-bold text-muted-foreground">{s.saidas || '-'}</td>
                  <td className="px-2 py-4 text-center font-bold text-destructive">{s.ocorrencias || '-'}</td>
                  <td className="px-2 py-4 text-center font-bold text-foreground">{s.suspensoes || '-'}</td>
                  <td className="px-2 py-4 text-center font-bold text-accent">{s.meritos || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PesquisaTab;

