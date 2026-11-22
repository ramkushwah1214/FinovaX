import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastType, durationMs?: number) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, message?: string, type: ToastType = 'info', durationMs = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = { id, type, title, message, durationMs };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep maximum 4 concurrent toasts

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback((title: string, message?: string) => showToast(title, message, 'success'), [showToast]);
  const showError = useCallback((title: string, message?: string) => showToast(title, message, 'error', 5500), [showToast]);
  const showWarning = useCallback((title: string, message?: string) => showToast(title, message, 'warning', 5000), [showToast]);
  const showInfo = useCallback((title: string, message?: string) => showToast(title, message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}

      {/* Floating Toast Container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 ${
                isSuccess
                  ? 'bg-slate-900/95 dark:bg-[#0B111E]/95 border-emerald-500/30 text-white'
                  : isError
                  ? 'bg-slate-900/95 dark:bg-[#0B111E]/95 border-rose-500/30 text-white'
                  : isWarning
                  ? 'bg-slate-900/95 dark:bg-[#0B111E]/95 border-amber-500/40 text-white'
                  : 'bg-slate-900/95 dark:bg-[#0B111E]/95 border-slate-700/50 text-white'
              }`}
              role="alert"
            >
              <div className="flex-shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {isWarning && <AlertCircle className="w-4 h-4 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="text-xs font-bold leading-tight tracking-tight">{toast.title}</div>
                {toast.message && (
                  <div className="text-[11px] text-slate-300 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {toast.message}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-md hover:bg-slate-800"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
