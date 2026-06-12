import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// ── In-app toast system ───────────────────────────────────────────────────
// Used by the alert engine. Purely client-side: toasts appear while the app is
// open in this tab. No background/push delivery.

export type ToastTone = 'up' | 'down' | 'neutral';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastValue {
  push: (t: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const TONE: Record<ToastTone, { color: string; dot: string }> = {
  up: { color: '#4ADE80', dot: '#4ADE80' },
  down: { color: '#FF4D6D', dot: '#FF4D6D' },
  neutral: { color: '#FFC857', dot: '#FFC857' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current;
    setToasts((ts) => [...ts, { ...t, id }].slice(-4));
    window.setTimeout(() => remove(id), 8000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[120] flex flex-col gap-2 w-[300px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          return (
            <div
              key={t.id}
              className="pointer-events-auto surface surface-lit p-3.5 flex items-start gap-3"
              style={{ background: '#0B1016' }}
            >
              <span className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ background: tone.dot, boxShadow: `0 0 8px ${tone.dot}` }} />
              <div className="min-w-0 flex-1">
                <div className="font-sora font-700 text-[13px]" style={{ color: tone.color }}>{t.title}</div>
                {t.body && <div className="text-[12px] text-txt2 mt-0.5 leading-snug">{t.body}</div>}
              </div>
              <button onClick={() => remove(t.id)} className="text-muted hover:text-txt text-[16px] leading-none shrink-0">×</button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
