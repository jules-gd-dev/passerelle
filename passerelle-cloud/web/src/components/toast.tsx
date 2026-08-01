import { useEffect, useState } from 'react';

export type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (items: ToastItem[]) => void;

// Module-level store so any hook/component can fire a toast without prop drilling.
let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  for (const l of listeners) l(items);
}

export function toast(message: string, type: ToastType = 'error') {
  const item: ToastItem = { id: nextId++, message, type };
  items = [...items, item];
  emit();
  setTimeout(() => dismiss(item.id), 4500);
  return item.id;
}

export function dismiss(id: number) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  const [state, setState] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}

const TINTS: Record<ToastType, string> = {
  error: 'var(--danger)',
  success: 'var(--accent)',
  info: 'var(--light)',
};

const ICONS: Record<ToastType, string> = {
  error: '✕',
  success: '✓',
  info: 'ℹ',
};

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <section className="toaster" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === 'error' ? 'alert' : 'status'}
          tabIndex={0}
          onClick={() => dismiss(t.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              dismiss(t.id);
            }
          }}
          className={`toast-item ${t.type}`}
        >
          <span className="toast-icon" style={{ color: TINTS[t.type] }} aria-hidden="true">
            {ICONS[t.type]}
          </span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </section>
  );
}
