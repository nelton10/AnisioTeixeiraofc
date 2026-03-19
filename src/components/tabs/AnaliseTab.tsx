import React, { useState, useMemo, useEffect } from 'react';
import { Search, Activity, UserX, BarChart3, FileSpreadsheet, Download, DatabaseBackup, PieChart as PieChartIcon, TrendingUp, Trophy, Medal, CalendarClock } from 'lucide-react';
import * as store from '@/lib/store';
import { HistoryRecord } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';

interface AnaliseTabProps {
  records: HistoryRecord[];
  turmasExistentes: string[];
  statsSummary: { totalSaidas: number; totalOcors: number; totalAtrasos: number; totalMeritos: number; totalAvaliacoes: number };
  verTodoPeriodo: boolean;
  setVerTodoPeriodo: (v: boolean) => void;
  filtroDataInicio: string;
  setFiltroDataInicio: (s: string) => void;
  filtroDataFim: string;
  setFiltroDataFim: (s: string) => void;
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

const AnaliseTab: React.FC<AnaliseTabProps> = ({ 
  records, turmasExistentes, statsSummary,
  verTodoPeriodo, setVerTodoPeriodo, filtroDataInicio, setFiltroDataInicio, filtroDataFim, setFiltroDataFim
}) => {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [filtroBuscaNome, setFiltroBuscaNome] = useState('');
  const [tipoExport, setTipoExport] = useState('todos');
  const [absentRangeStart, setAbsentRangeStart] = useState(new Date().toISOString().split('T')[0]);
  const [absentRangeEnd, setAbsentRangeEnd] = useState(new Date().toISOString().split('T')[0]);
  const [absentRangeTurma, setAbsentRangeTurma] = useState('');
  const [rangeFrequencias, setRangeFrequencias] = useState<any[]>([]);
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [frequenciasHoje, setFrequenciasHoje] = useState<any[]>([]);

  const filteredHistory = useMemo(() => {
    return records.filter(r => {
      if (selectedTurma && r.turma !== selectedTurma) return false;
      if (filtroBuscaNome && !r.alunoNome?.toLowerCase().includes(filtroBuscaNome.toLowerCase())) return false;
      
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
  }, [records, selectedTurma, filtroBuscaNome, filtroDataInicio, filtroDataFim, verTodoPeriodo]);

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

    // Gamification: Ranking das Turmas
    const classScores: Record<string, number> = {};
    filteredHistory.forEach(r => {
      if (!r.turma) return;
      if (!classScores[r.turma]) classScores[r.turma] = 0;

      if (r.categoria === 'merito') classScores[r.turma] += 5;       // +5 pontos por mérito
      else if (r.categoria === 'ocorrencia') classScores[r.turma] -= 3; // -3 por ocorrência (indisciplina)
      else if (r.categoria === 'atraso') classScores[r.turma] -= 1;     // -1 por atraso
    });

    const rankingData = Object.entries(classScores)
      .map(([turma, score]) => ({ turma, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5

    // Sort line data by date string parsing (rough sorting)
    const trendData = Object.entries(lineDataMap)
      .map(([date, counts]) => ({ date, ...counts }))
      .slice(-7); // Last 7 days with data

    // Heatmap Data (Day x Period)
    const heatmapMatrix = [
      { day: 'Seg', manha: 0, tarde: 0, noite: 0 },
      { day: 'Ter', manha: 0, tarde: 0, noite: 0 },
      { day: 'Qua', manha: 0, tarde: 0, noite: 0 },
      { day: 'Qui', manha: 0, tarde: 0, noite: 0 },
      { day: 'Sex', manha: 0, tarde: 0, noite: 0 },
    ];

    let maxHeat = 0;
    filteredHistory.forEach(r => {
      if (!r.rawTimestamp || (r.categoria !== 'ocorrencia' && r.categoria !== 'atraso')) return;
      const d = new Date(r.rawTimestamp);
      const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon... 6=Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const hour = d.getHours();
        const period = hour < 12 ? 'manha' : hour < 18 ? 'tarde' : 'noite';
        heatmapMatrix[dayOfWeek - 1][period]++;
        if (heatmapMatrix[dayOfWeek - 1][period] > maxHeat) {
          maxHeat = heatmapMatrix[dayOfWeek - 1][period];
        }
      }
    });

    return { occArr, maxOcc: occArr[0]?.count || 1, topInfr, turmaArr, trendData, rankingData, heatmapMatrix, maxHeat };
  }, [filteredHistory]);

  const loadTodayFrequencias = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await store.getFrequenciasByDate(today);
      setFrequenciasHoje(data);
    } catch (e) { console.error(e); }
  };

  const loadRangeFrequencias = async () => {
    setIsRangeLoading(true);
    try {
      const data = await store.getFrequenciasByRange(absentRangeStart, absentRangeEnd, absentRangeTurma || selectedTurma);
      setRangeFrequencias(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRangeLoading(false);
    }
  };

  useEffect(() => {
    loadRangeFrequencias();
    loadTodayFrequencias();
  }, [absentRangeStart, absentRangeEnd, absentRangeTurma, selectedTurma]);

  const rangeFaltosos = useMemo(() => {
    const absentDetails: Record<string, { nome: string, turma: string, count: number, dates: string[] }> = {};

    rangeFrequencias.forEach(f => {
      if (f.status === 'A') {
        if (!absentDetails[f.alunoId]) {
          absentDetails[f.alunoId] = { nome: f.alunoNome, turma: f.turma, count: 0, dates: [] };
        }
        absentDetails[f.alunoId].count++;
        if (!absentDetails[f.alunoId].dates.includes(f.data)) {
          absentDetails[f.alunoId].dates.push(f.data);
        }
      }
    });

    return Object.values(absentDetails).sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome));
  }, [rangeFrequencias]);

  const faltososHoje = useMemo(() => {
    const absentDetails: Record<string, { nome: string, turma: string, periods: string[] }> = {};

    frequenciasHoje.forEach(f => {
      if (f.status === 'A') {
        if (!absentDetails[f.alunoId]) {
          absentDetails[f.alunoId] = { nome: f.alunoNome, turma: f.turma, periods: [] };
        }
        if (!absentDetails[f.alunoId].periods.includes(f.period)) {
          absentDetails[f.alunoId].periods.push(f.period);
        }
      }
    });

    return Object.values(absentDetails).sort((a, b) => a.turma.localeCompare(b.turma) || a.nome.localeCompare(b.nome));
  }, [frequenciasHoje]);

  const downloadReport = () => {
    if (!records.length) return;
    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>`;

    if (tipoExport === 'fechamento_mensal') {
      const summaryByMonth: Record<string, { ocorrencias: number, meritos: number, atrasos: number, saidas: number }> = {};
      filteredHistory.forEach(r => {
        if (!r.rawTimestamp) return;
        const d = new Date(r.rawTimestamp);
        const monthYear = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        if (!summaryByMonth[monthYear]) summaryByMonth[monthYear] = { ocorrencias: 0, meritos: 0, atrasos: 0, saidas: 0 };
        if (r.categoria === 'ocorrencia') summaryByMonth[monthYear].ocorrencias++;
        if (r.categoria === 'merito') summaryByMonth[monthYear].meritos++;
        if (r.categoria === 'atraso') summaryByMonth[monthYear].atrasos++;
        if (r.categoria === 'saida') summaryByMonth[monthYear].saidas++;
      });
      xml += `<Worksheet ss:Name="Fechamento Mensal"><Table><Row ss:StyleID="h"><Cell><Data ss:Type="String">MES</Data></Cell><Cell><Data ss:Type="String">OCORRENCIAS</Data></Cell><Cell><Data ss:Type="String">MERITOS</Data></Cell><Cell><Data ss:Type="String">ATRASOS</Data></Cell><Cell><Data ss:Type="String">SAIDAS</Data></Cell></Row>`;
      Object.entries(summaryByMonth).sort().forEach(([month, counts]) => {
        xml += `<Row><Cell><Data ss:Type="String">${month}</Data></Cell><Cell><Data ss:Type="Number">${counts.ocorrencias}</Data></Cell><Cell><Data ss:Type="Number">${counts.meritos}</Data></Cell><Cell><Data ss:Type="Number">${counts.atrasos}</Data></Cell><Cell><Data ss:Type="Number">${counts.saidas}</Data></Cell></Row>`;
      });
      xml += `</Table></Worksheet>`;
    } else if (tipoExport === 'lote_turma') {
      const summaryByAluno: Record<string, { turma: string, ocorrencias: number, meritos: number, atrasos: number, saidas: number }> = {};
      filteredHistory.forEach(r => {
        const nome = r.alunoNome || 'Desconhecido';
        if (!summaryByAluno[nome]) summaryByAluno[nome] = { turma: r.turma || '', ocorrencias: 0, meritos: 0, atrasos: 0, saidas: 0 };
        if (r.categoria === 'ocorrencia') summaryByAluno[nome].ocorrencias++;
        if (r.categoria === 'merito') summaryByAluno[nome].meritos++;
        if (r.categoria === 'atraso') summaryByAluno[nome].atrasos++;
        if (r.categoria === 'saida') summaryByAluno[nome].saidas++;
      });
      const sheetName = selectedTurma ? `Consolidado ${selectedTurma}` : 'Consolidado';
      xml += `<Worksheet ss:Name="${sheetName.slice(0, 31)}"><Table><Row ss:StyleID="h"><Cell><Data ss:Type="String">NOME</Data></Cell><Cell><Data ss:Type="String">TURMA</Data></Cell><Cell><Data ss:Type="String">OCORRENCIAS</Data></Cell><Cell><Data ss:Type="String">MERITOS</Data></Cell><Cell><Data ss:Type="String">ATRASOS</Data></Cell><Cell><Data ss:Type="String">SAIDAS</Data></Cell></Row>`;
      Object.entries(summaryByAluno).sort((a, b) => a[0].localeCompare(b[0])).forEach(([nome, counts]) => {
        xml += `<Row><Cell><Data ss:Type="String">${nome.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell><Cell><Data ss:Type="String">${counts.turma}</Data></Cell><Cell><Data ss:Type="Number">${counts.ocorrencias}</Data></Cell><Cell><Data ss:Type="Number">${counts.meritos}</Data></Cell><Cell><Data ss:Type="Number">${counts.atrasos}</Data></Cell><Cell><Data ss:Type="Number">${counts.saidas}</Data></Cell></Row>`;
      });
      xml += `</Table></Worksheet>`;
    } else {
      const cats = ['ocorrencia', 'merito', 'saida', 'atraso', 'coordenação', 'avaliacao_aula'];
      const toGen = tipoExport === 'todos' ? cats : [tipoExport];
      toGen.forEach(c => {
        const ds = filteredHistory.filter(r => r.categoria === c);
        xml += `<Worksheet ss:Name="${c.toUpperCase().slice(0, 31)}"><Table><Row ss:StyleID="h"><Cell><Data ss:Type="String">DATA</Data></Cell><Cell><Data ss:Type="String">TURMA</Data></Cell><Cell><Data ss:Type="String">NOME</Data></Cell><Cell><Data ss:Type="String">DESCRICAO</Data></Cell></Row>`;
        ds.forEach(r => xml += `<Row><Cell><Data ss:Type="String">${r.timestamp}</Data></Cell><Cell><Data ss:Type="String">${r.turma || ""}</Data></Cell><Cell><Data ss:Type="String">${(r.alunoNome || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell><Cell><Data ss:Type="String">${(r.detalhe || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell></Row>`);
        xml += `</Table></Worksheet>`;
      });
    }

    xml += `</Workbook>`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
    link.download = `Relatorio_${tipoExport}.xls`;
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
    { name: 'Avaliações', value: statsSummary.totalAvaliacoes, color: 'hsl(var(--indigo-500))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Filters */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><Search size={18} className="text-primary" /> Filtros de Análise</h3>
          <button 
                onClick={() => setVerTodoPeriodo(!verTodoPeriodo)}
                className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all ${verTodoPeriodo ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                {verTodoPeriodo ? 'Todo o Período: ON' : 'Todo o Período: OFF'}
              </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block ml-1">Data Início</label>
            <input type="date" disabled={verTodoPeriodo} className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm font-semibold outline-none text-foreground disabled:opacity-50" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block ml-1">Data Fim</label>
            <input type="date" disabled={verTodoPeriodo} className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm font-semibold outline-none text-foreground disabled:opacity-50" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
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

      {(!filtroDataInicio || !filtroDataFim) && !verTodoPeriodo ? (
        <div className="glass rounded-3xl p-20 text-center space-y-4 shadow-lg">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={32} className="text-primary/20" />
          </div>
          <p className="font-black text-muted-foreground text-sm uppercase tracking-widest">Aguardando Período...</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">Por favor, selecione uma <b>Data Início</b> e <b>Data Fim</b> acima para gerar a análise estatística.</p>
        </div>
      ) : (
        <>
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

          {/* Alunos Faltosos Hoje Section */}
          <div className="bg-destructive/5 rounded-3xl border border-destructive/10 p-6 shadow-sm">
            <h3 className="text-sm font-black text-destructive mb-4 flex items-center gap-2">
              <UserX size={18} /> Alunos Faltosos Hoje ({faltososHoje.length})
            </h3>
            {faltososHoje.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Todas as turmas completas ou sem registro de faltas hoje.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {faltososHoje.map((f, i) => (
                  <div key={i} className="px-3 py-1.5 bg-card border border-destructive/10 rounded-xl flex items-center gap-2 shadow-sm">
                    <span className="text-[11px] font-extrabold text-foreground">{f.nome}</span>
                    <span className="text-[9px] font-black text-destructive bg-destructive/5 px-1.5 py-0.5 rounded-lg uppercase">{f.turma}</span>
                    {f.periods.length > 0 && (
                      <div className="flex gap-0.5">
                        {f.periods.sort().map(p => (
                          <span key={p} className="text-[8px] font-black text-muted-foreground">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Heatmap (Dias x Períodos) */}
            <div className="glass rounded-3xl p-6 shadow-lg h-80 flex flex-col">
              <h3 className="text-sm font-black text-foreground mb-6 flex items-center gap-2">
                <Activity size={18} className="text-destructive" /> Mapa de Calor (Incidentes)
              </h3>
              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-4 gap-2 text-center mb-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Dia</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Manhã</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Tarde</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Noite</div>
                </div>
                {dashboard.heatmapMatrix.map(row => (
                  <div key={row.day} className="grid grid-cols-4 gap-2 mb-2 items-center">
                    <div className="text-xs font-black text-foreground text-center">{row.day}</div>
                    {(['manha', 'tarde', 'noite'] as const).map(period => {
                      const val = row[period];
                      const intensity = dashboard.maxHeat > 0 ? val / dashboard.maxHeat : 0;
                      const bgColor = intensity === 0 ? 'bg-secondary' : `bg-destructive`;

                      return (
                        <div key={period}
                          className={`h-10 rounded-xl flex items-center justify-center transition-all ${bgColor}`}
                          style={{ opacity: intensity === 0 ? 1 : Math.max(0.3, intensity) }}>
                          <span className={`text-xs font-bold ${intensity > 0.5 ? 'text-white' : (intensity === 0 ? 'text-muted-foreground' : 'text-destructive-foreground')}`}>
                            {val > 0 ? val : '-'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side-by-Side: Infratores vs Ranking Gamificado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Infratores */}
            <div className="bg-destructive/5 rounded-3xl border border-destructive/10 shadow-md p-6 h-full">
              <h3 className="text-sm font-black text-destructive mb-5 flex items-center gap-2"><UserX size={18} /> Top Infratores</h3>
              <div className="space-y-3">
                {dashboard.topInfr.length === 0 ? <p className="text-xs text-destructive/60">Ninguém registado.</p> :
                  dashboard.topInfr.map((a, i) => (
                    <div key={i} className="flex justify-between items-center bg-card p-3 rounded-2xl border border-destructive/10 shadow-sm">
                      <span className="text-xs font-bold text-foreground truncate pr-2"><span className="text-destructive font-black mr-1">{i + 1}º</span> {a.nome}</span>
                      <span className="text-[9px] bg-destructive/10 text-destructive font-extrabold px-2 py-1 rounded-lg shrink-0">{a.count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Gamification: Ranking Turmas */}
            <div className="bg-accent/5 rounded-3xl border border-accent/20 shadow-md p-6 relative overflow-hidden h-full">
              <div className="absolute -top-4 -right-4 text-accent/10"><Trophy size={100} /></div>
              <h3 className="text-sm font-black text-accent mb-2 flex items-center gap-2 relative z-10"><Medal size={18} /> Ranking de Turmas</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-5 relative z-10">Conhece a Turma do Mês</p>

              <div className="space-y-3 relative z-10">
                {dashboard.rankingData.length === 0 ? <p className="text-xs text-accent/60">Sem dados suficientes.</p> :
                  dashboard.rankingData.map((a, i) => (
                    <div key={i} className={`flex justify-between items-center p-3 rounded-2xl border shadow-sm transition-all ${i === 0 ? 'bg-accent text-accent-foreground border-accent scale-105 shadow-accent/30 my-4 py-4' : 'bg-card border-accent/10 border text-foreground'
                      }`}>
                      <span className={`text-xs font-bold truncate pr-2 flex items-center gap-2 ${i === 0 ? 'text-sm font-black' : ''}`}>
                        <span className="font-black opacity-70">{i + 1}º</span>
                        {i === 0 && <Trophy size={16} className="text-yellow-300 fill-yellow-300" />} {a.turma}
                      </span>
                      <div className="text-right">
                        <span className={`text-xs font-black ${i === 0 ? 'text-background' : (a.score >= 0 ? 'text-accent' : 'text-destructive')}`}>
                          {a.score > 0 ? `+${a.score}` : a.score}
                        </span>
                        <span className="text-[9px] ml-1 opacity-70 uppercase tracking-widest">PTS</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Relatório de Faltas por Período */}
          <div className="glass rounded-3xl p-6 shadow-lg border border-destructive/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><CalendarClock size={100} /></div>
            <h3 className="font-black text-sm text-destructive uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
              <CalendarClock size={18} /> Relatório de Faltas por Período
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data Inicial</label>
                <input type="date" value={absentRangeStart} onChange={e => setAbsentRangeStart(e.target.value)}
                  className="w-full p-3.5 bg-secondary rounded-2xl border border-border text-xs font-bold outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data Final</label>
                <input type="date" value={absentRangeEnd} onChange={e => setAbsentRangeEnd(e.target.value)}
                  className="w-full p-3.5 bg-secondary rounded-2xl border border-border text-xs font-bold outline-none" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Filtrar Turma</label>
                <select value={absentRangeTurma} onChange={e => setAbsentRangeTurma(e.target.value)}
                  className="w-full p-3.5 bg-secondary rounded-2xl border border-border text-xs font-bold outline-none">
                  <option value="">Todas</option>
                  {turmasExistentes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {isRangeLoading ? (
              <div className="py-16 flex justify-center"><div className="w-10 h-10 border-4 border-destructive/20 border-t-destructive rounded-full animate-spin" /></div>
            ) : rangeFaltosos.length === 0 ? (
              <div className="py-16 text-center bg-secondary/30 rounded-3xl border-2 border-dashed border-border">
                <p className="text-xs font-bold text-muted-foreground">Nenhuma falta registrada neste intervalo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                {rangeFaltosos.map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-card border border-destructive/10 rounded-2xl hover:border-destructive/30 transition-all shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl font-black ${f.count >= 5 ? 'bg-destructive text-white shadow-lg shadow-destructive/20' : 'bg-destructive/10 text-destructive'}`}>
                        <span className="text-sm">{f.count}</span>
                        <span className="text-[7px] uppercase -mt-1">faltas</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground group-hover:text-destructive transition-colors">{f.nome}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{f.turma} • {f.dates.length} dias</p>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                       {f.dates.slice(-3).reverse().map((d, id) => (
                         <div key={id} className="w-7 h-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[9px] font-black text-muted-foreground shadow-sm">
                           {d.split('-')[2]}
                         </div>
                       ))}
                       {f.dates.length > 3 && (
                         <div className="w-7 h-7 rounded-full bg-destructive/10 border-2 border-card flex items-center justify-center text-[9px] font-black text-destructive">
                           +{f.dates.length - 3}
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div className="bg-foreground p-8 rounded-3xl text-background shadow-2xl space-y-5 relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 p-8 opacity-5"><DatabaseBackup size={150} /></div>
            <h3 className="text-sm font-black flex items-center gap-2.5 text-primary relative z-10"><FileSpreadsheet size={20} /> Extração de Dados</h3>
            <div className="space-y-4 relative z-10">
              <select className="w-full bg-background/10 text-background border border-background/20 p-4 rounded-2xl text-sm font-bold outline-none appearance-none" value={tipoExport} onChange={e => setTipoExport(e.target.value)}>
                <option value="todos">Relatório Completo</option>
                <option value="fechamento_mensal">Fechamento Mensal (Escola)</option>
                <option value="lote_turma">Boletins da Turma / Lote</option>
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
        </>
      )}
    </div>
  );
};

export default AnaliseTab;
