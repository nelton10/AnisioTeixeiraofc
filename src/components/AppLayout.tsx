import React from 'react';
import { LogOut, Clock, AlertCircle, History, DoorOpen, GraduationCap, Library, Search, BarChart3, Settings, Star } from 'lucide-react';
import EscolaLogo from './EscolaLogo';
import { UserRole } from '@/types';

interface AppHeaderProps {
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onLogout }) => (
  <header className="glass-strong px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
    <div className="flex items-center gap-3">
      <EscolaLogo className="w-10 h-11 drop-shadow-sm" />
      <div>
        <h2 className="font-black text-base leading-none text-foreground tracking-tight">Anísio Teixeira</h2>
        <p className="text-[9px] text-primary uppercase mt-1 font-bold tracking-[0.2em]">Gestão Inteligente</p>
      </div>
    </div>
    <button onClick={onLogout} className="p-2.5 text-muted-foreground bg-secondary hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all">
      <LogOut size={18} strokeWidth={2.5} />
    </button>
  </header>
);

interface TabNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  coordCount: number;
  libraryCount: number;
}

const tabs: { id: string; label: string; icon: typeof Clock; hideFor?: string[]; badge?: string }[] = [
  { id: 'saidas', label: 'Saídas', icon: Clock },
  { id: 'ocorrencias', label: 'Ocorrências', icon: AlertCircle, hideFor: ['aluno'] },
  { id: 'historico', label: 'Histórico', icon: History, hideFor: ['aluno'] },
  { id: 'avaliar_aula', label: 'Avaliar Aula', icon: Star, hideFor: ['aluno'] },
  { id: 'atrasos', label: 'Entradas', icon: DoorOpen, hideFor: ['professor', 'aluno'] },
  { id: 'coord', label: 'Coord.', icon: GraduationCap, hideFor: ['aluno'], badge: 'coordCount' },
  { id: 'medidas', label: 'Biblioteca', icon: Library, hideFor: ['aluno'], badge: 'libraryCount' },
  { id: 'pesquisa', label: 'Pesquisa', icon: Search, hideFor: ['aluno'] },
  { id: 'acompanhamento', label: 'Análise', icon: BarChart3, hideFor: ['professor', 'aluno'] },
  { id: 'alunos', label: 'Alunos', icon: GraduationCap, hideFor: ['professor', 'aluno'] },
  { id: 'admin', label: 'Config', icon: Settings, hideFor: ['professor', 'aluno'] },
];

export const TabNav: React.FC<TabNavProps> = ({ activeTab, setActiveTab, userRole, coordCount, libraryCount }) => {
  const badges: Record<string, number> = { coordCount, libraryCount };

  return (
    <nav className="px-4 py-3 max-w-2xl mx-auto w-full overflow-x-auto no-scrollbar sticky top-[65px] z-40 bg-background/80 backdrop-blur-sm">
      <div className="flex glass p-1.5 rounded-2xl gap-1 min-w-max">
        {tabs.filter(t => !t.hideFor?.includes(userRole as never)).map(t => {
          const Icon = t.icon;
          const badgeVal = t.badge ? badges[t.badge] : 0;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 relative transition-all duration-200
              ${activeTab === t.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              <Icon size={16} strokeWidth={activeTab === t.id ? 2.5 : 2} />
              {t.label}
              {badgeVal > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full animate-bounce font-extrabold shadow-sm">
                  {badgeVal}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
