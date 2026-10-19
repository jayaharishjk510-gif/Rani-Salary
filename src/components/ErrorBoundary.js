import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    window.location.href = '/';
  };

  handleResetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'An unexpected error occurred');

      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            padding: '40px 32px',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            {/* Warning Icon Badge */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 0 8px #fff1f2'
            }}>
              <AlertTriangle size={34} strokeWidth={2.2} />
            </div>

            <h1 style={{
              margin: '0 0 10px',
              fontSize: '22px',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.3px'
            }}>
              Something went wrong
            </h1>

            <p style={{
              margin: '0 0 24px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#64748b'
            }}>
              An unexpected issue prevented this view from loading properly. You can try refreshing the page or clearing the cached session.
            </p>

            {/* Main Action Buttons */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.15)'
                }}
              >
                <RefreshCw size={16} />
                Reload Page
              </button>

              <button
                onClick={this.handleResetError}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <RotateCcw size={16} />
                Try Again
              </button>

              <button
                onClick={this.handleHardReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Clear Cache & Restart
              </button>
            </div>

            {/* Collapsible Error Diagnostics */}
            <div style={{
              textAlign: 'left',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '16px'
            }}>
              <button
                onClick={this.toggleDetails}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '8px 4px',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <span>Technical Error Details</span>
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDetails && (
                <div style={{
                  marginTop: '10px',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '220px',
                  lineHeight: '1.5'
                }}>
                  <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '8px' }}>
                    {errorMessage}
                  </div>
                  {errorInfo?.componentStack && (
                    <div style={{ color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
                      {errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
