import { useTranslation } from 'react-i18next';
import { IconClose, IconLaptop } from '../../Icons';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface DisconnectConfirmModalProps {
  machineLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DisconnectConfirmModal({
  machineLabel,
  onConfirm,
  onCancel,
}: DisconnectConfirmModalProps) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap(onCancel);

  return (
    <div
      className="modal-overlay"
      // biome-ignore lint/a11y/useSemanticElements: ARIA dialog pattern; native <dialog> would require restructuring modal CSS.
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('machine.disconnect_title')}
    >
      <div className="modal-content" style={{ maxWidth: 380 }}>
        <div className="modal-header-bar">
          <div className="modal-title">
            <IconLaptop width={15} height={15} />
            <h3>{t('machine.disconnect_title')}</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onCancel}>
            <IconClose />
          </button>
        </div>
        <p className="modal-text" style={{ marginTop: '0.5rem' }}>
          {t('machine.confirm_disconnect', { name: machineLabel })}
        </p>
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {t('machine.disconnect_confirm')}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
