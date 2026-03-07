import React, { useState, useMemo } from 'react';
import { Search, Activity, UserX, BarChart3, FileSpreadsheet, Download, DatabaseBackup } from 'lucide-react';
import { HistoryRecord, Aluno } from '@/types';

interface AnaliseTabProps {
  records: HistoryRecord[];
  turmasExistentes: string[];
  statsSummary: { totalSaidas: number; totalOcors: number; totalAtrasos: number; totalMeritos: number };
}

const AnaliseTab: React.FC<AnaliseTabProps> = ({ records, turmasExistentes, statsSummary }) => {
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [filtroBuscaNome, setFiltroBuscaNome] = useState('');
  const [tipoExport, setTipoExport] = useState('todos');

  const filteredHistory = useMemo(() => {
    return records.filter(r => {
      if (selectedTurma && r.turma !== selectedTurma) return false;
      if (filtroBuscaNome && !r.alunoNome?.toLowerCase().includes(filtroBuscaNome.toLowerCase())) return false;
      if (filtroDataInicio || filtroDataFim) {
        const rDate = new Date(r.rawTimestamp); rDate.setHours(0, 0, 0, 0);
        if (filtroDataInicio) { const d = new Date(filtroDataInicio); d.setHours(0, 0, 0, 0); if (rDate < d) return false; }
        if (filtroDataFim) { const d = new Date(filtroDataFim); d.setHours(23, 59, 59, 999); if (rDate > d) return false; }
      }
      return true;
    });
  }, [records, selectedTurma, filtroBuscaNome, filtroDataInicio, filtroDataFim]);

  const dashboard = useMemo(() => {
    const occTypes: Record<string, number> = {};
    const infratores: Record<string, number> = {};
    const turmaStats: Record<string, number> = {};
    filteredHistory.forEach(r => {
      if (r.categoria === 'ocorrencia') {
        const tipo = r.detalhe.split(' [')[0] || "?";
        occTypes[tipo] = (occTypes[tipo] || 0) + 1;
        if (r.alunoNome) infratores[r.alunoNome] = (infratores[r.alunoNome] || 0) + 1;
        if (r.turma) turmaStats[r.turma] = (turmaStats[r.turma] || 0) + 1;
      }
    });
    const occArr = Object.entries(occTypes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    const topInfr = Object.entries(infratores).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const turmaArr = Object.entries(turmaStats).map(([turma, count]) => ({ turma, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    return {
      occArr, maxOcc: occArr[0]?.count || 1,
      topInfr, turmaArr, maxTurma: turmaArr[0]?.count || 1,
    };
  }, [filteredHistory]);

  const downloadReport = () => {
    const cats = ['ocorrencia', 'merito', 'saida', 'atraso', 'coordenação'];
    if (!records.length) return;
    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>`;
    const toGen = tipoExport === 'todos' ? cats : [tipoExport];
    toGen.forEach(c => {
      const ds = filteredHistory.filter(r => r.categoria === c);
      xml += `<Worksheet ss:Name="${c.toUpperCase().slice(0, 31)}"><Table><Row ss:StyleID="h"><Cell><Data ss:Type="String">DATA</Data></Cell><Cell><Data ss:Type="String">TURMA</Data></Cell><Cell><Data ss:Type="String">NOME</Data></Cell><Cell><Data ss:Type="String">DESCRIÇÃO</Data></Cell></Row>`;
      ds.forEach(r => xml += `<Row><Cell><Data ss:Type="String">${r.timestamp}</Data></Cell><Cell><Data ss:Type="String">${r.turma || ""}</Data></Cell><Cell><Data ss:Type="String">${r.alunoNome || ""}</Data></Cell><Cell><Data ss:Type="String">${r.detalhe || ""}</Data></Cell></Row>`);
      xml += `</Table></Worksheet>`;
    });
    xml += `</Workbook>`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
    link.download = `Relatorio_Anisio.xls`;
    link.click();
  };

  const ocorrenciasTotais = records.filter(r => r.categoria === 'ocorrencia').length;
  const ocorrenciasPeriodo = filteredHistory.filter(r => r.categoria === 'ocorrencia').length;
  const diasComOcorrencia = new Set(records.filter(r => r.categoria === 'ocorrencia').map(r => new Date(r.rawTimestamp || 0).setHours(0, 0, 0, 0))).size;
  const mediaPorDia = diasComOcorrencia > 0 ? parseFloat((ocorrenciasTotais / diasComOcorrencia).toFixed(1)) : 0;

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Filters */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><Search size={18} className="text-primary" /> Filtros de Análise</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block ml-1">Data Início</label>
            <input type="date" className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm font-semibold outline-none text-foreground" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block ml-1">Data Fim</label>
            <input type="date" className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm font-semibold outline-none text-foreground" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <select className="bg-secondary border border-border rounded-2xl p-4 text-sm font-semibold outline-none text-foreground appearance-none" value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}>
            <option value="">Todas Turmas</option>
            {turmasExistentes.map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="text" placeholder="Filtrar por nome..." className="bg-secondary border border-border rounded-2xl p-4 text-sm font-semibold outline-none text-foreground" value={filtroBuscaNome} onChange={e => setFiltroBuscaNome(e.target.value)} />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-destructive/5 p-4 rounded-2xl border border-destructive/10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
          <p className="text-[10px] font-extrabold text-destructive/70 uppercase tracking-widest mb-1.5">Total</p>
          <p className="text-3xl font-black text-destructive">{ocorrenciasTotais}</p>
        </div>
        <div className="bg-warning/5 p-4 rounded-2xl border border-warning/10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-warning" />
          <p className="text-[10px] font-extrabold text-warning/70 uppercase tracking-widest mb-1.5">Média/Dia</p>
          <p className="text-3xl font-black text-warning">{mediaPorDia}</p>
        </div>
        <div className="bg-primary p-4 rounded-2xl text-center relative overflow-hidden shadow-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-foreground/20" />
          <p className="text-[10px] font-extrabold text-primary-foreground/70 uppercase tracking-widest mb-1.5">No Filtro</p>
          <p className="text-3xl font-black text-primary-foreground">{ocorrenciasPeriodo}</p>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { label: 'Saídas Hj', val: statsSummary.totalSaidas, color: 'text-primary' },
          { label: 'Ocorr. Hj', val: statsSummary.totalOcors, color: 'text-destructive' },
          { label: 'Méritos Hj', val: statsSummary.totalMeritos, color: 'text-accent' },
          { label: 'Atrasos Hj', val: statsSummary.totalAtrasos, color: 'text-warning' },
        ].map(s => (
          <div key={s.label} className="glass p-4 rounded-3xl text-center hover:shadow-md transition-shadow">
            <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Behavior Chart */}
      <div className="glass rounded-3xl shadow-lg overflow-hidden">
        <div className="bg-secondary/50 p-5 border-b border-border flex items-center gap-2.5">
          <Activity size={18} className="text-primary" />
          <h3 className="font-black text-sm text-foreground">Mapeamento de Comportamento</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-4">Ocorrências Mais Frequentes</h4>
            <div className="space-y-4">
              {dashboard.occArr.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados.</p> :
                dashboard.occArr.map((occ, idx) => (
                  <div key={idx} className="relative group">
                    <div className="flex justify-between text-xs font-bold text-foreground mb-1.5">
                      <span>{occ.name}</span>
                      <span className="text-muted-foreground group-hover:text-destructive transition-colors">{occ.count}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                      <div className="bg-destructive h-full rounded-full transition-all duration-1000" style={{ width: `${(occ.count / dashboard.maxOcc) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Infratores */}
      <div className="bg-destructive/5 rounded-3xl border border-destructive/10 shadow-md p-6">
        <h3 className="text-sm font-black text-destructive mb-5 flex items-center gap-2"><UserX size={18} /> Top 10 Infratores</h3>
        <div className="grid grid-cols-2 gap-3">
          {dashboard.topInfr.length === 0 ? <p className="text-xs text-destructive/60 col-span-2">Ninguém registado.</p> :
            dashboard.topInfr.map((a, i) => (
              <div key={i} className="flex justify-between items-center bg-card p-3 rounded-2xl border border-destructive/10 shadow-sm">
                <span className="text-xs font-bold text-foreground truncate pr-2"><span className="text-destructive font-black mr-1">{i + 1}º</span> {a.nome}</span>
                <span className="text-[9px] bg-destructive/10 text-destructive font-extrabold px-2 py-1 rounded-lg shrink-0">{a.count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Top Turmas Chart */}
      <div className="glass rounded-3xl p-6 shadow-lg">
        <h3 className="text-sm font-black text-foreground mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-primary" /> Top 5 Turmas</h3>
        <div className="flex items-end justify-around gap-2.5 h-36 pt-4 border-b-2 border-border">
          {dashboard.turmaArr.length === 0 ? <p className="text-xs text-muted-foreground m-auto">Sem dados.</p> :
            dashboard.turmaArr.map(t => (
              <div key={t.turma} className="flex flex-col items-center w-full group relative">
                <span className="absolute -top-8 text-[11px] font-black text-primary opacity-0 group-hover:opacity-100 transition-all bg-primary/10 px-2 py-1 rounded-lg">{t.count}</span>
                <div className="w-full max-w-[40px] bg-primary rounded-t-xl hover:opacity-80 transition-opacity shadow-sm" style={{ height: `${Math.max((t.count / dashboard.maxTurma) * 100, 8)}%` }} />
                <span className="text-[11px] font-extrabold mt-3 text-muted-foreground tracking-widest">{t.turma}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Export */}
      <div className="bg-foreground p-8 rounded-3xl text-background shadow-2xl space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><DatabaseBackup size={150} /></div>
        <h3 className="text-sm font-black flex items-center gap-2.5 text-primary relative z-10"><FileSpreadsheet size={20} /> Extração de Dados</h3>
        <div className="space-y-4 relative z-10">
          <select className="w-full bg-background/10 text-background border border-background/20 p-4 rounded-2xl text-sm font-bold outline-none appearance-none" value={tipoExport} onChange={e => setTipoExport(e.target.value)}>
            <option value="todos">Relatório Completo</option>
            <option value="ocorrencia">Apenas Ocorrências</option>
            <option value="saida">Apenas Saídas</option>
            <option value="atraso">Apenas Entradas Tardias</option>
            <option value="merito">Apenas Méritos</option>
          </select>
          <button onClick={downloadReport}
            className="w-full bg-primary py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 text-primary-foreground shadow-lg active:scale-[0.98] transition-all text-sm">
            <Download size={18} /> GERAR FICHEIRO .XLS
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnaliseTab;
