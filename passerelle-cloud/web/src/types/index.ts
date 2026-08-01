export interface ServiceItem {
  id: string;
  name: string;
  type: 'cli' | 'docker' | 'network';
  icon?: string;
  command?: string;
  args?: string[];
  port?: number;
  ports?: number[]; // Multi-ports
  target?: string;
  status: 'running' | 'stopped';
}

export interface MachineItem {
  id: string;
  online?: boolean;
  tunnelUrl?: string; // no longer returned by the public /api/machines list (H1)
  lastSeen: number;
}

export interface SessionData {
  machineId: string;
  tunnelUrl: string;
}

// H4: the session token is no longer kept client-side. It lives only in the
// gateway's httpOnly cookie, so a PWA XSS cannot exfiltrate it. The PWA keeps
// just enough state ({ machineId, tunnelUrl }) to render the UI.

export function replacePlaceholder(text: string, key: string, value: string): string {
  return text.split(`{{${key}}}`).join(value);
}

export const SUPPORTED_LANGS = ['fr', 'en', 'zh'] as const;
export const LANG_OPTIONS: { code: string; flag: string; name: string }[] = [
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
];
