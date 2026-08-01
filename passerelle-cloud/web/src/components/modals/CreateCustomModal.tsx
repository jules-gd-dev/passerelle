import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose, IconSparkles } from '../../Icons';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface CustomAppFormState {
  name: string;
  icon: string;
  type: 'cli' | 'docker' | 'network';
  command: string;
  args: string;
  port: string;
  ip: string;
}

interface CreateCustomModalProps {
  form: CustomAppFormState;
  onChange: (updater: (prev: CustomAppFormState) => CustomAppFormState) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function CreateCustomModal({
  form,
  onChange,
  onSubmit,
  onClose,
}: CreateCustomModalProps) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap(onClose);

  return (
    <div
      className="modal-overlay"
      // biome-ignore lint/a11y/useSemanticElements: ARIA dialog pattern; native <dialog> would require restructuring modal CSS.
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('custom.title')}
    >
      <div className="modal-content">
        <div className="logs-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconSparkles className="icon-svg" />
            <h3>{t('custom.title')}</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="customName">{t('custom.name')}</label>
            <input
              id="customName"
              className="input-field"
              type="text"
              placeholder={t('custom.name_ph')}
              value={form.name}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="customIcon">{t('custom.icon')}</label>
            <input
              id="customIcon"
              className="input-field"
              type="text"
              placeholder="https://.../logo.png"
              value={form.icon}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, icon: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="customType">{t('custom.type')}</label>
            <select
              id="customType"
              className="input-field"
              value={form.type}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  type: e.target.value as 'cli' | 'docker' | 'network',
                }))
              }
            >
              <option value="cli">{t('custom.type_cli')}</option>
              <option value="docker">{t('custom.type_docker')}</option>
              <option value="network">{t('custom.type_network')}</option>
            </select>
          </div>

          {form.type === 'network' ? (
            <>
              <div className="form-group">
                <label htmlFor="customIp">{t('custom.ip')}</label>
                <input
                  id="customIp"
                  className="input-field"
                  type="text"
                  placeholder="192.168.1.50"
                  value={form.ip}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, ip: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="customPort">{t('custom.port')}</label>
                <input
                  id="customPort"
                  className="input-field"
                  type="number"
                  placeholder="8123"
                  value={form.port}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, port: e.target.value }))
                  }
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="customPort">{t('custom.local_port')}</label>
                <input
                  id="customPort"
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
                <label htmlFor="customCmd">{t('custom.command')}</label>
                <input
                  id="customCmd"
                  className="input-field"
                  type="text"
                  placeholder="opencode / kilo"
                  value={form.command}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, command: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="customArgs">{t('custom.args')}</label>
                <input
                  id="customArgs"
                  className="input-field"
                  type="text"
                  placeholder="serve --port 4000"
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
              {t('custom.create')}
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
