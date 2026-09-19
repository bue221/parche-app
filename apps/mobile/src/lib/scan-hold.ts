/** Same barcode must stay readable briefly so a stray frame does not lock a ticket. */
export const SCAN_HOLD_MS = 500;
/** After cancel / result, ignore the still-visible code so confirm does not reopen at once. */
export const SCAN_RESUME_MS = 900;

export function createScanHold(holdMs = SCAN_HOLD_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let candidate = '';

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    reset() {
      candidate = '';
      stop();
    },
    dispose() {
      candidate = '';
      stop();
    },
    observe(raw: string, onReady: (payload: string) => void): 'ignored' | 'holding' | 'restarted' {
      const payload = raw.trim();
      if (!payload) return 'ignored';
      if (payload === candidate) return 'holding';
      candidate = payload;
      stop();
      timer = setTimeout(() => {
        timer = null;
        const locked = candidate;
        candidate = '';
        onReady(locked);
      }, holdMs);
      return 'restarted';
    },
  };
}
