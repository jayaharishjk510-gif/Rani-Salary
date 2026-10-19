import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import logoRani from '../logo_rani.png';

function AccessDenied({ email }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      background: 'radial-gradient(circle at 50% 30%, #ffffff 0%, #f1f5f9 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        padding: '40px 32px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        {logoRani && (
          <img
            src={logoRani}
            alt="Rani Logo"
            style={{ width: '180px', height: 'auto', marginBottom: '24px' }}
          />
        )}

        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fffbeb',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 0 8px #fef3c7'
        }}>
          <ShieldAlert size={32} strokeWidth={2.2} />
        </div>

        <h1 style={{
          margin: '0 0 8px',
          fontSize: '20px',
          fontWeight: '800',
          color: '#0f172a'
        }}>
          Access Restricted
        </h1>

        <div style={{
          backgroundColor: '#f1f5f9',
          color: '#334155',
          fontSize: '13px',
          fontWeight: '600',
          padding: '6px 12px',
          borderRadius: '6px',
          display: 'inline-block',
          marginBottom: '16px'
        }}>
          {email || 'Unknown Account'}
        </div>

        <p style={{
          margin: '0 0 28px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#64748b'
        }}>
          Your account is authenticated, but no department permissions have been assigned to this email address. Please contact the system administrator to grant you access.
        </p>

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
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default AccessDenied;
