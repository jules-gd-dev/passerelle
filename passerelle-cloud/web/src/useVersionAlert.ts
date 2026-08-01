import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionData } from './types';
import { usePolling } from './hooks/usePolling';
import { compareVersions } from './utils/versions';

export interface VersionAlertState {
  level: 'required' | 'recommended';
  daemon: string;
  minRequired: string;
  minRecommended?: string;
}

// Fetches the gateway version policy (/api/version-info, public) and the
// connected daemon's version (proxied /version, needs the session) then emits
// a warning when the daemon is outdated. Re-polled so the warning clears once
// the daemon is upgraded. Silent on any network/auth failure.
export function useVersionAlert(sess: SessionData | null, intervalMs = 120000) {
  const [alert, setAlert] = useState<VersionAlertState | null>(null);
  const sessRef = useRef(sess);
  sessRef.current = sess;

  const check = useCallback(async () => {
    const activeSess = sessRef.current;
    if (!activeSess) return;
    try {
      const policyRes = await fetch('/api/version-info', {
        credentials: 'same-origin',
      });
      if (!policyRes.ok) return;
      const policy: {
        min_required?: string;
        min_recommended?: string;
      } = await policyRes.json();

      const proxyRes = await fetch(
        `/api/proxy?machineId=${encodeURIComponent(activeSess.machineId)}&path=${encodeURIComponent('/version')}`,
        { credentials: 'same-origin' },
      );
      if (!proxyRes.ok) return;
      const v = await proxyRes.json();
      const daemon: string | undefined = v?.version;
      if (!daemon) return;

      const minRequired = policy.min_required || '0.0.0';
      const minRecommended = policy.min_recommended || '';
      if (compareVersions(daemon, minRequired) < 0) {
        setAlert({
          level: 'required',
          daemon,
          minRequired,
          minRecommended: minRecommended || undefined,
        });
      } else if (minRecommended && compareVersions(daemon, minRecommended) < 0) {
        setAlert({
          level: 'recommended',
          daemon,
          minRequired,
          minRecommended,
        });
      } else {
        setAlert(null);
      }
    } catch (_e) {
      // silent: not authenticated or network unavailable
    }
  }, []);

  useEffect(() => {
    if (!sess) {
      setAlert(null);
      return;
    }
    void check();
  }, [sess, check]);

  usePolling(check, intervalMs, !!sess);

  return alert;
}
