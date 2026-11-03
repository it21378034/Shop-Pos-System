import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { DashboardStats } from '../../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get<DashboardStats>('/reports/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Trend Chart Data
  const trendLabels = stats?.recentSalesTrend?.map((t) => t.label) || [];
  const trendSales = stats?.recentSalesTrend?.map((t) => t.salesAmount) || [];
  const trendProfits = stats?.recentSalesTrend?.map((t) => t.profitAmount) || [];

  const barChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Sales Revenue (Rs.)',
        data: trendSales,
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
      {
        label: 'Gross Profit (Rs.)',
        data: trendProfits,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
    ],
  };

  // Category Doughnut Data
  const catLabels = stats?.categorySalesShare?.map((c) => c.categoryName) || [];
  const catValues = stats?.categorySalesShare?.map((c) => c.totalSales) || [];

  const doughnutData = {
    labels: catLabels,
    datasets: [
      {
        data: catValues,
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'],
      },
    ],
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Title & Quick Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">{t('dashboard.title')}</h3>
          <p className="text-muted small mb-0">Overview of today's grocery store metrics, sales revenue, and inventory alerts.</p>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="btn btn-success fw-bold d-flex align-items-center gap-2 px-3 shadow-sm"
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            <i className="bi bi-upc-scan fs-5"></i>
            <span>Open POS Terminal (F2)</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="row g-3 mb-4">
        {/* Today's Revenue */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="stat-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-muted small fw-semibold text-uppercase">{t('dashboard.todayRevenue')}</span>
              <h3 className="fw-bold text-dark mt-1 mb-0">
                Rs. {(stats?.todayRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <div className="text-success small fw-semibold mt-1">
                <i className="bi bi-receipt me-1"></i>
                {stats?.todayBills || 0} Bills Generated Today
              </div>
            </div>
            <div className="stat-icon bg-success bg-opacity-10 text-success">
              <i className="bi bi-currency-dollar"></i>
            </div>
          </div>
        </div>

        {/* Total Stock Value */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="stat-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-muted small fw-semibold text-uppercase">{t('dashboard.stockValue')}</span>
              <h3 className="fw-bold text-dark mt-1 mb-0">
                Rs. {(stats?.totalStockValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <div className="text-muted small mt-1">Weighted Cost Basis</div>
            </div>
            <div className="stat-icon bg-primary bg-opacity-10 text-primary">
              <i className="bi bi-boxes"></i>
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="stat-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-muted small fw-semibold text-uppercase">{t('dashboard.grossProfit')}</span>
              <h3 className="fw-bold text-dark mt-1 mb-0">
                Rs. {(stats?.todayGrossProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <div className="text-primary small fw-semibold mt-1">
                {stats?.todayRevenue && stats.todayRevenue > 0
                  ? `${Math.round(((stats.todayGrossProfit || 0) / stats.todayRevenue) * 100)}% Margin`
                  : '0% Margin'}
              </div>
            </div>
            <div className="stat-icon bg-info bg-opacity-10 text-info">
              <i className="bi bi-graph-up-arrow"></i>
            </div>
          </div>
        </div>

        {/* Units Sold */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="stat-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-muted small fw-semibold text-uppercase">{t('dashboard.productsSold')}</span>
              <h3 className="fw-bold text-dark mt-1 mb-0">
                {(stats?.todayProductsSold || 0).toLocaleString('en-US')}
              </h3>
              <div className="text-muted small mt-1">Pieces / Kg Transacted</div>
            </div>
            <div className="stat-icon bg-warning bg-opacity-10 text-warning">
              <i className="bi bi-basket3"></i>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="stat-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-muted small fw-semibold text-uppercase">{t('dashboard.lowStockAlerts')}</span>
              <h3 className="fw-bold text-danger mt-1 mb-0">{stats?.lowStockAlertsCount || 0}</h3>
              <button
                onClick={() => navigate('/inventory')}
                className="btn btn-link text-danger p-0 small text-decoration-none fw-semibold mt-1"
              >
                View Reorder List &rarr;
              </button>
            </div>
            <div className="stat-icon bg-danger bg-opacity-10 text-danger">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="row g-3 mb-4">
        {/* Sales & Profit 7-Day Trend */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-bar-chart-fill text-success"></i>
              <span>{t('dashboard.salesTrend')}</span>
            </h5>
            <div style={{ height: '300px' }}>
              <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        {/* Category Share */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-pie-chart-fill text-primary"></i>
              <span>{t('dashboard.categoryShare')}</span>
            </h5>
            <div style={{ height: '300px' }} className="d-flex align-items-center justify-content-center">
              {catValues.length > 0 ? (
                <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <p className="text-muted small">No recent category sales recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Products Leaderboard */}
      <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
        <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
          <i className="bi bi-trophy-fill text-warning"></i>
          <span>{t('dashboard.topProducts')}</span>
        </h5>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Product SKU</th>
                <th>Name (English / සිංහල)</th>
                <th className="text-center">Units Sold</th>
                <th className="text-end">Revenue Generated</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topSellingProducts && stats.topSellingProducts.length > 0 ? (
                stats.topSellingProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td className="fw-semibold text-muted">{p.sku}</td>
                    <td>
                      <div className="fw-bold text-dark">{p.nameEn}</div>
                      <div className="text-muted small">{p.nameSi}</div>
                    </td>
                    <td className="text-center fw-bold">{p.quantitySold}</td>
                    <td className="text-end fw-bold text-success">
                      Rs. {p.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    No sales data recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
