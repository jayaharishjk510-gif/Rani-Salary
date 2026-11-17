import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

function NotFound() {
  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        padding: '44px 36px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        {/* Status Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1d4ed8',
          padding: '4px 12px',
          borderRadius: '50px',
          fontSize: '12px',
          fontWeight: '700',
          marginBottom: '20px',
          letterSpacing: '0.4px'
        }}>
          <span>Error 404 &bull; Page Not Located</span>
        </div>

        {/* Icon Container */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 0 8px #f8fafc'
        }}>
          <Compass size={34} strokeWidth={2} />
        </div>

        <h1 style={{
          margin: '0 0 10px',
          fontSize: '22px',
          fontWeight: '800',
          color: '#0f172a',
          letterSpacing: '-0.3px'
        }}>
          We couldn't find that page
        </h1>

        <p style={{
          margin: '0 0 28px',
          fontSize: '14px',
          lineHeight: '1.65',
          color: '#64748b'
        }}>
          The view or resource you requested may have moved, been renamed, or does not exist in the Rani Salary system.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
            <Home size={15} />
            Return to Dashboard
          </NavLink>

          <button
            onClick={() => window.history.back()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
