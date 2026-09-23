import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action will proceed.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            ...iconCircleStyle,
            backgroundColor: isDanger ? '#fef2f2' : '#eff6ff'
          }}>
            {isDanger ? (
              <AlertTriangle size={22} color="#ef4444" />
            ) : (
              <HelpCircle size={22} color="#2563eb" />
            )}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a', fontWeight: '700' }}>
              {title}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={cancelBtnStyle}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...confirmBtnStyle,
              backgroundColor: isDanger ? '#ef4444' : '#2563eb',
              color: '#fff'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000
};

const modalStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '24px',
  width: '420px',
  maxWidth: '90%',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  animation: 'fadeIn 0.2s ease'
};

const iconCircleStyle = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const cancelBtnStyle = {
  padding: '10px 18px',
  backgroundColor: '#f8fafc',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: '0.2s'
};

const confirmBtnStyle = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: '0.2s',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
};

export default ConfirmModal;
