import React from 'react';
import { ShieldAlert, LogOut, Mail, Lock, RefreshCw } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import logoRani from '../logo_rani.png';

function AccessDenied({ email }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      background: 'radial-gradient(circle at 50% 25%, #ffffff 0%, #f1f5f9 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.08), 0 10px 15px -6px rgba(0, 0, 0, 0.04)',
        padding: '44px 36px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        {logoRani && (
          <img
            src={logoRani}
            alt="Rani Logo"
            style={{ width: '170px', height: 'auto', marginBottom: '28px' }}
          />
        )}

        {/* Status Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#b45309',
          padding: '4px 12px',
          borderRadius: '50px',
          fontSize: '12px',
          fontWeight: '700',
          marginBottom: '20px'
        }}>
          <Lock size={13} color="#b45309" />
          <span>Restricted Portal Access</span>
        </div>

        {/* Warning Icon Container */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fffbeb',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 0 8px #fef3c7'
        }}>
          <ShieldAlert size={32} strokeWidth={2.2} />
        </div>

        <h1 style={{
          margin: '0 0 10px',
          fontSize: '22px',
          fontWeight: '800',
          color: '#0f172a',
          letterSpacing: '-0.3px'
        }}>
          Permissions Required
        </h1>

        <div style={{
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          color: '#334155',
          fontSize: '13px',
          fontWeight: '600',
          padding: '8px 14px',
          borderRadius: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '18px'
        }}>
          <Mail size={14} color="#64748b" />
          <span>{email || 'Authenticated User'}</span>
        </div>

        <p style={{
          margin: '0 0 28px',
          fontSize: '14px',
          lineHeight: '1.65',
          color: '#64748b'
        }}>
          Your login was authenticated successfully, but this account has not been assigned department permissions yet. Please contact the administrator to grant access for your store branch.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => signOut(auth)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '13px 20px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.15)'
            }}
          >
            <LogOut size={16} />
            Sign In with Different Account
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '11px 20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            Check Permissions Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;
