import { useTranslation } from 'react-i18next';
import { IconLoader, IconServer, IconPlus, IconExternalLink, IconClose, IconTerminal, IconEdit, IconSettings, IconTrash } from '../../Icons';
import type { ServiceItem, SessionData } from '../../types';

interface ServiceCardProps {
  service: ServiceItem;
  currentSession: SessionData;
  isBusy: boolean;
  onStart: (serviceId: string) => void;
  onStop: (serviceId: string) => void;
  onViewLogs: (service: ServiceItem) => void;
  onEdit: (service: ServiceItem) => void;
  onSettings: (service: ServiceItem) => void;
  onDelete: (serviceId: string, name: string) => void;
}

export function ServiceCard({ service, currentSession, isBusy, onStart, onStop, onViewLogs, onEdit, onSettings, onDelete }: ServiceCardProps) {
  const { t } = useTranslation();
  const isRunning = service.status === 'running';
  const isNetwork = service.type === 'network';
  const openUrl = `/api/open/${encodeURIComponent(currentSession.machineId)}/${encodeURIComponent(service.id)}`;

  return (
    <div className="service-card">
      <div className="service-card-row">
        <div className="service-identity">
          <div className="service-avatar">
            {service.icon ? <img src={service.icon} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : isNetwork ? <IconServer width={18} height={18} /> : service.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="service-name">{service.name}</div>
            <div className="service-target">{isNetwork ? service.target : t('service.port', { port: service.port })}</div>
          </div>
        </div>
        <span className={`badge ${service.status}`}>{isNetwork ? t('service.network') : isRunning ? t('service.running') : t('service.stopped')}</span>
      </div>

      <div className="service-actions">
        {!isRunning && !isNetwork ? (
          <button type="button" className="btn-primary" onClick={() => onStart(service.id)} disabled={isBusy}>
            {isBusy ? <IconLoader width={14} height={14} className="spin" /> : <IconPlus width={14} height={14} />}
            <span>{isBusy ? t('service.starting') : t('service.start')}</span>
          </button>
        ) : (
          <>
            <a href={openUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <span>{t('service.open')}</span><IconExternalLink width={13} height={13} />
            </a>
            {!isNetwork && (
              <button type="button" className="btn-secondary" onClick={() => onStop(service.id)} disabled={isBusy}>
                {isBusy ? <IconLoader width={13} height={13} className="spin" /> : <IconClose width={13} height={13} />}
                <span>{isBusy ? t('service.stop_action') : t('service.stop')}</span>
              </button>
            )}
          </>
        )}
        <button type="button" className="btn-icon" title={t('service.logs_title')} onClick={() => onViewLogs(service)}><IconTerminal width={14} height={14} /></button>
        <button type="button" className="btn-icon" title={t('service.edit_title')} onClick={() => onEdit(service)}><IconEdit width={14} height={14} /></button>
        <button type="button" className="btn-icon" title={t('service.settings_title')} onClick={() => onSettings(service)}><IconSettings width={14} height={14} /></button>
        <button type="button" className="btn-icon" title={t('service.delete_title')} disabled={isBusy} onClick={() => onDelete(service.id, service.name)}>
          {isBusy ? <IconLoader width={14} height={14} className="spin" /> : <IconTrash width={14} height={14} />}
        </button>
      </div>
    </div>
  );
}

interface DashboardViewProps {
  currentSession: SessionData;
  services: ServiceItem[] | undefined;
  isLoading: boolean;
  serviceActionId: string | null;
  onStart: (serviceId: string) => void;
  onStop: (serviceId: string) => void;
  onViewLogs: (service: ServiceItem) => void;
  onEdit: (service: ServiceItem) => void;
  onSettings: (service: ServiceItem) => void;
  onDelete: (serviceId: string, name: string) => void;
}

export function DashboardView({ currentSession, services, isLoading, serviceActionId, onStart, onStop, onViewLogs, onEdit, onSettings, onDelete }: DashboardViewProps) {
  const { t } = useTranslation();

  if (isLoading && services === undefined) {
    return <div className="loading-text"><IconLoader width={18} height={18} className="spin" /><span>{t('machine.loading_services', { id: currentSession.machineId.slice(0, 8) })}</span></div>;
  }

  const safeServices = services || [];

  if (safeServices.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
        {t('services.empty')}
      </div>
    );
  }

  return (
    <div className="unified-list">
      {safeServices.map((service) => (
        <ServiceCard key={service.id} service={service} currentSession={currentSession} isBusy={serviceActionId === service.id} onStart={onStart} onStop={onStop} onViewLogs={onViewLogs} onEdit={onEdit} onSettings={onSettings} onDelete={onDelete} />
      ))}
    </div>
  );
}
