import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CatalogItem } from '../catalog';
import type { CustomAppFormState } from '../components/modals/CreateCustomModal';
import type { EditFormState } from '../components/modals/EditServiceModal';
import { toast } from '../components/toast';
import type { ServiceItem, SessionData } from '../types';
import { replacePlaceholder } from '../types';

export function useServiceModals(
  currentSession: SessionData | null,
  fetchServices: (sess: SessionData) => Promise<void>,
) {
  const { t } = useTranslation();
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<CatalogItem | null>(null);
  const [setupFormValues, setSetupFormValues] = useState<
    Record<string, string | number>
  >({});

  const [showCustomAppModal, setShowCustomAppModal] = useState(false);
  const [customAppForm, setCustomAppForm] = useState<CustomAppFormState>({
    name: '',
    type: 'cli',
    icon: '',
    ip: '192.168.1.50',
    port: '4000',
    command: '',
    args: '',
  });

  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    type: 'cli',
    icon: '',
    port: '',
    ports: '',
    target: '',
    command: '',
    args: '',
  });

  const [apiAccessService, setApiAccessService] = useState<ServiceItem | null>(
    null,
  );
  const [generatedApiToken, setGeneratedApiToken] = useState<string | null>(
    null,
  );
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [viewLogsService, setViewLogsService] = useState<ServiceItem | null>(
    null,
  );

  const handleOpenCatalogItem = (item: CatalogItem) => {
    setSelectedCatalogItem(item);
    const init: Record<string, string | number> = {};
    if (item.setupFields)
      for (const f of item.setupFields) init[f.key] = f.default;
    setSetupFormValues(init);
  };

  const handleInstallFromCatalog = async () => {
    if (!selectedCatalogItem || !currentSession) return;
    let cmd = selectedCatalogItem.command || '';
    let tgt = selectedCatalogItem.target || '';
    const args = (selectedCatalogItem.args || []).map((arg) => {
      let res = arg;
      for (const [k, v] of Object.entries(setupFormValues))
        res = replacePlaceholder(res, k, String(v));
      return res;
    });
    for (const [k, v] of Object.entries(setupFormValues)) {
      tgt = replacePlaceholder(tgt, k, String(v));
      cmd = replacePlaceholder(cmd, k, String(v));
    }
    const pt = setupFormValues.port
      ? Number(setupFormValues.port)
      : selectedCatalogItem.port;
    try {
      // Route through the gateway relay (/api/proxy) so the request works without
      // first opening the service, and the session token stays in the gateway's
      // httpOnly cookie (credentials: same-origin).
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(currentSession.machineId)}&path=${encodeURIComponent('/api/services')}`;
      const res = await fetch(proxyUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedCatalogItem.name,
          type: selectedCatalogItem.type,
          icon: selectedCatalogItem.icon,
          command: cmd,
          args,
          port: pt,
          target: tgt,
        }),
      });
      if (res.ok) {
        await fetchServices(currentSession);
        setSelectedCatalogItem(null);
        toast(t('common.success'), 'success');
      } else toast(t('errors.add_catalog'));
    } catch (_e) {
      toast(t('errors.contact_install'));
    }
  };

  const handleCreateCustomApp = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentSession || !customAppForm.name) {
      if (!customAppForm.name) toast(t('errors.need_name'));
      return;
    }
    const payload: Record<string, unknown> = {
      name: customAppForm.name,
      type: customAppForm.type,
      icon: customAppForm.icon || undefined,
    };
    if (customAppForm.type === 'network')
      payload.target = `http://${customAppForm.ip}:${customAppForm.port}`;
    else {
      payload.port = Number(customAppForm.port || '4000');
      payload.command =
        customAppForm.command || customAppForm.name.toLowerCase();
      payload.args = customAppForm.args
        ? customAppForm.args.split(' ').filter(Boolean)
        : [];
    }
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(currentSession.machineId)}&path=${encodeURIComponent('/api/services')}`;
      const res = await fetch(proxyUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchServices(currentSession);
        setShowCustomAppModal(false);
        setCustomAppForm({
          name: '',
          type: 'cli',
          icon: '',
          ip: '192.168.1.50',
          port: '4000',
          command: '',
          args: '',
        });
        toast(t('common.success'), 'success');
      } else toast(t('errors.create_custom'));
    } catch (_e) {
      toast(t('errors.contact_create'));
    }
  };

  const handleOpenEditModal = (s: ServiceItem) => {
    setEditingService(s);
    setEditForm({
      name: s.name,
      type: s.type,
      icon: s.icon || '',
      port: s.port ? String(s.port) : '',
      ports: s.ports ? s.ports.join(', ') : '',
      target: s.target || '',
      command: s.command || '',
      args: s.args ? s.args.join(' ') : '',
    });
  };

  const handleSaveEditService = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingService || !currentSession) return;
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(currentSession.machineId)}&path=${encodeURIComponent(`/api/services/${editingService.id}`)}`;
      const res = await fetch(proxyUrl, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          icon: editForm.icon,
          port: editForm.port ? Number(editForm.port) : undefined,
          ports: editForm.ports
            ? editForm.ports
                .split(',')
                .map((x) => Number(x.trim()))
                .filter((n) => !Number.isNaN(n))
            : undefined,
          target: editForm.target,
          command: editForm.command,
          args: editForm.args ? editForm.args.split(' ').filter(Boolean) : [],
        }),
      });
      if (res.ok) {
        await fetchServices(currentSession);
        setEditingService(null);
        toast(t('common.success'), 'success');
      } else toast(t('errors.update_service'));
    } catch (_e) {
      toast(t('errors.contact_update'));
    }
  };

  const handleOpenApiSettings = (service: ServiceItem) => {
    setApiAccessService(service);
    setGeneratedApiToken(null);
    setIsGeneratingToken(false);
  };

  const handleGenerateApiToken = async () => {
    if (!currentSession) return;
    setIsGeneratingToken(true);
    setGeneratedApiToken(null);
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(currentSession.machineId)}&path=${encodeURIComponent('/api/token')}`;
      const res = await fetch(proxyUrl, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (res.ok && data.success) setGeneratedApiToken(data.token);
      else toast(t('errors.generate_token'));
    } catch (_e) {
      toast(t('errors.contact_daemon'));
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleRevokeApiTokens = async () => {
    if (!currentSession) return;
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(currentSession.machineId)}&path=${encodeURIComponent('/api/revoke-token')}`;
      const res = await fetch(proxyUrl, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        setGeneratedApiToken(null);
        toast(t('settings.tokens_revoked'), 'success');
      } else toast(t('errors.revoke_token'));
    } catch (_e) {
      toast(t('errors.contact_daemon'));
    }
  };

  return {
    selectedCatalogItem,
    setSelectedCatalogItem,
    setupFormValues,
    setSetupFormValues,
    showCustomAppModal,
    setShowCustomAppModal,
    customAppForm,
    setCustomAppForm,
    editingService,
    setEditingService,
    editForm,
    setEditForm,
    apiAccessService,
    setApiAccessService,
    generatedApiToken,
    isGeneratingToken,
    viewLogsService,
    setViewLogsService,
    handleOpenCatalogItem,
    handleInstallFromCatalog,
    handleCreateCustomApp,
    handleOpenEditModal,
    handleSaveEditService,
    handleOpenApiSettings,
    handleGenerateApiToken,
    handleRevokeApiTokens,
  };
}
