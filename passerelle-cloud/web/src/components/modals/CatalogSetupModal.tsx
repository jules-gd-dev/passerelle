import { useTranslation } from 'react-i18next';
import { IconClose } from '../../Icons';
import type { CatalogItem, SetupField } from '../../catalog';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface CatalogSetupModalProps {
  item: CatalogItem;
  formValues: Record<string, string | number>;
  onFormChange: (key: string, val: string | number) => void;
  onInstall: () => void;
  onClose: () => void;
}

export function CatalogSetupModal({
  item,
  formValues,
  onFormChange,
  onInstall,
  onClose,
}: CatalogSetupModalProps) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap(onClose);

  return (
    <div
      className="modal-overlay"
      // biome-ignore lint/a11y/useSemanticElements: ARIA dialog pattern; native <dialog> would require restructuring modal CSS.
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('catalog.install', { name: item.name })}
    >
      <div className="modal-content">
        <div className="modal-header-bar">
          <div className="modal-title">
            {item.icon && (
              <img
                src={item.icon}
                alt=""
                className="service-avatar"
                style={{ width: 28, height: 28 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <h3>{t('catalog.install', { name: item.name })}</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <p className="modal-subtitle" style={{ marginBottom: '1.25rem' }}>
          {t('catalog.setup_hint')}
        </p>

        {(item.setupFields || []).map((field: SetupField) => (
          <div key={field.key} className="form-group">
            <label htmlFor={`setup-${field.key}`}>{t(field.labelKey)}</label>
            <input
              id={`setup-${field.key}`}
              className="input-field"
              type={field.type}
              value={formValues[field.key] ?? field.default}
              onChange={(e) =>
                onFormChange(
                  field.key,
                  field.type === 'number'
                    ? Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          </div>
        ))}

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-primary" onClick={onInstall}>
            {t('catalog.install_pc')}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
