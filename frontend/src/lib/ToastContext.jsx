import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { fmtDate, todayISO } from './data.js';

const ToastContext = createContext(null);

export function ToastProvider({ children, onNavigate }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, { date = todayISO(), sub } = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, date, sub });
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  };

  const goToProgress = () => {
    dismiss();
    onNavigate && onNavigate('progress');
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="toast-backdrop" onClick={dismiss}>
          <div className="toast-card" onClick={(e) => e.stopPropagation()}>
            <div className="toast-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12l5 5 11-11" />
              </svg>
            </div>
            <div className="toast-title">Thank You!</div>
            <div className="toast-body">
              {toast.message} — saved for <strong>{fmtDate(toast.date)}</strong>{toast.sub ? `. ${toast.sub}` : '.'}
            </div>
            <div className="toast-actions">
              <button className="btn secondary" onClick={dismiss} style={{ flex: 1 }}>Keep Going</button>
              <button className="btn" onClick={goToProgress} style={{ flex: 1 }}>Track in Progress</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
