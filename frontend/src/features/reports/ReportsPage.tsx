import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  const [productSales, setProductSales] = useState<any[]>([]);
  const [cashierPerformance, setCashierPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [psRes, cpRes] = await Promise.all([
        api.get('/reports/product-sales'),
        api.get('/reports/cashier-performance'),
      ]);
      setProductSales(psRes.data);
      setCashierPerformance(cpRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportProductSalesCsv = async () => {
    try {
      const res = await api.get('/reports/export/product-sales-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `product_sales_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed.');
    }
  };

  const handleExportInventoryCsv = async () => {
    try {
      const res = await api.get('/reports/export/inventory-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_valuation_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed.');
    }
  };

  const totalSalesRevenue = productSales.reduce((acc, p) => acc + p.totalRevenue, 0);
  const totalGrossProfit = productSales.reduce((acc, p) => acc + p.grossProfit, 0);

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">{t('reports.title')}</h3>
          <p className="text-muted small mb-0">Detailed profitability analysis, product-level sales, and cashier shift performance.</p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-dark d-flex align-items-center gap-2"
            onClick={handleExportProductSalesCsv}
          >
            <i className="bi bi-file-earmark-spreadsheet"></i>
            <span>Export Sales CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={handleExportInventoryCsv}
          >
            <i className="bi bi-file-earmark-arrow-down"></i>
            <span>Export Stock CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary d-flex align-items-center gap-2"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer"></i>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary Highlights */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">Recorded Revenue</span>
            <h3 className="fw-bold text-dark mt-1 mb-0">
              Rs. {totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">Total Gross Profit</span>
            <h3 className="fw-bold text-success mt-1 mb-0">
              Rs. {totalGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">Overall Profit Margin</span>
            <h3 className="fw-bold text-primary mt-1 mb-0">
              {totalSalesRevenue > 0 ? `${((totalGrossProfit / totalSalesRevenue) * 100).toFixed(1)}%` : '0%'}
            </h3>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">Active Cashiers</span>
            <h3 className="fw-bold text-dark mt-1 mb-0">{cashierPerformance.length}</h3>
          </div>
        </div>
      </div>

      {/* Product-wise Sales Report */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white overflow-hidden">
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <i className="bi bi-bar-chart-line-fill text-success"></i>
            <span>Product-wise Sales & Profitability</span>
          </h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Product SKU</th>
                <th>Name (English / Sinhala)</th>
                <th>Category</th>
                <th className="text-center">Units Sold</th>
                <th className="text-end">Revenue</th>
                <th className="text-end">Cost</th>
                <th className="text-end">Gross Profit</th>
                <th className="text-end">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : productSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    No product sales recorded in the selected period.
                  </td>
                </tr>
              ) : (
                productSales.map((p, idx) => (
                  <tr key={idx}>
                    <td className="fw-semibold text-muted">{p.sku}</td>
                    <td>
                      <div className="fw-bold text-dark">{p.nameEn}</div>
                      <div className="text-muted small">{p.nameSi}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-muted border">{p.categoryName}</span>
                    </td>
                    <td className="text-center fw-bold">{p.quantitySold}</td>
                    <td className="text-end fw-bold text-success">
                      Rs. {p.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-end text-muted">Rs. {p.totalCost.toFixed(2)}</td>
                    <td className="text-end fw-bold text-primary">Rs. {p.grossProfit.toFixed(2)}</td>
                    <td className="text-end fw-bold text-dark">{p.marginPercentage.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cashier Performance Report */}
      <div className="card border-0 shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="p-3 border-bottom">
          <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <i className="bi bi-people-fill text-primary"></i>
            <span>Cashier Performance & Tender Breakdown</span>
          </h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Cashier Name</th>
                <th className="text-center">Total Bills</th>
                <th className="text-end">Total Sales</th>
                <th className="text-end">Cash Collected</th>
                <th className="text-end">Card Collected</th>
                <th className="text-end">Other (QR/Credit)</th>
              </tr>
            </thead>
            <tbody>
              {cashierPerformance.map((c) => (
                <tr key={c.cashierId}>
                  <td className="fw-bold">{c.cashierName}</td>
                  <td className="text-center fw-bold">{c.totalBills}</td>
                  <td className="text-end fw-bold text-success">
                    Rs. {c.totalSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-end">Rs. {c.cashCollected.toFixed(2)}</td>
                  <td className="text-end">Rs. {c.cardCollected.toFixed(2)}</td>
                  <td className="text-end">Rs. {c.otherCollected.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
