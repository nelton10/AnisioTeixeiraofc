import React, { useState, useMemo } from 'react';
import { Search, Activity, UserX, BarChart3, FileSpreadsheet, Download, DatabaseBackup, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { HistoryRecord } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';

interface AnaliseTabProps {
  records: HistoryRecord[];
  turmasExistentes: string[];
  statsSummary: { totalSaidas: number; totalOcors: number; totalAtrasos: number; totalMeritos: number };
}

// Custom tooltip for styled Recharts tooltips
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong p-3 rounded-xl shadow-lg border border-border/50">
        <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-black" style={{ color: entry.color || entry.payload.fill }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

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
        if (!r.rawTimestamp) return false;
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
    const lineDataMap: Record<string, { saidas: number, ocorrencias: number }> = {};

    filteredHistory.forEach(r => {
      // 1. Ocorrencias and Turmas Data
      if (r.categoria === 'ocorrencia') {
        const tipo = (r.detalhe || "").split(' [')[0] || "?";
        occTypes[tipo] = (occTypes[tipo] || 0) + 1;
        if (r.alunoNome) infratores[r.alunoNome] = (infratores[r.alunoNome] || 0) + 1;
        if (r.turma) turmaStats[r.turma] = (turmaStats[r.turma] || 0) + 1;
      }
      // 2. Trend line data (Saídas vs Ocorrências by Date)
      if (r.rawTimestamp && (r.categoria === 'saida' || r.categoria === 'ocorrencia')) {
        const d = new Date(r.rawTimestamp);
        const dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!lineDataMap[dateKey]) lineDataMap[dateKey] = { saidas: 0, ocorrencias: 0 };
        if (r.categoria === 'saida') lineDataMap[dateKey].saidas++;
        if (r.categoria === 'ocorrencia') lineDataMap[dateKey].ocorrencias++;
      }
    });

    const occArr = Object.entries(occTypes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    const topInfr = Object.entries(infratores).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const turmaArr = Object.entries(turmaStats).map(([turma, count]) => ({ turma, count, fill: 'hsl(var(--primary))' })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Sort line data by date string parsing (rough sorting)
    const trendData = Object.entries(lineDataMap)
      .map(([date, counts]) => ({ date, ...counts }))
      .slice(-7); // Last 7 days with data

    return { occArr, maxOcc: occArr[0]?.count || 1, topInfr, turmaArr, trendData };
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

  // Pie Chart Data
  const pieData = [
    { name: 'Saídas', value: statsSummary.totalSaidas, color: 'hsl(var(--primary))' },
    { name: 'Ocorrências', value: statsSummary.totalOcors, color: 'hsl(var(--destructive))' },
    { name: 'Atrasos', value: statsSummary.totalAtrasos, color: 'hsl(var(--warning))' },
    { name: 'Méritos', value: statsSummary.totalMeritos, color: 'hsl(var(--accent))' },
  ].filter(d => d.value > 0);

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

      {/* Charts Row 1: Pie and Line */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie Chart: Distribution */}
        <div className="glass rounded-3xl p-6 shadow-lg h-72 flex flex-col">
          <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-2">
            <PieChartIcon size={18} className="text-primary" /> Distribuição Diária
          </h3>
          <div className="flex-1 w-full relative">
            {pieData.length === 0 ? <p className="text-xs text-muted-foreground m-auto absolute inset-0 flex items-center justify-center">Sem dados de hoje.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Line Chart: Trends */}
        <div className="glass rounded-3xl p-6 shadow-lg h-72 flex flex-col">
          <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> Tendências (Últimos Dias)
          </h3>
          <div className="flex-1 w-full relative">
            {dashboard.trendData.length === 0 ? <p className="text-xs text-muted-foreground m-auto absolute inset-0 flex items-center justify-center">Sem dados recentes.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="monotone" name="Saídas" dataKey="saidas" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Ocorrências" dataKey="ocorrencias" stroke="hsl(var(--destructive))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Behavior Chart (Top Turmas replaced with Recharts BarChart) */}
      <div className="glass rounded-3xl p-6 shadow-lg h-80 flex flex-col">
        <h3 className="text-sm font-black text-foreground mb-6 flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" /> Ocorrências por Turma (Top 5)
        </h3>
        <div className="flex-1 w-full relative">
          {dashboard.turmaArr.length === 0 ? <p className="text-xs text-muted-foreground m-auto absolute inset-0 flex items-center justify-center">Sem dados.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.turmaArr} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="turma" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
                <Bar dataKey="count" name="Ocorrências" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
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

      {/* Export */}
      <div className="bg-foreground p-8 rounded-3xl text-background shadow-2xl space-y-5 relative overflow-hidden mt-8">
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
