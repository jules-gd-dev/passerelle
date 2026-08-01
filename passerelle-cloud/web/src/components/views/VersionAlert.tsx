import { useTranslation } from 'react-i18next';
import { IconAlert, IconShield } from '../../icons/actions';
import type { VersionAlertState } from '../../useVersionAlert';

export function VersionAlert({ alert }: { alert: VersionAlertState | null }) {
  const { t } = useTranslation();
  if (!alert) return null;
  const required = alert.level === 'required';
  return (
    <div className={`callout ${required ? 'callout-danger' : 'callout-accent'}`}>
      {required ? (
        <IconAlert width={16} height={16} />
      ) : (
        <IconShield width={16} height={16} />
      )}
      <div>
        <div className="callout-title">
          {required
            ? t('version.required_title')
            : t('version.recommended_title')}
        </div>
        <p>
          {required
            ? t('version.required_desc', {
                daemon: alert.daemon,
                required: alert.minRequired,
              })
            : t('version.recommended_desc', {
                daemon: alert.daemon,
                recommended: alert.minRecommended,
              })}
        </p>
        <p className="version-hint">{t('version.update_hint')}</p>
      </div>
    </div>
  );
}
