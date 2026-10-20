import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt({ collapsed = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const saved = localStorage.getItem('pwa_prompt_dismissed_at');
      if (saved) {
        const diffDays = (Date.now() - parseInt(saved, 10)) / (1000 * 60 * 60 * 24);
        return diffDays < 7; // Suppress for 7 days if dismissed
      }
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Check if user is on iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios') && !ua.includes('fxios');
    if (isIOSDevice && isSafari) {
      setIsIOS(true);
    }

    // Capture beforeinstallprompt for Chromium browsers (Chrome, Edge, Android Chrome, Samsung Internet)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      window.__pwaInstallPrompt = e; // Expose globally for sidebar button
      window.dispatchEvent(new CustomEvent('pwaCanInstall', { detail: e }));
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = null;
      console.log('[PWA] Rani Salary was installed successfully.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the installation prompt');
        setIsInstallable(false);
      } else {
        console.log('[PWA] User dismissed the installation prompt');
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowModal(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
    } catch (e) {}
  };

  // If already installed or neither standard installable nor iOS, render nothing
  if (isStandalone || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Card (Shown if not dismissed) */}
      {!dismissed && (
        <div
          role="region"
          aria-label="Install Rani Salary App"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '18px 20px',
            maxWidth: '360px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            animation: 'pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '18px',
                  boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)'
                }}
              >
                R
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                  Install Rani Salary
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                  Install for quick desktop or mobile app access and offline work.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button
              onClick={handleInstallClick}
              style={{
                flex: 1,
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
            >
              <Download size={15} /> Install App
            </button>
            <button
              onClick={handleDismiss}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px 28px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Smartphone size={22} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                  Install on iOS
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px' }}>
              Follow these simple steps in Safari to add Rani Salary to your home screen:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px' }}>
                <div style={{ background: '#e2e8f0', borderRadius: '8px', padding: '6px', display: 'flex' }}>
                  <Share2 size={18} color="#0f172a" />
                </div>
                <div style={{ fontSize: '13px', color: '#334155' }}>
                  1. Tap the <strong>Share</strong> button in Safari's bottom toolbar.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px' }}>
                <div style={{ background: '#e2e8f0', borderRadius: '8px', padding: '6px', display: 'flex' }}>
                  <PlusSquare size={18} color="#0f172a" />
                </div>
                <div style={{ fontSize: '13px', color: '#334155' }}>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                marginTop: '20px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for custom UI (such as sidebar button)
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(Boolean(isStandaloneMode));

    if (window.__pwaInstallPrompt) {
      setCanInstall(true);
    }

    const handleCanInstall = () => setCanInstall(true);
    const handleInstalled = () => {
      setIsStandalone(true);
      setCanInstall(false);
    };

    window.addEventListener('pwaCanInstall', handleCanInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('pwaCanInstall', handleCanInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (window.__pwaInstallPrompt) {
      window.__pwaInstallPrompt.prompt();
      const choice = await window.__pwaInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
      }
    }
  };

  return { canInstall: canInstall && !isStandalone, isStandalone, triggerInstall };
}
