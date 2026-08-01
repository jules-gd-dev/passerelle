import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose, IconEdit } from '../../Icons';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface EditFormState {
  name: string;
  type: 'cli' | 'docker' | 'network';
  icon: string;
  command: string;
  args: string;
  port: string;
  ports: string;
  target: string;
}

interface EditServiceModalProps {
  form: EditFormState;
  onChange: (updater: (prev: EditFormState) => EditFormState) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function EditServiceModal({
  form,
  onChange,
  onSubmit,
  onClose,
}: EditServiceModalProps) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap(onClose);

  return (
    <div
      className="modal-overlay"
      // biome-ignore lint/a11y/useSemanticElements: ARIA dialog pattern; native <dialog> would require restructuring modal CSS.
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('service.edit_title')}
    >
      <div className="modal-content">
        <div className="logs-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconEdit className="icon-svg" />
            <h3>{t('service.edit_title')}</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="editName">{t('edit.name')}</label>
            <input
              id="editName"
              className="input-field"
              type="text"
              value={form.name}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="editIcon">{t('edit.icon')}</label>
            <input
              id="editIcon"
              className="input-field"
              type="text"
              value={form.icon}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, icon: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="editType">{t('edit.type')}</label>
            <select
              id="editType"
              className="input-field"
              value={form.type}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  type: e.target.value as 'cli' | 'docker' | 'network',
                }))
              }
            >
              <option value="cli">{t('edit.type_cli')}</option>
              <option value="docker">{t('edit.type_docker')}</option>
              <option value="network">{t('edit.type_network')}</option>
            </select>
          </div>

          {form.type === 'network' ? (
            <div className="form-group">
              <label htmlFor="editTarget">{t('edit.target')}</label>
              <input
                id="editTarget"
                className="input-field"
                type="text"
                placeholder="http://192.168.1.50:8123"
                value={form.target}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, target: e.target.value }))
                }
                required
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="editPort">{t('edit.port')}</label>
                <input
                  id="editPort"
                  className="input-field"
                  type="number"
                  placeholder="4000"
                  value={form.port}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, port: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editPorts">{t('edit.secondary_ports')}</label>
                <input
                  id="editPorts"
                  className="input-field"
                  type="text"
                  placeholder="8080, 8443"
                  value={form.ports}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, ports: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="editCmd">{t('edit.command')}</label>
                <input
                  id="editCmd"
                  className="input-field"
                  type="text"
                  value={form.command}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, command: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="editArgs">{t('edit.args')}</label>
                <input
                  id="editArgs"
                  className="input-field"
                  type="text"
                  value={form.args}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, args: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
            <button type="submit" className="btn-approve">
              {t('common.save')}
            </button>
            <button type="button" className="btn-reject" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
