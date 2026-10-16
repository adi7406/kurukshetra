import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--canvas-bg, #080C14)',
            color: 'var(--text-main, #F8FAFC)',
            fontFamily: 'var(--font-sans, sans-serif)',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              borderRadius: '12px',
              backgroundColor: 'var(--surface, #0F172A)',
              border: '1px solid var(--danger-border, rgba(239, 68, 68, 0.35))',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.14)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
              Something went wrong loading this view
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--text-muted, #94A3B8)', lineHeight: '1.5', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected runtime error occurred.'}
            </p>

            {this.state.error?.stack && (
              <pre
                style={{
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  padding: '10px 12px',
                  backgroundColor: 'var(--surface-muted, #162032)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--text-light, #64748B)',
                  marginBottom: '20px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.error.stack}
              </pre>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <Home size={14} />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
