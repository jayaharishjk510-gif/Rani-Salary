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
            backgroundColor: isDanger ? 'rgba(255, 77, 77, 0.12)' : 'rgba(61, 133, 198, 0.12)'
          }}>
            {isDanger ? (
              <AlertTriangle size={22} color="#ff4d4d" />
            ) : (
              <HelpCircle size={22} color="#3d85c6" />
            )}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#fff', fontWeight: '600' }}>
              {title}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#888', lineHeight: '1.4' }}>
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
              backgroundColor: isDanger ? '#ff4d4d' : '#3d85c6',
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
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000
};

const modalStyle = {
  backgroundColor: '#121212',
  border: '1px solid #282828',
  borderRadius: '12px',
  padding: '24px',
  width: '420px',
  maxWidth: '90%',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
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
  backgroundColor: '#222',
  color: '#bbb',
  border: '1px solid #333',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: '0.2s'
};

const confirmBtnStyle = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: '0.2s'
};

export default ConfirmModal;
