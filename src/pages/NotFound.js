import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

function NotFound() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.02)',
        padding: '40px 32px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 0 8px #f8fafc'
        }}>
          <FileQuestion size={32} strokeWidth={2} />
        </div>

        <div style={{
          fontSize: '12px',
          fontWeight: '800',
          letterSpacing: '1px',
          color: '#16a34a',
          textTransform: 'uppercase',
          marginBottom: '6px'
        }}>
          Error 404
        </div>

        <h1 style={{
          margin: '0 0 10px',
          fontSize: '22px',
          fontWeight: '800',
          color: '#0f172a'
        }}>
          Page Not Found
        </h1>

        <p style={{
          margin: '0 0 24px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#64748b'
        }}>
          The page or section you requested doesn't exist, has been moved, or the link may be outdated.
        </p>

        <NavLink
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '10px',
            padding: '12px 22px',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background 0.2s',
            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.15)'
          }}
        >
          <Home size={16} />
          Return to Dashboard
        </NavLink>
      </div>
    </div>
  );
}

export default NotFound;
