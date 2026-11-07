import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Tự động hồi phục khi chuyển route khác
    if (this.state.hasError && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="stage"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--ink, #fff)',
            minHeight: '100vh',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'rgba(30, 20, 16, 0.95)',
              border: '1px solid var(--gold, #D4AF37)',
              borderRadius: '16px',
              padding: '32px 40px',
              maxWidth: '520px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✦</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#FFE3A8' }}>
              Đã xảy ra sự cố khi tải trang
            </h3>
            <p style={{ fontSize: '14px', color: '#E0D0C0', marginBottom: '24px', lineHeight: 1.6 }}>
              Không thể tải nội dung trang này. Bạn có thể nhấn nút bên dưới để quay lại Sảnh chính của bảo tàng.
            </p>
            {this.state.error && (
              <details
                style={{
                  marginBottom: '20px',
                  textAlign: 'left',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#FFB4A2',
                  cursor: 'pointer',
                }}
              >
                <summary style={{ outline: 'none', userSelect: 'none' }}>Chi tiết sự cố kỹ thuật</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                  {String(this.state.error?.message || this.state.error)}
                </pre>
              </details>
            )}
            <button
              type="button"
              className="btn main"
              onClick={this.handleReset}
              style={{ padding: '10px 28px', fontSize: '15px' }}
            >
              Quay về Sảnh chính
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

