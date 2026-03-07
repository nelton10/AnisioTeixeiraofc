import React from 'react';
import { useAppState } from '@/hooks/useAppState';
import LoginScreen from '@/components/LoginScreen';
import { AppHeader, TabNav } from '@/components/AppLayout';
import SaidasTab from '@/components/tabs/SaidasTab';
import OcorrenciasTab from '@/components/tabs/OcorrenciasTab';
import HistoricoTab from '@/components/tabs/HistoricoTab';
import AtrasosTab from '@/components/tabs/AtrasosTab';
import CoordTab from '@/components/tabs/CoordTab';
import BibliotecaTab from '@/components/tabs/BibliotecaTab';
import PesquisaTab from '@/components/tabs/PesquisaTab';
import AnaliseTab from '@/components/tabs/AnaliseTab';
import AdminTab from '@/components/tabs/AdminTab';

const Index = () => {
  const state = useAppState();

  if (!state.authState.isAuthenticated) {
    return <LoginScreen onLogin={state.login} />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col font-sans text-foreground">
      {/* Toast */}
      {state.showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3.5 rounded-2xl shadow-xl z-[160] font-bold text-sm flex items-center gap-3 animate-slide-up">
          <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" /> {state.showToast}
        </div>
      )}

      <AppHeader onLogout={state.logout} />
      <TabNav
        activeTab={state.activeTab}
        setActiveTab={state.setActiveTab}
        userRole={state.authState.role}
        coordCount={state.coordinationQueue.length}
        libraryCount={state.libraryQueue.length}
      />

      <main className="px-4 pb-28 pt-2 max-w-2xl mx-auto w-full space-y-6">
        {state.activeTab === 'saidas' && (
          <SaidasTab
            alunos={state.alunos} activeExits={state.activeExits} config={state.config}
            suspensions={state.suspensions} avisos={state.avisos} turmasExistentes={state.turmasExistentes}
            userRole={state.authState.role} username={state.authState.username}
            activeBlock={state.activeBlock} getTodayExitsCount={state.getTodayExitsCount}
            notify={state.notify} refreshData={state.refreshData}
          />
        )}
        {state.activeTab === 'ocorrencias' && (
          <OcorrenciasTab alunos={state.alunos} turmasExistentes={state.turmasExistentes}
            userRole={state.authState.role} username={state.authState.username}
            notify={state.notify} refreshData={state.refreshData} />
        )}
        {state.activeTab === 'historico' && (
          <HistoricoTab records={state.records} turmasExistentes={state.turmasExistentes}
            userRole={state.authState.role} notify={state.notify} refreshData={state.refreshData} />
        )}
        {state.activeTab === 'atrasos' && (
          <AtrasosTab alunos={state.alunos} turmasExistentes={state.turmasExistentes}
            username={state.authState.username} notify={state.notify} refreshData={state.refreshData} />
        )}
        {state.activeTab === 'coord' && (
          <CoordTab coordinationQueue={state.coordinationQueue} suspensions={state.suspensions}
            userRole={state.authState.role} username={state.authState.username}
            notify={state.notify} refreshData={state.refreshData} />
        )}
        {state.activeTab === 'medidas' && (
          <BibliotecaTab libraryQueue={state.libraryQueue} username={state.authState.username}
            notify={state.notify} refreshData={state.refreshData} />
        )}
        {state.activeTab === 'pesquisa' && (
          <PesquisaTab alunos={state.alunos} records={state.records} turmasExistentes={state.turmasExistentes} />
        )}
        {state.activeTab === 'acompanhamento' && (
          <AnaliseTab records={state.records} turmasExistentes={state.turmasExistentes} statsSummary={state.statsSummary} />
        )}
        {state.activeTab === 'admin' && (
          <AdminTab alunos={state.alunos} config={state.config} turmasExistentes={state.turmasExistentes}
            notify={state.notify} refreshData={state.refreshData} />
        )}
      </main>
    </div>
  );
};

export default Index;
