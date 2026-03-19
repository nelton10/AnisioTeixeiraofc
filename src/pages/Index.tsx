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
import AlunosTab from '@/components/tabs/AlunosTab';
import AnaliseAulaTab from '@/components/tabs/AnaliseAulaTab';
import ParentDashboardTab from '@/components/tabs/ParentDashboardTab';
import FrequenciaTab from '@/components/tabs/FrequenciaTab';

const Index = () => {
  const state = useAppState();

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-black text-foreground tracking-tight">Carregando Sistema...</h2>
        <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">Sincronizando com a Nuvem</p>
      </div>
    );
  }

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
        {state.authState.role === 'parent' && state.authState.linkedStudentName ? (
          <ParentDashboardTab
            studentName={state.authState.linkedStudentName}
            records={state.records}
            libraryQueue={state.libraryQueue}
            avisos={state.avisos}
            alunosList={state.alunos}
            refreshData={state.refreshData}
          />
        ) : (
          <>
            {state.activeTab === 'saidas' && (
              <SaidasTab
                alunos={state.alunos} activeExits={state.activeExits} saidasQueue={state.saidasQueue}
                addToSaidasQueue={state.addToSaidasQueue} removeFromSaidasQueue={state.removeFromSaidasQueue}
                config={state.config}
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
              <HistoricoTab 
                records={state.records} 
                libraryQueue={state.libraryQueue} 
                turmasExistentes={state.turmasExistentes}
                userRole={state.authState.role} 
                notify={state.notify} 
                refreshData={state.refreshData} 
                refreshHistory={state.refreshHistory}
                verTodoPeriodo={state.verTodoPeriodo}
                setVerTodoPeriodo={state.setVerTodoPeriodo}
                filtroDataInicio={state.filtroDataInicio}
                setFiltroDataInicio={state.setFiltroDataInicio}
                filtroDataFim={state.filtroDataFim}
                setFiltroDataFim={state.setFiltroDataFim}
              />
            )}
            {state.activeTab === 'atrasos' && (
              <AtrasosTab alunos={state.alunos} turmasExistentes={state.turmasExistentes}
                username={state.authState.username} notify={state.notify} refreshData={state.refreshData} />
            )}
            {state.activeTab === 'coord' && (
              <CoordTab coordinationQueue={state.coordinationQueue} suspensions={state.suspensions}
                avisos={state.avisos} records={state.records} alunos={state.alunos}
                userRole={state.authState.role} username={state.authState.username}
                notify={state.notify} refreshData={state.refreshData} />
            )}
            {state.activeTab === 'medidas' && (
              <BibliotecaTab libraryQueue={state.libraryQueue} username={state.authState.username}
                notify={state.notify} refreshData={state.refreshData} />
            )}
            {state.activeTab === 'pesquisa' && (
              <PesquisaTab 
                alunos={state.alunos} 
                records={state.records} 
                turmasExistentes={state.turmasExistentes} 
                refreshHistory={state.refreshHistory}
                verTodoPeriodo={state.verTodoPeriodo}
                setVerTodoPeriodo={state.setVerTodoPeriodo}
                filtroDataInicio={state.filtroDataInicio}
                setFiltroDataInicio={state.setFiltroDataInicio}
                filtroDataFim={state.filtroDataFim}
                setFiltroDataFim={state.setFiltroDataFim}
              />
            )}
            {state.activeTab === 'frequencia' && (
              <FrequenciaTab 
                alunos={state.alunos} 
                records={state.records} 
                turmasExistentes={state.turmasExistentes}
                username={state.authState.username}
                userRole={state.authState.role}
                notify={state.notify}
                refreshData={state.refreshData}
                refreshHistory={state.refreshHistory}
              />
            )}
            {state.activeTab === 'avaliar_aula' && (
              <AnaliseAulaTab records={state.records} turmasExistentes={state.turmasExistentes}
                username={state.authState.username} userRole={state.authState.role}
                notify={state.notify} refreshData={state.refreshData} />
            )}
            {state.activeTab === 'acompanhamento' && (
              <AnaliseTab 
                records={state.records} 
                turmasExistentes={state.turmasExistentes} 
                statsSummary={state.statsSummary}
                verTodoPeriodo={state.verTodoPeriodo}
                setVerTodoPeriodo={state.setVerTodoPeriodo}
                filtroDataInicio={state.filtroDataInicio}
                setFiltroDataInicio={state.setFiltroDataInicio}
                filtroDataFim={state.filtroDataFim}
                setFiltroDataFim={state.setFiltroDataFim}
              />
            )}
            {state.activeTab === 'alunos' && (
              <AlunosTab alunos={state.alunos} turmasExistentes={state.turmasExistentes}
                records={state.records} libraryQueue={state.libraryQueue} userRole={state.authState.role}
                notify={state.notify} refreshData={state.refreshData} />
            )}
            {state.activeTab === 'admin' && (
              <AdminTab alunos={state.alunos} history={state.records} config={state.config}
                saveConfig={state.saveConfig} notify={state.notify} refreshData={state.refreshData} />
            )}
          </>
        )}

      </main>
    </div>
  );
};

export default Index;
