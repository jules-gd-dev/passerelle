import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose, IconRefresh, IconTerminal } from './Icons';

export interface LogsViewerProps {
  machineId: string;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
}

export function LogsViewer({
  machineId,
  serviceId,
  serviceName,
  onClose,
}: LogsViewerProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // H4: token resolved by the gateway from its httpOnly cookie.
      // The previous direct-tunnelUrl fallback is removed: it required the
      // token client-side and ran cross-origin (cookie not sent anyway).
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(machineId)}&path=${encodeURIComponent(`/api/services/${encodeURIComponent(serviceId)}/logs`)}`;
      const res = await fetch(proxyUrl, { credentials: 'same-origin' });

      if (res.ok) {
        const data: string[] = await res.json();
        setLogs(data);
      } else {
        setError(t('logs.error_load'));
      }
    } catch (_e) {
      setError(t('logs.network_error'));
    } finally {
      setLoading(false);
    }
  }, [machineId, serviceId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="modal-overlay">
      <div className="modal-content logs-modal">
        <div className="logs-header">
          <div className="logs-title">
            <IconTerminal className="icon-svg" />
            <h3>{t('logs.title', { name: serviceName })}</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <div className="logs-terminal-body">
          {loading && logs.length === 0 ? (
            <p className="logs-status">{t('logs.loading')}</p>
          ) : error ? (
            <p className="logs-error">{error}</p>
          ) : logs.length === 0 ? (
            <p className="logs-status">{t('logs.empty')}</p>
          ) : (
            logs.map((line, idx) => (
              <div key={`${idx}-${line.slice(0, 15)}`} className="log-line">
                {line}
              </div>
            ))
          )}
        </div>

        <div className="logs-footer">
          <button
            type="button"
            className="btn-submit btn-with-icon"
            onClick={fetchLogs}
            disabled={loading}
            style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
          >
            <IconRefresh className={loading ? 'spin' : ''} />
            <span>{loading ? t('logs.refreshing') : t('logs.refresh')}</span>
          </button>
          <button type="button" className="btn-reject" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
