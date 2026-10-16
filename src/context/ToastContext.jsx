import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => addToast('success', msg, dur),
    error: (msg, dur) => addToast('error', msg, dur),
    warning: (msg, dur) => addToast('warning', msg, dur),
    info: (msg, dur) => addToast('info', msg, dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Overlay Container */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '380px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          const icon = isSuccess ? (
            <CheckCircle2 size={16} color="#34D399" />
          ) : isError ? (
            <AlertCircle size={16} color="#F87171" />
          ) : isWarning ? (
            <AlertTriangle size={16} color="#FBBF24" />
          ) : (
            <Info size={16} color="#60A5FA" />
          );

          const borderColor = isSuccess
            ? 'rgba(16, 185, 129, 0.4)'
            : isError
            ? 'rgba(239, 68, 68, 0.4)'
            : isWarning
            ? 'rgba(245, 158, 11, 0.4)'
            : 'rgba(59, 130, 246, 0.4)';

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: `1px solid ${borderColor}`,
                boxShadow: 'var(--dialog-shadow)',
                color: 'var(--text-main)',
                fontSize: '13px',
                animation: 'fadeIn 200ms ease',
              }}
            >
              {icon}
              <span style={{ flex: 1, lineHeight: '1.4' }}>{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  padding: '2px',
                }}
                aria-label="Dismiss toast"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
