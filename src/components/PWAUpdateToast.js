import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export default function PWAUpdateToast() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const handleUpdate = (event) => {
      const reg = event.detail;
      if (reg && reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowToast(true);
      }
    };

    window.addEventListener('swUpdateAvailable', handleUpdate);

    // Also check if there's already a waiting worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowToast(true);
        }
      });
    }

    return () => {
      window.removeEventListener('swUpdateAvailable', handleUpdate);
    };
  }, []);

  const handleUpdateClick = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    // When the new worker takes control, refresh page to load newest code
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
    // Fallback reload in case controllerchange already fired or doesn't trigger
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  if (!showToast) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '16px 20px',
        maxWidth: '380px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        animation: 'pwaToastSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Sparkles size={20} color="#2563eb" />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
          Update Available
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', marginBottom: '12px' }}>
          A new version of Rani Salary is ready to use. Update to get the latest features.
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleUpdateClick}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={13} /> Update Now
          </button>
          <button
            onClick={() => setShowToast(false)}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Later
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowToast(false)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px'
        }}
        title="Dismiss"
      >
        <X size={16} />
      </button>

      <style>{`
        @keyframes pwaToastSlide {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
