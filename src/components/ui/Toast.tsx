import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ type, title, message }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all bg-surface",
              t.type === 'success' && "border-emerald-500/20",
              t.type === 'error' && "border-red-500/20",
              t.type === 'info' && "border-blue-500/20"
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
            {t.type === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
            {t.type === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />}
            
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-medium text-foreground">{t.title}</h3>
              {t.message && (
                <p className="mt-1 text-xs text-muted leading-relaxed truncate">{t.message}</p>
              )}
            </div>
            
            <button
              onClick={() => removeToast(t.id)}
              className="inline-flex shrink-0 rounded-md p-1 text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
