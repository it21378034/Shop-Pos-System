import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/AuthContext';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'si' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="app-header d-flex align-items-center justify-content-between px-3 py-2">
      <div className="d-flex align-items-center gap-3">
        <Link to="/dashboard" className="text-decoration-none d-flex align-items-center gap-2 text-white">
          <div className="bg-success text-white rounded p-1 d-flex align-items-center justify-content-center" style={{ width: '34px', height: '34px' }}>
            <i className="bi bi-cart4 fs-5"></i>
          </div>
          <div>
            <span className="fw-bold fs-5 tracking-tight">{t('app.name')}</span>
            <span className="badge bg-success bg-opacity-25 text-success-emphasis ms-2 small">PRO</span>
          </div>
        </Link>

        {user?.locationName && (
          <span className="badge bg-dark border border-secondary text-light d-none d-md-inline-flex align-items-center gap-1 px-2 py-1">
            <i className="bi bi-geo-alt-fill text-warning"></i>
            {user.locationName}
          </span>
        )}
      </div>

      <div className="d-flex align-items-center gap-2">
        {/* Fast POS Direct Button */}
        <button
          onClick={() => navigate('/pos')}
          className="btn btn-success btn-sm fw-bold px-3 py-1 d-flex align-items-center gap-2 shadow-sm"
          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
        >
          <i className="bi bi-upc-scan fs-6"></i>
          <span className="d-none d-sm-inline">{t('nav.pos')} (F2)</span>
        </button>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="btn btn-outline-light btn-sm d-flex align-items-center gap-1 px-2 py-1"
          title="Switch Language / භාෂාව මාරු කරන්න"
        >
          <i className="bi bi-translate text-info"></i>
          <span className="fw-semibold small">{i18n.language === 'en' ? 'සිංහල' : 'English'}</span>
        </button>

        {/* User Info / Logout */}
        <div className="dropdown ms-2">
          <button
            className="btn btn-sm btn-dark border border-secondary dropdown-toggle d-flex align-items-center gap-2 text-white"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-person-circle text-success"></i>
            <span className="d-none d-md-inline fw-semibold small">{user?.fullName || user?.username}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow">
            <li className="dropdown-header">
              <div className="fw-bold">{user?.fullName}</div>
              <div className="text-muted small">@{user?.username} ({user?.roles?.join(', ')})</div>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <Link to="/settings" className="dropdown-item d-flex align-items-center gap-2">
                <i className="bi bi-gear"></i>
                {t('nav.settings')}
              </Link>
            </li>
            <li>
              <button onClick={logout} className="dropdown-item text-danger d-flex align-items-center gap-2">
                <i className="bi bi-box-arrow-right"></i>
                {t('nav.logout')}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};
