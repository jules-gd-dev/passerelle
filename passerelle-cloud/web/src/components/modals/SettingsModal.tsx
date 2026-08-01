import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconActivity, IconClose, IconExternalLink, IconLoader, IconLock, IconSettings, IconShield } from '../../Icons';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { ServiceItem, SessionData } from '../../types';

interface SettingsModalProps {
  service: ServiceItem;
  currentSession: SessionData;
  isGeneratingToken: boolean;
  generatedApiToken: string | null;
  onClose: () => void;
  onGenerate: () => void;
  onRevoke: () => void;
}

type UsageTab = 'token' | 'curl' | 'url';

export function SettingsModal({ service, currentSession, isGeneratingToken, generatedApiToken, onClose, onGenerate, onRevoke }: SettingsModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<UsageTab>('token');
  const [copied, setCopied] = useState(false);

  const baseUrl = `${window.location.origin}/link/${currentSession.machineId}/${service.id}`;

  const copy = () => {
    if (!generatedApiToken) return;
    const text = tab === 'token'
      ? generatedApiToken
      : tab === 'curl'
        ? `curl "${baseUrl}" -H "X-Passerelle-Token: ${generatedApiToken}"`
        : `${baseUrl}?passerelle_token=${generatedApiToken}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trapRef = useFocusTrap(onClose);

  return (
    <div
      className="modal-overlay"
      // biome-ignore lint/a11y/useSemanticElements: ARIA dialog pattern; native <dialog> would require restructuring modal CSS.
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.title')}
    >
      <div className="modal-content wide">
        <div className="modal-header-bar">
          <div>
            <div className="modal-title"><IconSettings width={16} height={16} /><h3>{t('settings.title')}</h3></div>
            <div className="modal-subtitle">{service.name}</div>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}><IconClose /></button>
        </div>

        <div className="modal-body">
          <div className="modal-title" style={{ marginBottom: '0.75rem' }}><IconActivity width={16} height={16} /><h4>{t('settings.api_access')}</h4></div>
          <p className="modal-text">{t('settings.api_desc')}</p>

          {isGeneratingToken ? (
            <div className="loading-text"><IconLoader width={16} height={16} className="spin" /><span>{t('settings.generating')}</span></div>
          ) : generatedApiToken ? (
            <div style={{ marginTop: '1.5rem' }}>
              <div className="code-tabs" role="tablist" aria-label={t('settings.api_access')}>
                <button type="button" role="tab" aria-selected={tab === 'token'} className={`code-tab ${tab === 'token' ? 'active' : ''}`} onClick={() => setTab('token')}>{t('settings.tab_token')}</button>
                <button type="button" role="tab" aria-selected={tab === 'curl'} className={`code-tab ${tab === 'curl' ? 'active' : ''}`} onClick={() => setTab('curl')}>{t('settings.tab_curl')}</button>
                <button type="button" role="tab" aria-selected={tab === 'url'} className={`code-tab ${tab === 'url' ? 'active' : ''}`} onClick={() => setTab('url')}>{t('settings.tab_url')}</button>
              </div>

              <div className="code-display">
                <div className="code-display-header">
                  <span className="code-display-label">{tab === 'token' ? t('settings.tab_token') : tab === 'curl' ? t('settings.tab_curl') : t('settings.tab_url')}</span>
                  <button type="button" className={`code-display-copy ${copied ? 'copied' : ''}`} onClick={copy}>
                    <IconExternalLink width={13} height={13} />
                    {copied ? t('settings.copied') : t('settings.copy')}
                  </button>
                </div>
                <div className="code-display-body">
                  <code>
                    {tab === 'token' && <span className="code-token">{generatedApiToken}</span>}
                    {tab === 'curl' && <>curl &quot;{baseUrl}&quot; -H &quot;X-Passerelle-Token: <span className="code-token">{generatedApiToken}</span>&quot;</>}
                    {tab === 'url' && <>{baseUrl}?passerelle_token=<span className="code-token">{generatedApiToken}</span></>}
                  </code>
                </div>
              </div>

              {service.ports && service.ports.length > 0 && (
                <div className="callout callout-info"><IconActivity width={16} height={16} />
                  <div><div className="callout-title">{t('settings.multi_ports_active')}</div><p>{t('settings.multi_ports_desc', { port: service.ports[0] })}</p></div>
                </div>
              )}

              <div className="callout callout-accent"><IconShield width={16} height={16} />
                <div><div className="callout-title">{t('settings.prefer_header')}</div><p>{t('settings.prefer_header_desc')}</p></div>
              </div>

              <div className="callout callout-danger"><IconLock width={16} height={16} />
                <div>
                  <div className="callout-title">{t('settings.critical_title')}</div>
                  <p>{t('settings.critical_desc')}</p>
                  <div style={{ marginTop: '0.75rem' }}><button type="button" className="btn-danger" onClick={onRevoke}>{t('settings.revoke_tokens')}</button></div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '1.5rem' }}>
              <p className="modal-desc">{t('settings.no_token')}</p>
              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={onGenerate}><IconActivity width={14} height={14} />{t('settings.generate_token')}</button>
                <button type="button" className="btn-danger" onClick={onRevoke}>{t('settings.revoke_tokens')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
