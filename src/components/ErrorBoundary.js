import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp, Send, Database, Home, Copy, Check } from 'lucide-react';
import { notifyErrorReport } from '../services/telegramService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      reporting: false,
      reported: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleNavigateHome = () => {
    window.location.href = '/';
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
    this.setState({ hasError: false, error: null, errorInfo: null, reporting: false, reported: false, copied: false });
  };

  handleCopyDiagnostics = () => {
    const { error, errorInfo } = this.state;
    const text = [
      `Error: ${error?.message || error}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `Stack: ${error?.stack || ''}`,
      `Component Stack: ${errorInfo?.componentStack || ''}`
    ].join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {});
  };

  handleReportToDev = async () => {
    if (this.state.reporting || this.state.reported) return;
    this.setState({ reporting: true });
    try {
      await notifyErrorReport({
        error: this.state.error,
        errorInfo: this.state.errorInfo
      });
      this.setState({ reported: true, reporting: false });
    } catch (e) {
      console.error('Error reporting to dev:', e);
      this.setState({ reporting: false });
    }
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, copied } = this.state;
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'An unexpected application state occurred');

      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          background: 'radial-gradient(circle at 50% 20%, #ffffff 0%, #f1f5f9 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.08), 0 10px 15px -6px rgba(0, 0, 0, 0.04)',
            padding: '44px 36px',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>

            {/* Status Pills */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '4px 12px',
                borderRadius: '50px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                <Database size={13} color="#16a34a" />
                <span>Cloud Data Safe & Intact</span>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '4px 12px',
                borderRadius: '50px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                <AlertTriangle size={13} color="#dc2626" />
                <span>Temporary Glitch</span>
              </div>
            </div>

            {/* Headline */}
            <h1 style={{
              margin: '0 0 10px',
              fontSize: '26px',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.4px'
            }}>
              We'll be back soon
            </h1>

            {/* Description & Reassurance */}
            <p style={{
              margin: '0 0 24px',
              fontSize: '14px',
              lineHeight: '1.65',
              color: '#64748b'
            }}>
              A temporary interruption occurred while loading this view. Don't worry, all employee records, advances, and payroll history remain safely saved.
            </p>

            {/* Primary Action Buttons */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
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
                  padding: '12px 22px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.15)'
                }}
              >
                <RefreshCw size={15} />
                Refresh Page
              </button>

              <button
                onClick={this.handleNavigateHome}
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
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                Return to Dashboard
              </button>

              <button
                onClick={this.handleResetError}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={15} />
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
                  cursor: 'pointer'
                }}
              >
                Clean Session & Restart
              </button>
            </div>

            {/* Developer Telegram Reporting */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={this.handleReportToDev}
                disabled={this.state.reporting || this.state.reported}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: this.state.reported ? '#f0fdf4' : '#2563eb',
                  color: this.state.reported ? '#16a34a' : '#ffffff',
                  border: this.state.reported ? '1px solid #bbf7d0' : 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: (this.state.reporting || this.state.reported) ? 'default' : 'pointer',
                  boxShadow: this.state.reported ? 'none' : '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                <Send size={14} />
                {this.state.reported ? 'Diagnostic Report Sent to Dev' : this.state.reporting ? 'Sending Report…' : 'Report Issue to Developer'}
              </button>
            </div>

            {/* Collapsible Diagnostics */}
            <div style={{
              textAlign: 'left',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={this.toggleDetails}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    padding: '6px 0',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <span>Technical Diagnostics</span>
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showDetails && (
                  <button
                    onClick={this.handleCopyDiagnostics}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: copied ? '#16a34a' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

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
                  maxHeight: '200px',
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
