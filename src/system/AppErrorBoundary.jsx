import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Beklenmeyen bir hata oluştu.' };
  }

  componentDidCatch(error, info) {
    console.error('Uygulama hata yakalayıcı:', error, info);
    Promise.resolve(this.props.onError?.(error, info)).catch(() => undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ maxWidth: '520px', width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', boxShadow: '0 20px 45px -28px rgba(15,23,42,0.25)' }}>
            <div style={{ fontSize: '38px', marginBottom: '10px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Uygulama geçici olarak durdu</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '14px' }}>Hata güvenli sistem kaydına gönderildi. Sayfayı yenileyerek tekrar deneyin.</p>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', color: '#334155', fontSize: '14px', marginBottom: '14px', wordBreak: 'break-word' }}>
              {this.state.errorMessage}
            </div>
            <button type="button" onClick={() => window.location.reload()} style={{ border: 'none', backgroundColor: '#ff6b35', color: '#fff', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Sayfayı Yenile</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
