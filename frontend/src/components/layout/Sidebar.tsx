import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/AuthContext';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const links = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: 'bi-speedometer2', role: 'Manager' },
    { to: '/pos', label: t('nav.pos'), icon: 'bi-upc-scan', role: 'Cashier' },
    { to: '/bills', label: t('nav.bills'), icon: 'bi-receipt-cutoff', role: 'Cashier' },
    { to: '/products', label: t('nav.products'), icon: 'bi-box-seam', role: 'Cashier' },
    { to: '/barcodes', label: t('nav.barcodes'), icon: 'bi-upc', role: 'Cashier' },
    { to: '/inventory', label: t('nav.inventory'), icon: 'bi-boxes', role: 'Manager' },
    { to: '/purchases', label: t('nav.purchases'), icon: 'bi-truck', role: 'Manager' },
    { to: '/suppliers', label: t('nav.suppliers'), icon: 'bi-building', role: 'Manager' },
    { to: '/cash-sessions', label: t('nav.cashSessions'), icon: 'bi-cash-coin', role: 'Cashier' },
    { to: '/reports', label: t('nav.reports'), icon: 'bi-graph-up', role: 'Manager' },
    { to: '/settings', label: t('nav.settings'), icon: 'bi-sliders', role: 'Admin' },
  ];

  return (
    <aside className="app-sidebar py-3 d-none d-lg-block">
      <div className="px-3 mb-2 text-uppercase fw-bold text-muted small" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
        Store Navigation
      </div>
      <nav className="d-flex flex-column gap-1">
        {links.map((link) => {
          if (link.role && !hasRole(link.role)) return null;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <i className={`bi ${link.icon}`}></i>
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
