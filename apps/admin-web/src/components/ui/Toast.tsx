import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  message: string;
}

const ToastContext = createContext<{ push: (kind: Kind, message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((kind: Kind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => remove(id), kind === 'error' ? 6000 : 3500);
  }, []);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = { success: 'text-success', error: 'text-danger', info: 'text-info' };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="no-print fixed right-4 bottom-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div key={t.id} className="animate-slide-in flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop">
              <Icon className={cn('mt-0.5 size-5 shrink-0', colors[t.kind])} />
              <p className="flex-1 text-sm">{t.message}</p>
              <button onClick={() => remove(t.id)} aria-label="Đóng thông báo" className="cursor-pointer text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return {
    success: (m: string) => ctx.push('success', m),
    error: (m: string) => ctx.push('error', m),
    info: (m: string) => ctx.push('info', m),
  };
}
