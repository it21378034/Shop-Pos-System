import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      navigate('/pos');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to authenticate. Please check username and password.');
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Language Selector Top Right */}
      <div className="position-absolute top-0 end-0 p-4">
        <div className="btn-group shadow-sm">
          <button
            type="button"
            className={`btn btn-sm ${i18n.language === 'en' ? 'btn-success' : 'btn-outline-light'}`}
            onClick={() => changeLanguage('en')}
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            className={`btn btn-sm ${i18n.language === 'si' ? 'btn-success' : 'btn-outline-light'}`}
            onClick={() => changeLanguage('si')}
          >
            🇱🇰 සිංහල
          </button>
        </div>
      </div>

      <div className="card shadow-lg border-0 rounded-4" style={{ width: '420px', maxWidth: '92vw' }}>
        <div className="card-body p-4 p-sm-5">
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-circle mb-3" style={{ width: '64px', height: '64px' }}>
              <i className="bi bi-cart4 fs-1"></i>
            </div>
            <h3 className="fw-bold mb-1 text-dark">{t('app.name')}</h3>
            <p className="text-muted small">{t('app.subtitle')}</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-4" role="alert">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">Username / අයකැමි නම</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-person text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or cashier1"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-muted">Password / මුරපදය</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-key text-muted"></i>
                </span>
                <input
                  type="password"
                  className="form-control border-start-0 ps-0"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right"></i>
                  <span>Sign In / පිවිසෙන්න</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Help */}
          <div className="mt-4 pt-3 border-top text-center text-muted small">
            <span className="fw-semibold">Default Credentials:</span>
            <div className="mt-1 d-flex justify-content-center gap-3">
              <span className="badge bg-light text-dark border">admin / Admin@123</span>
              <span className="badge bg-light text-dark border">cashier1 / Cashier@123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
