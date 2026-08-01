import { useEffect, useRef } from 'react';

// Adaptive polling: runs `fn` every `intervalMs` but PAUSES while the tab/page
// is hidden (saves battery + bandwidth on a mobile PWA), and runs `fn` once
// immediately after the tab becomes visible again so the UI refreshes without
// waiting for the next tick. No-op when `enabled` is false.
export function usePolling(fn: () => void, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => fnRef.current();
    const start = () => {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        tick();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
