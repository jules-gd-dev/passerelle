import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ServiceItem, SessionData } from '../types';
import { usePolling } from './usePolling';
import { toast } from '../components/toast';

export function useServiceManager(activeTabMachineId: string | null, sessions: Record<string, SessionData>, fetchMachines: () => Promise<void>) {
  const { t } = useTranslation();
  const [machineServices, setMachineServices] = useState<Record<string, ServiceItem[]>>({});
  const [serviceLoadingMap, setServiceLoadingMap] = useState<Record<string, boolean>>({});
  const [serviceErrorMap, setServiceErrorMap] = useState<Record<string, string | null>>({});
  const [serviceActionId, setServiceActionId] = useState<string | null>(null);
  const [pendingDeleteService, setPendingDeleteService] = useState<{ serviceId: string; serviceName: string } | null>(null);

  const fetchServicesForSession = useCallback(async (sess: SessionData) => {
    const mId = sess.machineId;
    setServiceLoadingMap((prev) => ({ ...prev, [mId]: true }));
    try {
      // H4: the session token is resolved by the gateway from its httpOnly
      // cookie (credentials: same-origin). No token in the URL or JS memory.
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(mId)}&path=${encodeURIComponent('/api/services')}`;
      const res = await fetch(proxyUrl, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setMachineServices((prev) => ({ ...prev, [mId]: data }));
        setServiceErrorMap((prev) => ({ ...prev, [mId]: null }));
      } else if (res.status === 401) {
        setServiceErrorMap((prev) => ({ ...prev, [mId]: t('errors.session_expired') }));
      } else {
        setServiceErrorMap((prev) => ({ ...prev, [mId]: t('errors.fetch_services') }));
      }
    } catch (_err) {
      setServiceErrorMap((prev) => ({ ...prev, [mId]: t('errors.machine_offline') }));
    } finally {
      setServiceLoadingMap((prev) => ({ ...prev, [mId]: false }));
    }
  }, [t]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // Polling: pause while the tab is hidden, refresh immediately on focus.
  usePolling(() => {
    fetchMachines();
    if (activeTabMachineId && sessions[activeTabMachineId]) fetchServicesForSession(sessions[activeTabMachineId]);
  }, 4000);

  useEffect(() => {
    if (activeTabMachineId && sessions[activeTabMachineId]) fetchServicesForSession(sessions[activeTabMachineId]);
  }, [activeTabMachineId, sessions, fetchServicesForSession]);

  const handleStartService = async (sess: SessionData, serviceId: string) => {
    setServiceActionId(serviceId);
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(sess.machineId)}&path=${encodeURIComponent('/api/start')}`;
      const res = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: serviceId }) });
      if (res.ok) await fetchServicesForSession(sess); else toast(t('errors.start_service'));
    } catch (_err) { toast(t('errors.contact_start')); } finally { setServiceActionId(null); }
  };

  const handleStopService = async (sess: SessionData, serviceId: string) => {
    setServiceActionId(serviceId);
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(sess.machineId)}&path=${encodeURIComponent('/api/stop')}`;
      const res = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: serviceId }) });
      if (res.ok) await fetchServicesForSession(sess); else toast(t('errors.stop_service'));
    } catch (_err) { toast(t('errors.contact_stop')); } finally { setServiceActionId(null); }
  };

  const confirmDeleteService = async () => {
    if (!pendingDeleteService || !activeTabMachineId) return;
    const sess = sessions[activeTabMachineId];
    if (!sess) return;
    const { serviceId } = pendingDeleteService;
    setPendingDeleteService(null); setServiceActionId(serviceId);
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(sess.machineId)}&path=${encodeURIComponent(`/api/services/${serviceId}`)}`;
      const res = await fetch(proxyUrl, { method: 'DELETE', credentials: 'same-origin' });
      if (res.ok) await fetchServicesForSession(sess); else toast(t('errors.delete_service'));
    } catch (_err) { toast(t('errors.contact_delete')); } finally { setServiceActionId(null); }
  };

  return {
    machineServices, setMachineServices, serviceLoadingMap, serviceErrorMap, setServiceErrorMap,
    serviceActionId, pendingDeleteService, setPendingDeleteService,
    fetchServicesForSession, handleStartService, handleStopService, confirmDeleteService
  };
}
