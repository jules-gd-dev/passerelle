import { type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLaptop, IconCheck, IconEdit } from '../../Icons';
import type { MachineItem } from '../../types';

interface AddMachineViewProps {
  hasSessions: boolean;
  availableMachines: MachineItem[];
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
  manualMachineId: string;
  setManualMachineId: (val: string) => void;
  pin: string;
  setPin: (val: string) => void;
  loading: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export function AddMachineView({ hasSessions, availableMachines, selectedMachineId, setSelectedMachineId, manualMachineId, setManualMachineId, pin, setPin, loading, error, onSubmit, onCancel }: AddMachineViewProps) {
  const { t } = useTranslation();

  return (
    <section className="login-section">
      <h2 className="login-title">{hasSessions ? t('login.add_machine') : t('login.link_device')}</h2>
      <p className="login-hint">{t('login.hint')}</p>

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="machineId">{t('login.select_pc')}</label>
          {availableMachines.length > 0 && (
            <div className="machines-list">
              {availableMachines.map((m) => (
                <button type="button" key={m.id} className={`machine-item ${selectedMachineId === m.id ? 'selected' : ''}`} onClick={() => setSelectedMachineId(m.id)}>
                  <span className="machine-selector-info"><IconLaptop width={18} height={18} /><span className="machine-item-name">PC {m.id.slice(0, 8)}…</span></span>
                  {selectedMachineId === m.id && <IconCheck width={14} height={14} />}
                </button>
              ))}
              <button type="button" className={`machine-item ${selectedMachineId === 'manual' ? 'selected' : ''}`} onClick={() => setSelectedMachineId('manual')}>
                <span className="machine-selector-info"><IconEdit width={18} height={18} /><span className="machine-item-name">{t('login.manual_id')}</span></span>
                {selectedMachineId === 'manual' && <IconCheck width={14} height={14} />}
              </button>
            </div>
          )}
          {(availableMachines.length === 0 || selectedMachineId === 'manual') && (
            <input id="machineId" className="input-field" type="text" placeholder={t('login.uuid_ph')} value={manualMachineId} onChange={(e) => setManualMachineId(e.target.value)} required={selectedMachineId === 'manual' || availableMachines.length === 0} />
          )}
        </div>

        <div className="form-group">
          <label htmlFor="pin">{t('login.security_code')}</label>
          <input id="pin" className="input-field pin-input" type="text" placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 6))} maxLength={6} autoComplete="off" required />
        </div>

        <div className="modal-actions" style={{ marginTop: '2rem' }}>
          {hasSessions && <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>}
          <button type="submit" className="btn-primary" disabled={loading || pin.length < 6 || (!selectedMachineId && !manualMachineId)}>
            {loading ? t('login.connecting') : t('login.connect_btn')}
          </button>
        </div>

        {error && <div className="status-alert">{error}</div>}

        <div className="login-footer">{t('login.or')}<br />{t('login.qr_scan')}<br />{t('login.qr_scan_2')}</div>
      </form>
    </section>
  );
}
