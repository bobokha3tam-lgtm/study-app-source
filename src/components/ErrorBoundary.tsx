import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Without an error boundary, ANY uncaught error thrown while rendering (or in
// a useEffect) causes React to unmount the entire tree, leaving a blank white
// page with no way to recover except a hard refresh — and if the same error
// fires again on load (e.g. a localStorage quota error on every render), the
// user gets stuck in a permanent white screen. This boundary catches that,
// shows a clear message, and offers a safe recovery path.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled application error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    (this as React.Component<ErrorBoundaryProps, ErrorBoundaryState>).setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isQuotaError = /quota/i.test(this.state.error?.message || '') ||
        this.state.error?.name === 'QuotaExceededError';

      return (
        <div dir="rtl" style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0f172a',
          color: '#f1f5f9',
          fontFamily: 'inherit',
        }}>
          <div style={{ maxWidth: '480px', textAlign: 'center' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 16px', color: '#f59e0b' }} />
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
              مشکلی در نمایش برنامه پیش آمد
            </h1>
            <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '20px', lineHeight: 1.8 }}>
              {isQuotaError
                ? 'حافظه ذخیره‌سازی مرورگر شما برای این سایت پر شده است. برای رفع مشکل، می‌توانید داده‌های محلی قدیمی را پاک کنید.'
                : 'یک خطای غیرمنتظره رخ داد. می‌توانید صفحه را دوباره بارگذاری کنید.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} /> بارگذاری مجدد صفحه
              </button>
              {isQuotaError && (
                <button
                  onClick={() => {
                    try {
                      // Only remove this app's own keys — never wipe unrelated site data.
                      Object.keys(localStorage)
                        .filter((k) => k.startsWith('study_advisor_'))
                        .forEach((k) => localStorage.removeItem(k));
                    } catch (e) {
                      // ignore
                    }
                    this.handleReload();
                  }}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1px solid #475569',
                    background: 'transparent', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  پاک‌کردن داده‌های محلی و شروع مجدد
                </button>
              )}
            </div>
            {this.state.error?.message && (
              <p style={{ marginTop: '20px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
