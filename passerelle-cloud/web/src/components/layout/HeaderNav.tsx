import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconActivity, IconCheck, IconLaptop, IconPackage, IconPlus } from '../../Icons';
import i18n from '../../i18n';
import { LANG_OPTIONS, SUPPORTED_LANGS, type SessionData } from '../../types';

interface HeaderNavProps {
  hasSessions: boolean;
  showAddMachineView: boolean;
  currentSession: SessionData | null;
  hasServiceError: boolean;
  appPage: 'dashboard' | 'store' | 'performance';
  setAppPage: (page: 'dashboard' | 'store' | 'performance') => void;
  connectedCount: number;
  onAddMachine: () => void;
}

export function HeaderNav({ hasSessions, showAddMachineView, currentSession, hasServiceError, appPage, setAppPage, connectedCount, onAddMachine }: HeaderNavProps) {
  const { t, i18n: i18nInst } = useTranslation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const currentLangCode = SUPPORTED_LANGS.includes(i18nInst.language as (typeof SUPPORTED_LANGS)[number]) ? i18nInst.language : 'fr';
  const showNav = hasSessions && !showAddMachineView && currentSession && !hasServiceError;

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <svg className="brand-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          <h1 className="brand-title">{t('brand.title')}</h1>
          <div className="lang-switch-wrapper">
            <button type="button" className="btn-lang-switch" aria-haspopup="listbox" aria-expanded={langMenuOpen} onClick={() => setLangMenuOpen((v) => !v)}>
              {LANG_OPTIONS.find((o) => o.code === currentLangCode)?.flag}
            </button>
            {langMenuOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setLangMenuOpen(false)} />
                <div className="lang-dropdown-menu">
                  {LANG_OPTIONS.map((opt) => (
                    <button type="button" key={opt.code} className={`lang-dropdown-item ${opt.code === currentLangCode ? 'active' : ''}`} onClick={() => { i18n.changeLanguage(opt.code); setLangMenuOpen(false); }}>
                      <span>{opt.flag}</span>
                      <span>{opt.name}</span>
                      {opt.code === currentLangCode && <IconCheck width={14} height={14} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {showNav && (
          <nav className="desktop-nav">
            <button type="button" className={`desktop-nav-item ${appPage === 'dashboard' ? 'active' : ''}`} onClick={() => setAppPage('dashboard')}>
              <IconLaptop width={16} height={16} /><span>{t('nav.services')}</span>
            </button>
            <button type="button" className={`desktop-nav-item ${appPage === 'store' ? 'active' : ''}`} onClick={() => setAppPage('store')}>
              <IconPackage width={16} height={16} /><span>{t('nav.store')}</span>
            </button>
            <button type="button" className={`desktop-nav-item ${appPage === 'performance' ? 'active' : ''}`} onClick={() => setAppPage('performance')}>
              <IconActivity width={16} height={16} /><span>{t('nav.performance')}</span>
            </button>
          </nav>
        )}

        <div className="connection-indicator">
          <span className={`status-dot ${hasSessions ? 'online' : ''}`} />
          <span className="mono">{hasSessions ? t('status.machines', { count: connectedCount }) : t('status.offline')}</span>
          <button type="button" className="btn-add-machine" title={t('header.add_machine_title')} onClick={onAddMachine}>
            <IconPlus width={14} height={14} />
          </button>
        </div>
      </header>

      {showNav && (
        <nav className="bottom-nav">
          <button type="button" className={`nav-item ${appPage === 'dashboard' ? 'active' : ''}`} onClick={() => setAppPage('dashboard')}>
            <IconLaptop width={18} height={18} /><span>{t('nav.services')}</span>
          </button>
          <button type="button" className={`nav-item ${appPage === 'store' ? 'active' : ''}`} onClick={() => setAppPage('store')}>
            <IconPackage width={18} height={18} /><span>{t('nav.store')}</span>
          </button>
          <button type="button" className={`nav-item ${appPage === 'performance' ? 'active' : ''}`} onClick={() => setAppPage('performance')}>
            <IconActivity width={18} height={18} /><span>{t('nav.performance')}</span>
          </button>
        </nav>
      )}
    </>
  );
}
