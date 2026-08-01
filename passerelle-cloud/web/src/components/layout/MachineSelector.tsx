import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconAlert, IconChevronDown, IconClose, IconLaptop, IconLoader, IconPlus } from '../../Icons';
import { DisconnectConfirmModal } from '../modals/DisconnectConfirmModal';
import type { SessionData } from '../../types';

interface MachineSelectorProps {
  sessions: Record<string, SessionData>;
  activeTabMachineId: string | null;
  setActiveTabMachineId: (id: string) => void;
  onDisconnectMachine: (mId: string) => void;
  onShowAddMachine: () => void;
  currentSession: SessionData | null;
  serviceError: string | undefined;
  serviceLoading: boolean | undefined;
  onRetryFetch: (session: SessionData) => void;
  children: React.ReactNode;
}

export function MachineSelector({ sessions, activeTabMachineId, setActiveTabMachineId, onDisconnectMachine, onShowAddMachine, currentSession, serviceError, serviceLoading, onRetryFetch, children }: MachineSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null);

  const machineLabel = (mId: string) => `PC ${mId.slice(0, 8)}…`;
  const confirmDisconnect = () => {
    if (!pendingDisconnect) return;
    const mId = pendingDisconnect;
    setPendingDisconnect(null);
    onDisconnectMachine(mId);
    if (activeTabMachineId === mId) setIsOpen(false);
  };

  return (
    <>
      <div className="machine-selector-wrapper">
        <button type="button" className={`machine-selector-btn ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)} aria-haspopup="listbox" aria-expanded={isOpen} aria-label={t('machine.select')}>
          <span className="machine-selector-info">
            <IconLaptop width={18} height={18} />
            <span>{activeTabMachineId ? `PC ${activeTabMachineId.slice(0, 8)}…` : t('machine.select')}</span>
          </span>
          <span className="machine-selector-right">
            <span className="status-dot online" />
            <IconChevronDown width={14} height={14} />
          </span>
        </button>

        {isOpen && (
          <>
            <div className="dropdown-overlay" onClick={() => setIsOpen(false)} />
            <div className="machine-dropdown-menu">
              <div className="dropdown-header">{t('machine.connected_list')}</div>
              {Object.keys(sessions).map((mId) => (
                <div key={mId} className={`dropdown-item ${activeTabMachineId === mId ? 'active' : ''}`} onClick={() => { setActiveTabMachineId(mId); setIsOpen(false); }}>
                  <span className="machine-selector-info"><IconLaptop width={16} height={16} /> {machineLabel(mId)}</span>
                  <button type="button" className="btn-icon-close" onClick={(e) => { e.stopPropagation(); setPendingDisconnect(mId); }}>
                    <IconClose width={14} height={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="dropdown-item" onClick={() => { setIsOpen(false); onShowAddMachine(); }}>
                <span className="machine-selector-info"><IconPlus width={16} height={16} /> {t('machine.add')}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {currentSession && (
        <div className="machine-session-view">
          {serviceError ? (
            <div className="error-box">
              <div className="error-box-head">
                <IconAlert width={16} height={16} />
                <span className="error-box-title">{t('machine.offline_title')}</span>
              </div>
              <p>{serviceError}</p>
              <div className="error-box-actions">
                <button type="button" className="btn-primary" onClick={() => onRetryFetch(currentSession)} disabled={serviceLoading}>
                  {serviceLoading ? (<><IconLoader width={14} height={14} /><span>{t('common.loading')}</span></>) : t('machine.retry_now')}
                </button>
                <button type="button" className="btn-link" onClick={() => setPendingDisconnect(currentSession.machineId)}>{t('machine.disconnect')}</button>
              </div>
            </div>
          ) : children}
        </div>
      )}

      {pendingDisconnect && (
        <DisconnectConfirmModal
          machineLabel={machineLabel(pendingDisconnect)}
          onConfirm={confirmDisconnect}
          onCancel={() => setPendingDisconnect(null)}
        />
      )}
    </>
  );
}
