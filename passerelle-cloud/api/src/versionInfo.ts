// Version policy announced by this gateway to every connected daemon / PWA.
// Configured via env vars so an admin can bump them without a redeploy.

export interface VersionInfo {
  min_recommended: string;
  min_required: string;
  custom_startup_announcement: string;
}

export function getVersionInfo(): VersionInfo {
  return {
    min_recommended: process.env.VERSION_MIN_RECOMMENDED || '0.0.0',
    min_required: process.env.VERSION_MIN_REQUIRED || '0.0.0',
    custom_startup_announcement: process.env.VERSION_STARTUP_ANNOUNCEMENT || '',
  };
}
