import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import { SUPPORTED_LANGS } from './types';
import { useSessions } from './hooks/useSessions';
import { useServiceManager } from './hooks/useServiceManager';
import { useServiceModals } from './hooks/useServiceModals';
import { useSystemStats } from './useSystemStats';
import { useVersionAlert } from './useVersionAlert';
import { VersionAlert } from './components/views/VersionAlert';
import { HeaderNav } from './components/layout/HeaderNav';
import { MachineSelector } from './components/layout/MachineSelector';
import { DashboardView } from './components/views/DashboardView';
import { StoreView } from './components/views/StoreView';
import { AddMachineView } from './components/views/AddMachineView';
import { PerformanceMonitor } from './PerformanceMonitor';
import { LogsViewer } from './LogsViewer';
import { CatalogSetupModal } from './components/modals/CatalogSetupModal';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { CreateCustomModal } from './components/modals/CreateCustomModal';
import { EditServiceModal } from './components/modals/EditServiceModal';
import { Toaster } from './components/toast';

export default function App() {
  const { t } = useTranslation();
  const [appPage, setAppPage] = useState<'dashboard' | 'store' | 'performance'>('dashboard');
  const [storeSearch, setStoreSearch] = useState('');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const code = SUPPORTED_LANGS.find((l) => i18n.language?.startsWith(l)) ?? 'fr';
      document.documentElement.lang = code;
    }
  }, [i18n.language]);

  const {
    sessions, activeTabMachineId, setActiveTabMachineId, showAddMachineView, setShowAddMachineView,
    machinesList, selectedMachineId, setSelectedMachineId, manualMachineId, setManualMachineId,
    pin, setPin, loading, error, fetchMachines, handleConnect, handleDisconnectMachine
  } = useSessions();

  const hasSessions = Object.keys(sessions).length > 0;
  const currentSession = activeTabMachineId ? sessions[activeTabMachineId] : null;

  const {
    machineServices, serviceLoadingMap, serviceErrorMap, serviceActionId,
    pendingDeleteService, setPendingDeleteService, fetchServicesForSession,
    handleStartService, handleStopService, confirmDeleteService
  } = useServiceManager(activeTabMachineId, sessions, fetchMachines);

  const {
    selectedCatalogItem, setSelectedCatalogItem, setupFormValues, setSetupFormValues,
    showCustomAppModal, setShowCustomAppModal, customAppForm, setCustomAppForm,
    editingService, setEditingService, editForm, setEditForm,
    apiAccessService, setApiAccessService, generatedApiToken, isGeneratingToken,
    viewLogsService, setViewLogsService, handleOpenCatalogItem, handleInstallFromCatalog,
    handleCreateCustomApp, handleOpenEditModal, handleSaveEditService, handleOpenApiSettings, handleGenerateApiToken, handleRevokeApiTokens
  } = useServiceModals(currentSession, fetchServicesForSession);

  const perfStats = useSystemStats(currentSession);
  const versionAlert = useVersionAlert(currentSession);
  const currentServices = currentSession ? (machineServices[currentSession.machineId] || []) : [];
  const availableMachines = machinesList.filter((m) => !sessions[m.id]);

  return (
    <div className="app-wrapper">
      <HeaderNav hasSessions={hasSessions} showAddMachineView={showAddMachineView} currentSession={currentSession} hasServiceError={!!(currentSession && serviceErrorMap[currentSession.machineId])} appPage={appPage} setAppPage={setAppPage} connectedCount={Object.keys(sessions).length} onAddMachine={() => setShowAddMachineView(true)} />

      <div className="page">
        {hasSessions && !showAddMachineView ? (
          <>
            <VersionAlert alert={versionAlert} />
            {appPage === 'dashboard' && currentSession && (
              <section>
                <MachineSelector sessions={sessions} activeTabMachineId={activeTabMachineId} setActiveTabMachineId={setActiveTabMachineId} onDisconnectMachine={handleDisconnectMachine} onShowAddMachine={() => setShowAddMachineView(true)} currentSession={currentSession} serviceError={currentSession ? (serviceErrorMap[currentSession.machineId] || undefined) : undefined} serviceLoading={currentSession ? serviceLoadingMap[currentSession.machineId] : undefined} onRetryFetch={fetchServicesForSession}>
                  <DashboardView currentSession={currentSession} services={currentServices} isLoading={!!serviceLoadingMap[currentSession.machineId]} serviceActionId={serviceActionId} onStart={(id) => handleStartService(currentSession, id)} onStop={(id) => handleStopService(currentSession, id)} onViewLogs={setViewLogsService} onEdit={handleOpenEditModal} onSettings={handleOpenApiSettings} onDelete={(id, name) => setPendingDeleteService({ serviceId: id, serviceName: name })} />
                </MachineSelector>
              </section>
            )}
            {appPage === 'store' && (
              <section>
                <StoreView search={storeSearch} onSearchChange={setStoreSearch} onSelectCatalogItem={handleOpenCatalogItem} onOpenCustomAppModal={() => setShowCustomAppModal(true)} />
              </section>
            )}
            {appPage === 'performance' && (
              <section>
                <MachineSelector sessions={sessions} activeTabMachineId={activeTabMachineId} setActiveTabMachineId={setActiveTabMachineId} onDisconnectMachine={handleDisconnectMachine} onShowAddMachine={() => setShowAddMachineView(true)} currentSession={currentSession} serviceError={currentSession ? (serviceErrorMap[currentSession.machineId] || undefined) : undefined} serviceLoading={currentSession ? serviceLoadingMap[currentSession.machineId] : undefined} onRetryFetch={fetchServicesForSession}>
                  <PerformanceMonitor stats={perfStats} />
                </MachineSelector>
              </section>
            )}
          </>
        ) : (
          <AddMachineView hasSessions={hasSessions} availableMachines={availableMachines} selectedMachineId={selectedMachineId} setSelectedMachineId={setSelectedMachineId} manualMachineId={manualMachineId} setManualMachineId={setManualMachineId} pin={pin} setPin={setPin} loading={loading} error={error || ''} onSubmit={handleConnect} onCancel={() => setShowAddMachineView(false)} />
        )}
        <footer className="app-footer">
          <span className="footer-credit">
            © {new Date().getFullYear()}, {t('common.credit_by')}{' '}
            <a href="https://www.julesgd.dev" target="_blank" rel="noopener noreferrer">www.julesgd.dev</a>
          </span>
        </footer>
      </div>

      {selectedCatalogItem && (<CatalogSetupModal item={selectedCatalogItem} formValues={setupFormValues} onFormChange={(k, v) => setSetupFormValues((p) => ({ ...p, [k]: v }))} onInstall={handleInstallFromCatalog} onClose={() => setSelectedCatalogItem(null)} />)}
      {showCustomAppModal && (<CreateCustomModal form={customAppForm} onChange={setCustomAppForm} onSubmit={handleCreateCustomApp} onClose={() => setShowCustomAppModal(false)} />)}
      {editingService && (<EditServiceModal form={editForm} onChange={setEditForm} onSubmit={handleSaveEditService} onClose={() => setEditingService(null)} />)}
      {apiAccessService && currentSession && (<SettingsModal service={apiAccessService} currentSession={currentSession} generatedApiToken={generatedApiToken} isGeneratingToken={isGeneratingToken} onClose={() => setApiAccessService(null)} onGenerate={handleGenerateApiToken} onRevoke={handleRevokeApiTokens} />)}
      {pendingDeleteService && (<DeleteConfirmModal serviceName={pendingDeleteService.serviceName} onConfirm={confirmDeleteService} onCancel={() => setPendingDeleteService(null)} />)}
      {viewLogsService && currentSession && (<LogsViewer machineId={currentSession.machineId} serviceId={viewLogsService.id} serviceName={viewLogsService.name} onClose={() => setViewLogsService(null)} />)}
      <Toaster />
    </div>
  );
}
