import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={toastContainerStyle}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...toastItemStyle,
              borderLeft: `4px solid ${
                toast.type === 'success'
                  ? '#4caf50'
                  : toast.type === 'error'
                  ? '#ff4d4d'
                  : toast.type === 'warning'
                  ? '#ff9800'
                  : '#3d85c6'
              }`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              {toast.type === 'success' && <CheckCircle2 size={18} color="#4caf50" />}
              {toast.type === 'error' && <AlertCircle size={18} color="#ff4d4d" />}
              {toast.type === 'warning' && <AlertCircle size={18} color="#ff9800" />}
              {toast.type === 'info' && <Info size={18} color="#3d85c6" />}
              <span style={{ fontSize: '13px', color: '#fff', fontWeight: '500' }}>
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={closeBtnStyle}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const toastContainerStyle = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  maxWidth: '380px',
  width: '100%',
  pointerEvents: 'none'
};

const toastItemStyle = {
  pointerEvents: 'auto',
  backgroundColor: '#161616',
  color: '#fff',
  padding: '12px 16px',
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
  border: '1px solid #2a2a2a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  animation: 'slideIn 0.25s ease-out'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px'
};
