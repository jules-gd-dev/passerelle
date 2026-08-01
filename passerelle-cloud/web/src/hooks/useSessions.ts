import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { type MachineItem, type SessionData } from '../types';

export function useSessions() {
  const { t } = useTranslation();
  const [machinesList, setMachinesList] = useState<MachineItem[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [manualMachineId, setManualMachineId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, SessionData>>({});
  const [activeTabMachineId, setActiveTabMachineId] = useState<string | null>(null);
  const [showAddMachineView, setShowAddMachineView] = useState(false);

  // H4: sessions are reconstructed from the gateway's httpOnly cookie via
  // GET /api/sessions (token never leaves the server). No localStorage, no
  // client-side cookie holding the token.
  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions', { credentials: 'same-origin' });
      if (!res.ok) return;
      const list: { machineId: string; tunnelUrl: string }[] = await res.json();
      const map: Record<string, SessionData> = {};
      for (const item of list) map[item.machineId] = { machineId: item.machineId, tunnelUrl: item.tunnelUrl };
      setSessions(map);
      setActiveTabMachineId((prev) => {
        if (prev && map[prev]) return prev;
        const keys = Object.keys(map);
        return keys.length > 0 ? keys[0] : null;
      });
    } catch {
      /* ignore */
    }
  }, []);

  const fetchMachines = useCallback(async () => {
    try {
      const res = await fetch('/api/machines');
      if (!res.ok) return;
      const data: MachineItem[] = await res.json();
      setMachinesList(data);
      if (data.length > 0 && !selectedMachineId) setSelectedMachineId(data[0].id);
      // H1: /api/machines no longer exposes tunnelUrl; sessions keep the
      // tunnelUrl obtained at PIN-validation time, so there is nothing to sync.
    } catch (_err) {
      /* ignore */
    }
  }, [selectedMachineId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get('machine');
    const pParam = params.get('pin');
    if (mParam) { setSelectedMachineId(mParam); setManualMachineId(mParam); }
    if (pParam) setPin(pParam);

    // Auto-login via connect URL (?machine=..&pin=..). refreshSessions() runs
    // AFTER validate-pin resolves (never concurrently): a GET /api/sessions
    // started before the gateway set the cookie would race it and clobber the
    // fresh session with an empty list, leaving the user on the login page even
    // though the cookie exists (a reload then "magically" connected).
    if (mParam && pParam) {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch('/api/validate-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ machineId: mParam, pin: pParam }),
          });
          const data = await res.json();
          // H4: validate-pin now stores the token in the httpOnly cookie and
          // returns only { success, tunnelUrl }.
          if (!cancelled && data.success && data.tunnelUrl) {
            setSessions((prev) => ({ ...prev, [mParam]: { machineId: mParam, tunnelUrl: data.tunnelUrl } }));
            setActiveTabMachineId(mParam); setShowAddMachineView(false); setPin('');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch {
          /* ignore */
        }
        // Reconcile from the cookie whatever the outcome: after a successful
        // login the cookie is set; on a stale/rotated-PIN failure the browser
        // may still hold a valid session cookie worth restoring.
        if (!cancelled) await refreshSessions();
      })();
      return () => { cancelled = true; };
    }
    refreshSessions();
  }, [refreshSessions]);

  const handleConnect = async (e: FormEvent) => {
    e.preventDefault();
    const targetId = selectedMachineId === 'manual' || machinesList.filter(m => !sessions[m.id]).length === 0 ? manualMachineId : selectedMachineId;
    if (!targetId || !pin) { setError(t('errors.select_machine_pin')); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/validate-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ machineId: targetId, pin }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions((prev) => ({ ...prev, [targetId]: { machineId: targetId, tunnelUrl: data.tunnelUrl } }));
        setActiveTabMachineId(targetId); setShowAddMachineView(false); setPin('');
      } else {
        const codeKey = data.code ? `errors.${data.code}` : '';
        setError(codeKey && i18n.exists(codeKey) ? (i18n.t(codeKey) as string) : (data.message || t('errors.invalid_pin')));
      }
    } catch (_err) { setError(t('errors.connect_server')); } finally { setLoading(false); }
  };

  const handleDisconnectMachine = async (mId: string) => {
    await fetch(`/api/session/${encodeURIComponent(mId)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    setSessions((prev) => {
      const updated = { ...prev }; delete updated[mId];
      if (activeTabMachineId === mId) { const remain = Object.keys(updated); setActiveTabMachineId(remain.length > 0 ? remain[0] : null); }
      return updated;
    });
  };

  const handleDisconnectAll = async () => {
    await fetch('/api/sessions', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    setSessions({});
    setActiveTabMachineId(null);
  };

  return {
    sessions, activeTabMachineId, setActiveTabMachineId, showAddMachineView, setShowAddMachineView,
    machinesList, selectedMachineId, setSelectedMachineId, manualMachineId, setManualMachineId,
    pin, setPin, loading, error, fetchMachines, refreshSessions, handleConnect, handleDisconnectMachine, handleDisconnectAll
  };
}
